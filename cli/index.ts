#!/usr/bin/env node

import { Command } from 'commander';
import * as chalk from 'chalk';
import Table from 'cli-table3';
import * as dotenv from 'dotenv';
import { Handelsregister, Company, Person } from '../dist';
import { Feature, DocumentType, PersonFeature } from '../dist/types';
import { detectFileType } from '../dist/utils/fileHandler';
import { version } from '../dist/version';

// Load environment variables
dotenv.config();

const program = new Command();

program
  .name('handelsregister')
  .description('CLI for accessing German company registry (Handelsregister) data')
  .version(version)
  .option('-k, --api-key <key>', 'API key (defaults to HANDELSREGISTER_API_KEY env var)')
  .option('-b, --bearer-token <token>', 'Bearer token (defaults to HANDELSREGISTER_BEARER_TOKEN env var)')
  .option('--no-color', 'Disable colored output');

function buildClient(): Handelsregister {
  const apiKey = program.opts().apiKey || process.env.HANDELSREGISTER_API_KEY;
  const bearerToken =
    program.opts().bearerToken || process.env.HANDELSREGISTER_BEARER_TOKEN;

  if (!apiKey && !bearerToken) {
    console.error(
      chalk.red(
        'Error: API key or bearer token is required. Set HANDELSREGISTER_API_KEY / HANDELSREGISTER_BEARER_TOKEN or use --api-key / --bearer-token',
      ),
    );
    process.exit(1);
  }

  return new Handelsregister({ apiKey, bearerToken });
}

// ----- fetch -----

program
  .command('fetch <query>')
  .description('Fetch company information')
  .option('-f, --feature <features...>', 'Features to include', [])
  .option('--json', 'Output as JSON')
  .option('--no-ai-search', 'Disable AI search')
  .option('--realtime', 'Enable live Handelsregister lookup (+10 credits)')
  .action(async (query: string, options: any) => {
    try {
      const client = buildClient();
      const features = options.feature as Feature[];

      const data = await client.fetchOrganization({
        q: query,
        features,
        aiSearch: options.aiSearch === false ? 'off' : true,
        realtimeMode: options.realtime ? true : false,
      });

      if (options.json) {
        console.log(JSON.stringify(data, null, 2));
      } else {
        displayCompanyData(data);
      }
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// ----- search -----

program
  .command('search [query]')
  .description('Search organizations with optional filters and pagination')
  .option(
    '--filters <json>',
    'JSON object containing any documented organization search filters',
  )
  .option('--postal-code <code>', 'Filter by postal code')
  .option('--limit <n>', 'Results per page (1..30)', '10')
  .option('--skip <n>', 'Pagination offset', '0')
  .option('--ai-mode', 'Enable AI-assisted search (5 credits)')
  .option('--sort <field>', 'Sort field (for example revenue or registration_date)')
  .option('--order <direction>', 'Sort direction (asc or desc)')
  .option(
    '--match-context',
    'Include ownership, executive, and lifecycle values that matched',
  )
  .option('--json', 'Output as JSON')
  .action(async (query: string | undefined, options: any) => {
    try {
      const client = buildClient();
      let filters: Record<string, unknown> = {};
      if (options.filters) {
        const parsed = JSON.parse(options.filters);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('--filters must be a JSON object');
        }
        filters = parsed;
      }
      if (options.postalCode) filters.postal_code = options.postalCode;

      const result = await client.searchOrganizations({
        q: query,
        skip: parseInt(options.skip, 10),
        limit: parseInt(options.limit, 10),
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        aiMode: options.aiMode ? true : undefined,
        sort: options.sort,
        order: options.order,
        matchContext: options.matchContext ? true : undefined,
      });

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      console.log(chalk.bold.blue(`\nFound ${result.total} matching companies (showing ${result.results.length}):\n`));
      const table = new Table({
        head: ['Name', 'Court', 'Register #', 'City'],
        style: { head: ['blue'] },
      });
      result.results.forEach((r) => {
        table.push([
          r.name || '-',
          r.registration?.court || '-',
          r.registration?.register_number || '-',
          r.address?.city || '-',
        ]);
      });
      console.log(table.toString());
      if (result.meta?.credits_remaining !== undefined) {
        console.log(chalk.gray(`Credits remaining: ${result.meta.credits_remaining}`));
      }
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// ----- person -----

program
  .command('person')
  .description('Fetch a person profile')
  .requiredOption('-p, --person <name>', 'Full name of the person')
  .requiredOption('-o, --organization <name>', 'Company context for disambiguation')
  .option('-f, --feature <features...>', 'Features to include (e.g., shareholdings)', [])
  .option('--json', 'Output as JSON')
  .action(async (options: any) => {
    try {
      const client = buildClient();
      const person = new Person(options.person, options.organization, client, {
        features: options.feature as PersonFeature[],
      });
      const data = await person.getRawData();

      if (options.json) {
        console.log(JSON.stringify(data, null, 2));
        return;
      }

      console.log(chalk.bold.blue(`\n=== ${data.name || options.person} ===\n`));
      const info = new Table();
      info.push(
        ['Entity ID', data.entity_id || '-'],
        ['Born', data.birth_date || '-'],
        ['Home', data.location?.home?.city || '-'],
      );
      console.log(info.toString());

      if (data.bio) {
        console.log(chalk.bold.blue('\n=== Bio ==='));
        console.log(data.bio);
      }

      if (person.handelsregisterRoles.length > 0) {
        console.log(chalk.bold.blue('\n=== Handelsregister Roles ==='));
        const rolesTable = new Table({
          head: ['Role', 'Organization', 'Current'],
          style: { head: ['blue'] },
        });
        person.handelsregisterRoles.forEach((r: any) => {
          rolesTable.push([
            r.label || '-',
            r.name || r.organization || '-',
            r.is_current === true || (r.is_current === undefined && !r.end_date)
              ? 'Yes'
              : 'No',
          ]);
        });
        console.log(rolesTable.toString());
      }

      if (data.meta?.credits_remaining !== undefined) {
        console.log(chalk.gray(`\nCredits remaining: ${data.meta.credits_remaining}`));
      }
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// ----- document -----

program
  .command('document <query>')
  .description('Download company documents')
  .requiredOption(
    '-t, --type <type>',
    'Document type (shareholders_list, articles_of_association, AD, CD, SI)',
  )
  .option('-o, --output <file>', 'Output file path')
  .action(async (query: string, options: any) => {
    try {
      const client = buildClient();
      const company = new Company(query, client);
      const entityId = await company.getId();

      const extension = options.type === 'SI' ? 'xml' : 'pdf';
      const outputFile =
        options.output || `${entityId}_${options.type}.${extension}`;

      console.log(chalk.blue(`Fetching document for: ${await company.getName()}`));
      console.log(chalk.gray(`Document type: ${options.type}`));

      await company.fetchDocument(options.type as DocumentType, outputFile);

      console.log(chalk.green(`✓ Document saved to: ${outputFile}`));
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// ----- token management -----

program
  .command('token-create <name>')
  .description('Create a new bearer token')
  .option('-a, --abilities <list>', 'Comma-separated abilities (e.g., "*")')
  .option('--expires-at <ts>', 'Expiry timestamp "YYYY-MM-DD HH:MM:SS"')
  .action(async (name: string, options: any) => {
    try {
      const client = buildClient();
      const abilities = options.abilities
        ? options.abilities.split(',').map((s: string) => s.trim()).filter(Boolean)
        : undefined;
      const result = await client.createToken({
        tokenName: name,
        abilities,
        expiresAt: options.expiresAt,
      });
      console.log(chalk.green('✓ Token created'));
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('token-list')
  .description('List all bearer tokens')
  .option('--json', 'Output as JSON')
  .action(async (options: any) => {
    try {
      const client = buildClient();
      const result = await client.listTokens();

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      const tokens = (result.tokens || []) as any[];
      if (tokens.length === 0) {
        console.log(chalk.gray('No tokens.'));
        return;
      }
      const table = new Table({
        head: ['ID', 'Name', 'Expires At', 'Created At'],
        style: { head: ['blue'] },
      });
      tokens.forEach((t) => {
        table.push([
          String(t.id ?? '-'),
          t.name || '-',
          t.expires_at || '-',
          t.created_at || '-',
        ]);
      });
      console.log(table.toString());
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('token-revoke <id>')
  .description('Revoke a specific bearer token by ID')
  .action(async (id: string) => {
    try {
      const client = buildClient();
      await client.revokeToken(id);
      console.log(chalk.green(`✓ Token ${id} revoked`));
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('token-revoke-all')
  .description('Revoke ALL bearer tokens for the authenticated account')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(async (options: any) => {
    try {
      if (!options.yes) {
        console.error(
          chalk.yellow(
            'Refusing to revoke all tokens without --yes. Pass --yes to confirm.',
          ),
        );
        process.exit(1);
      }
      const client = buildClient();
      await client.revokeAllTokens();
      console.log(chalk.green('✓ All tokens revoked'));
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// ----- monitoring -----

const monitorsCommand = program
  .command('monitors')
  .description('Manage organization monitors');

monitorsCommand
  .command('pricing')
  .description('Show monitoring pricing and topic entitlements')
  .option('--interval <days>', 'Poll interval for the estimate (1..30)')
  .action(async (options: any) => {
    try {
      const interval = options.interval
        ? parseInt(options.interval, 10)
        : undefined;
      console.log(
        JSON.stringify(await buildClient().getMonitoringPricing(interval), null, 2),
      );
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

monitorsCommand
  .command('list')
  .description('List non-archived monitors')
  .action(async () => {
    try {
      console.log(JSON.stringify(await buildClient().listMonitors(), null, 2));
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

monitorsCommand
  .command('show <id>')
  .description('Show one monitor and its recent runs')
  .action(async (id: string) => {
    try {
      console.log(JSON.stringify(await buildClient().getMonitor(id), null, 2));
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

monitorsCommand
  .command('create')
  .description('Create a monitor and queue its baseline')
  .requiredOption('--entity-id <id>', 'Organization entity ID')
  .requiredOption('--interval <days>', 'Poll interval (1..30)')
  .requiredOption('--endpoint <ids...>', 'One or more webhook endpoint IDs')
  .option('--label <label>', 'Optional monitor label')
  .option('--idempotency-key <key>', 'Durable idempotency key')
  .action(async (options: any) => {
    try {
      const result = await buildClient().createMonitor({
        entityId: options.entityId,
        pollIntervalDays: parseInt(options.interval, 10),
        endpointIds: options.endpoint,
        label: options.label,
        idempotencyKey: options.idempotencyKey,
      });
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

monitorsCommand
  .command('update <id>')
  .description('Change a monitor poll interval')
  .requiredOption('--interval <days>', 'Poll interval (1..30)')
  .option('--idempotency-key <key>', 'Durable idempotency key')
  .action(async (id: string, options: any) => {
    try {
      const result = await buildClient().updateMonitor(
        id,
        parseInt(options.interval, 10),
        options.idempotencyKey,
      );
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

for (const action of ['pause', 'resume', 'archive'] as const) {
  monitorsCommand
    .command(`${action} <id>`)
    .description(`${action[0].toUpperCase()}${action.slice(1)} a monitor`)
    .option('--idempotency-key <key>', 'Durable idempotency key')
    .action(async (id: string, options: any) => {
      try {
        const client = buildClient();
        const result =
          action === 'pause'
            ? await client.pauseMonitor(id, options.idempotencyKey)
            : action === 'resume'
              ? await client.resumeMonitor(id, options.idempotencyKey)
              : await client.archiveMonitor(id, options.idempotencyKey);
        console.log(JSON.stringify(result, null, 2));
      } catch (error: any) {
        console.error(chalk.red(`Error: ${error.message}`));
        process.exit(1);
      }
    });
}

// ----- webhooks -----

const webhooksCommand = program
  .command('webhooks')
  .description('Manage monitoring webhook endpoints and deliveries');

webhooksCommand
  .command('list')
  .description('List non-archived webhook endpoints')
  .action(async () => {
    try {
      console.log(
        JSON.stringify(await buildClient().listWebhookEndpoints(), null, 2),
      );
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

webhooksCommand
  .command('create')
  .description('Register a webhook endpoint')
  .requiredOption('--name <name>', 'Display name')
  .requiredOption('--url <url>', 'Public HTTPS receiver URL')
  .option('--headers <json>', 'Optional JSON object of write-only headers')
  .option('--idempotency-key <key>', 'Durable idempotency key')
  .action(async (options: any) => {
    try {
      const headers = options.headers ? JSON.parse(options.headers) : undefined;
      const result = await buildClient().createWebhookEndpoint({
        name: options.name,
        url: options.url,
        headers,
        idempotencyKey: options.idempotencyKey,
      });
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

const webhookActions = [
  'verify',
  'test',
  'enable',
  'disable',
  'rotate-secret',
  'archive',
] as const;

for (const action of webhookActions) {
  webhooksCommand
    .command(`${action} <id>`)
    .description(`${action} a webhook endpoint`)
    .option('--idempotency-key <key>', 'Durable idempotency key')
    .action(async (id: string, options: any) => {
      try {
        const client = buildClient();
        let result: unknown;
        if (action === 'verify') {
          result = await client.verifyWebhookEndpoint(id, options.idempotencyKey);
        } else if (action === 'test') {
          result = await client.testWebhookEndpoint(id, options.idempotencyKey);
        } else if (action === 'enable') {
          result = await client.enableWebhookEndpoint(id, options.idempotencyKey);
        } else if (action === 'disable') {
          result = await client.disableWebhookEndpoint(id, options.idempotencyKey);
        } else if (action === 'rotate-secret') {
          result = await client.rotateWebhookEndpointSecret(
            id,
            options.idempotencyKey,
          );
        } else {
          result = await client.archiveWebhookEndpoint(id, options.idempotencyKey);
        }
        console.log(JSON.stringify(result, null, 2));
      } catch (error: any) {
        console.error(chalk.red(`Error: ${error.message}`));
        process.exit(1);
      }
    });
}

webhooksCommand
  .command('deliveries')
  .description('List recent webhook deliveries')
  .option('--endpoint <id>', 'Filter by webhook endpoint')
  .action(async (options: any) => {
    try {
      console.log(
        JSON.stringify(
          await buildClient().listWebhookDeliveries(options.endpoint),
          null,
          2,
        ),
      );
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

webhooksCommand
  .command('retry <id>')
  .description('Retry an eligible failed delivery')
  .option('--idempotency-key <key>', 'Durable idempotency key')
  .action(async (id: string, options: any) => {
    try {
      console.log(
        JSON.stringify(
          await buildClient().retryWebhookDelivery(id, options.idempotencyKey),
          null,
          2,
        ),
      );
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

webhooksCommand
  .command('events')
  .description('List recent webhook events')
  .action(async () => {
    try {
      console.log(JSON.stringify(await buildClient().listWebhookEvents(), null, 2));
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// ----- enrich (existing) -----

program
  .command('enrich <file>')
  .description('Enrich data file with company information')
  .option('-i, --input <type>', 'Input file type (json, csv, xlsx) - auto-detected if not specified')
  .option(
    '-q, --query-properties <mappings...>',
    'Property mappings in format prop1=column1 prop2=column2',
  )
  .option('-f, --feature <features...>', 'Features to include', [])
  .option('-s, --snapshot-dir <dir>', 'Directory for snapshot files')
  .option('--snapshot-interval <n>', 'Save snapshot every N items', '10')
  .action(async (file: string, options: any) => {
    try {
      if (!options.queryProperties || options.queryProperties.length === 0) {
        console.error(chalk.red('Error: --query-properties is required'));
        process.exit(1);
      }

      // Parse query properties
      const queryProperties: Record<string, string> = {};
      for (const mapping of options.queryProperties) {
        const [key, value] = mapping.split('=');
        if (key && value) {
          queryProperties[key] = value;
        }
      }

      const client = buildClient();
      const inputType = options.input || detectFileType(file);
      const features = options.feature as Feature[];

      console.log(chalk.blue('Starting enrichment process...'));
      console.log(chalk.gray(`Input file: ${file}`));
      console.log(chalk.gray(`File type: ${inputType}`));
      console.log(chalk.gray(`Query mappings: ${JSON.stringify(queryProperties)}`));

      const result = await client.enrich({
        filePath: file,
        inputType,
        queryProperties,
        snapshotDir: options.snapshotDir,
        snapshotInterval: parseInt(options.snapshotInterval, 10),
        params: features.length > 0 ? { q: '', features } : {},
      });

      console.log(chalk.green('\n✓ Enrichment completed!'));
      console.log(chalk.gray(`Processed: ${result.processedCount} items`));
      console.log(chalk.gray(`Errors: ${result.errorCount} items`));
      console.log(chalk.gray(`Output: ${result.outputPath}`));

      if (result.errors && result.errors.length > 0) {
        console.log(chalk.yellow('\nErrors:'));
        const errorTable = new Table({
          head: ['Row', 'Error'],
          style: { head: ['yellow'] },
        });

        result.errors.slice(0, 10).forEach((err) => {
          errorTable.push([err.row, err.error]);
        });

        console.log(errorTable.toString());

        if (result.errors.length > 10) {
          console.log(chalk.gray(`... and ${result.errors.length - 10} more errors`));
        }
      }
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// ----- helpers -----

function displayCompanyData(data: any): void {
  console.log(chalk.bold.blue('\n=== Company Information ===\n'));

  // Basic info
  const basicTable = new Table();
  basicTable.push(
    ['Name', data.name || '-'],
    ['Entity ID', data.entity_id || '-'],
    ['Status', data.status || '-'],
    ['Legal Form', data.legal_form || '-'],
    ['Court', data.court || data.registration?.court || '-'],
    ['Register Number', data.register_number || data.registration?.register_number || '-'],
  );
  console.log(basicTable.toString());

  // Address
  if (data.address) {
    console.log(chalk.bold.blue('\n=== Address ==='));
    const addressTable = new Table();
    addressTable.push(
      ['Street', data.address.street || '-'],
      ['Postal Code', data.address.postal_code || '-'],
      ['City', data.address.city || '-'],
      ['Country', data.address.country_code || data.address.country || '-'],
    );
    console.log(addressTable.toString());
  }

  // Contact
  if (data.website || data.phone_number || data.email) {
    console.log(chalk.bold.blue('\n=== Contact ==='));
    const contactTable = new Table();
    if (data.website) contactTable.push(['Website', data.website]);
    if (data.phone_number) contactTable.push(['Phone', data.phone_number]);
    if (data.email) contactTable.push(['Email', data.email]);
    console.log(contactTable.toString());
  }

  // Related persons
  if (data.related_persons?.current?.length > 0) {
    console.log(chalk.bold.blue('\n=== Current Management ==='));
    const personsTable = new Table({
      head: ['Name', 'Role'],
      style: { head: ['blue'] },
    });

    data.related_persons.current.forEach((person: any) => {
      const role =
        typeof person.role === 'string' ? person.role : person.role?.designation || '-';
      personsTable.push([person.name, role]);
    });
    console.log(personsTable.toString());
  }

  // Financial KPIs
  if (data.financial_kpi?.length > 0) {
    console.log(chalk.bold.blue('\n=== Financial KPIs ==='));
    const kpiTable = new Table({
      head: ['Year', 'Revenue', 'Profit', 'Employees'],
      style: { head: ['blue'] },
    });

    data.financial_kpi.slice(-3).forEach((kpi: any) => {
      kpiTable.push([
        kpi.year,
        kpi.revenue ? `€${kpi.revenue.toLocaleString()}` : '-',
        kpi.profit ? `€${kpi.profit.toLocaleString()}` : '-',
        kpi.employees || '-',
      ]);
    });
    console.log(kpiTable.toString());
  }

  // Meta info
  if (data.meta) {
    console.log(chalk.bold.blue('\n=== API Usage ==='));
    const metaTable = new Table();
    if (data.meta.request_credit_cost !== undefined) {
      metaTable.push(['Credits Used', data.meta.request_credit_cost]);
    }
    if (data.meta.credits_remaining !== undefined) {
      metaTable.push(['Credits Remaining', data.meta.credits_remaining]);
    }
    console.log(metaTable.toString());
  }
}

// Parse and execute
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
