#!/usr/bin/env node

import { Command } from 'commander';
import * as chalk from 'chalk';
import * as Table from 'cli-table3';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { Handelsregister, Company } from '../src';
import { Feature, DocumentType } from '../src/types';
import { detectFileType } from '../src/utils/fileHandler';

// Load environment variables
dotenv.config();

const program = new Command();

program
  .name('handelsregister')
  .description('CLI for accessing German company registry (Handelsregister) data')
  .version('0.1.0')
  .option('-k, --api-key <key>', 'API key (defaults to HANDELSREGISTER_API_KEY env var)')
  .option('--no-color', 'Disable colored output');

// Fetch command
program
  .command('fetch <query>')
  .description('Fetch company information')
  .option('-f, --feature <features...>', 'Features to include', [])
  .option('--json', 'Output as JSON')
  .option('--no-ai-search', 'Disable AI search')
  .action(async (query: string, options: any) => {
    try {
      const apiKey = program.opts().apiKey || process.env.HANDELSREGISTER_API_KEY;
      
      if (!apiKey) {
        console.error(chalk.red('Error: API key is required. Set HANDELSREGISTER_API_KEY or use --api-key'));
        process.exit(1);
      }

      const client = new Handelsregister(apiKey);
      const features = options.feature as Feature[];
      
      const data = await client.fetchOrganization({
        q: query,
        features,
        aiSearch: options.aiSearch === false ? 'off' : 'on'
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

// Document command
program
  .command('document <query>')
  .description('Download company documents')
  .requiredOption('-t, --type <type>', 'Document type (shareholders_list, AD, CD)')
  .option('-o, --output <file>', 'Output file path')
  .action(async (query: string, options: any) => {
    try {
      const apiKey = program.opts().apiKey || process.env.HANDELSREGISTER_API_KEY;
      
      if (!apiKey) {
        console.error(chalk.red('Error: API key is required. Set HANDELSREGISTER_API_KEY or use --api-key'));
        process.exit(1);
      }

      const company = new Company(query, apiKey);
      const entityId = await company.getId();
      
      const outputFile = options.output || `${entityId}_${options.type}.pdf`;
      
      console.log(chalk.blue(`Fetching document for: ${await company.getName()}`));
      console.log(chalk.gray(`Document type: ${options.type}`));
      
      await company.fetchDocument(options.type as DocumentType, outputFile);
      
      console.log(chalk.green(`✓ Document saved to: ${outputFile}`));
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Enrich command
program
  .command('enrich <file>')
  .description('Enrich data file with company information')
  .option('-i, --input <type>', 'Input file type (json, csv, xlsx) - auto-detected if not specified')
  .option('-q, --query-properties <mappings...>', 'Property mappings in format prop1=column1 prop2=column2')
  .option('-f, --feature <features...>', 'Features to include', [])
  .option('-s, --snapshot-dir <dir>', 'Directory for snapshot files')
  .option('--snapshot-interval <n>', 'Save snapshot every N items', '10')
  .action(async (file: string, options: any) => {
    try {
      const apiKey = program.opts().apiKey || process.env.HANDELSREGISTER_API_KEY;
      
      if (!apiKey) {
        console.error(chalk.red('Error: API key is required. Set HANDELSREGISTER_API_KEY or use --api-key'));
        process.exit(1);
      }

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

      const client = new Handelsregister(apiKey);
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
        snapshotInterval: parseInt(options.snapshotInterval),
        params: features.length > 0 ? { q: '', features } : {}
      });

      console.log(chalk.green('\n✓ Enrichment completed!'));
      console.log(chalk.gray(`Processed: ${result.processedCount} items`));
      console.log(chalk.gray(`Errors: ${result.errorCount} items`));
      console.log(chalk.gray(`Output: ${result.outputPath}`));

      if (result.errors && result.errors.length > 0) {
        console.log(chalk.yellow('\nErrors:'));
        const errorTable = new Table({
          head: ['Row', 'Error'],
          style: { head: ['yellow'] }
        });
        
        result.errors.slice(0, 10).forEach(err => {
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

// Helper function to display company data
function displayCompanyData(data: any): void {
  console.log(chalk.bold.blue('\n=== Company Information ===\n'));

  // Basic info
  const basicTable = new Table();
  basicTable.push(
    ['Name', data.name || '-'],
    ['Entity ID', data.entity_id || '-'],
    ['Status', data.status || '-'],
    ['Legal Form', data.legal_form || '-'],
    ['Court', data.court || '-'],
    ['Register Number', data.register_number || '-']
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
      ['Country', data.address.country_code || '-']
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
      style: { head: ['blue'] }
    });
    
    data.related_persons.current.forEach((person: any) => {
      personsTable.push([person.name, person.role]);
    });
    console.log(personsTable.toString());
  }

  // Financial KPIs
  if (data.financial_kpi?.length > 0) {
    console.log(chalk.bold.blue('\n=== Financial KPIs ==='));
    const kpiTable = new Table({
      head: ['Year', 'Revenue', 'Profit', 'Employees'],
      style: { head: ['blue'] }
    });
    
    data.financial_kpi.slice(-3).forEach((kpi: any) => {
      kpiTable.push([
        kpi.year,
        kpi.revenue ? `€${kpi.revenue.toLocaleString()}` : '-',
        kpi.profit ? `€${kpi.profit.toLocaleString()}` : '-',
        kpi.employees || '-'
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