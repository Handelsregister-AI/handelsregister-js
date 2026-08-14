# Handelsregister Node.js SDK

[![npm version](https://img.shields.io/npm/v/handelsregister.svg)](https://www.npmjs.com/package/handelsregister)
[![npm downloads](https://img.shields.io/npm/dm/handelsregister.svg)](https://www.npmjs.com/package/handelsregister)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

Official Node.js SDK for accessing German company registry (Handelsregister) data via the handelsregister.ai API.

## Features

- Company and person lookup with typed enrichment and relationship-network data
- Advanced organization search with typed filters, sorting, match context, and lazy iteration
- Official PDF and structured XML document downloads
- Cursor-paginated Signals with the complete seven-topic taxonomy
- Account profile, credits, usage, subscription, and API-key management
- Organization Monitoring and complete webhook endpoint lifecycle
- Durable idempotency and safe retry behavior for monitoring mutations
- Receiver-side webhook signature verification and verification challenges
- Bearer-token management and batch CSV/JSON/XLSX enrichment

## Installation

Requires Node.js 22.13 or newer.

```bash
npm install handelsregister
```

## Quick Start

```javascript
const { Handelsregister, Company } = require('handelsregister');

// Initialize client
const client = new Handelsregister('your-api-key');

// Search for a company
const companyData = await client.fetchOrganization('KONUX GmbH München');
console.log(companyData.name);  // "KONUX GmbH"

// Using the Company class for convenient access
const company = new Company('OroraTech GmbH München', 'your-api-key');
console.log(await company.getName());  // "OroraTech GmbH"
console.log(company.registerNumber);   // "HRB 251311"
```

## Configuration

### Authentication

The SDK supports two authentication methods. The chosen credential is sent as an HTTP header (`x-api-key` or `Authorization: Bearer …`); credentials never appear in URLs.

#### API key (default)

1. **Environment variable** (recommended):
   ```bash
   export HANDELSREGISTER_API_KEY=your-api-key
   ```

2. **Constructor parameter**:
   ```javascript
   const client = new Handelsregister('your-api-key');
   ```

3. **Configuration object**:
   ```javascript
   const client = new Handelsregister({
     apiKey: 'your-api-key',
     timeout: 60000,  // 60 seconds
     cacheEnabled: true,
     rateLimit: 1     // 1 second between requests
   });
   ```

#### Bearer token

For fine-grained, expirable credentials, use a bearer token. When both are provided, the bearer token takes precedence.

```javascript
const client = new Handelsregister({ bearerToken: 'your-bearer-token' });
// or via env var: HANDELSREGISTER_BEARER_TOKEN=your-bearer-token
```

You can mint and revoke tokens with the `createToken` / `listTokens` / `revokeToken` / `revokeAllTokens` methods (see Token Management below).

For gateways or proxies that require additional headers, use `extraHeaders`.
Authentication and User-Agent headers are managed by the SDK and cannot be
overridden:

```javascript
const client = new Handelsregister({
  apiKey: process.env.HANDELSREGISTER_API_KEY,
  extraHeaders: {
    'X-Gateway-Client-Id': process.env.GATEWAY_CLIENT_ID,
    'X-Gateway-Client-Secret': process.env.GATEWAY_CLIENT_SECRET
  }
});
```

The same object can be supplied through `HANDELSREGISTER_EXTRA_HEADERS` as
JSON. Explicit `extraHeaders` take precedence.

## API Reference

### Handelsregister Client

#### `fetchOrganization(params)`

Search and retrieve company information.

```javascript
const data = await client.fetchOrganization({
  q: 'KONUX GmbH München',
  features: [
    'related_persons',
    'financial_kpi',
    'mergers_and_acquisitions',
    'network'
  ],
  aiSearch: true,            // sends ai_search=on-default; pass false to disable
  realtimeMode: false        // set to true for a live Handelsregister lookup (+10 credits)
});

console.log(data.representation_scheme?.current);
console.log(
  data.related_persons?.current?.[0].role_representation_scheme?.history
);
console.log(data.mergers_and_acquisitions?.transactions);
console.log(data.network?.nodes, data.network?.connections);
```

The `aiSearch` option accepts a `boolean` or the literal string `'on-default' | 'off'`. The `realtimeMode` option accepts a `boolean` or the literal string `'handelsregister-default'`.

The beta `network` feature requires a Pro or Max plan and costs 25 credits when
data is returned, in addition to the 5-credit organization lookup. Before the
billable request, the SDK checks the subscription through the free Account API.
Lower-tier accounts receive `SubscriptionRequiredError` instead of a silently
reduced base profile.

#### `searchOrganizations(params)`

Paginated search with optional filters.

```javascript
const {
  OrganizationStatus,
  OwnershipStructure,
  SearchSort,
  SortOrder
} = require('handelsregister');

const result = await client.searchOrganizations({
  skip: 0,
  limit: 20,                     // 1..30
  filters: {
    postal_code: '80331',
    legal_form_code: 'GmbH',
    status: OrganizationStatus.ACTIVE,
    pl_revenue: { gte: 1_000_000, lte: 5_000_000 },
    ownership_filters: {
      structure: { eq: OwnershipStructure.FAMILY },
      owner_managed: true,
      oldest_owner_birth_date: { lte: '1960-01-01' }
    }
  },
  sort: SearchSort.REVENUE,
  order: SortOrder.DESC,
  matchContext: true
});
console.log(result.total, result.results.length);
```

`q` is optional when at least one filter is supplied:

```javascript
const result = await client.searchOrganizations({
  filters: {
    registration_date_from: '2024-01-01',
    state: 'Bayern',
    company_size_category: 'medium',
    emp_count: { gte: 50, lte: 249 }
  }
});
```

The typed `SearchOrganizationFilters` interface supports every documented
identity, industry, status, liability, location/radius, register, employee,
balance-sheet, and profit-and-loss filter. It also includes the Pro/Max
`ownership_filters`, `executive_filters`, and `lifecycle_filters` groups.
Each advanced field accepts a single value, a list of values, or a condition
object using `gte`, `lte`, `gt`, `lt`, `eq`, and `exists`.

Use `iterateSearchOrganizations` for lazy pagination beyond the 30-result
per-request limit. Each fetched page is a separate billable request and the
last request is sized to the exact `maxResults` remainder:

```javascript
for await (const organization of client.iterateSearchOrganizations({
  q: 'technology München',
  pageSize: 30,
  maxResults: 100
})) {
  console.log(organization.entity_id, organization.name);
}
```

The friendly flat financial filters are automatically translated to the
current nested `financial_filters` wire format. `company_size_category` is
sent using the current `emp_size_category` wire name.

Search queries contain 2–500 characters and may be omitted when filters are
present. Radius searches use `location_coordinates: { lat, lon }` together
with `location_max_distance_km`; legacy `{ latitude, longitude }` and
`[lat, lon]` inputs are normalized for compatibility. `sort: 'distance'`
requires a radius search. When enabled, `matchContext` returns the matching
ownership, executive, and lifecycle values under each result's
`_match_context` property.

#### `fetchPerson(params)`

Look up a person profile by name with company context. Always uses AI enrichment (15 base credits).

```javascript
const person = await client.fetchPerson({
  personQ: 'Erika Mustermann',
  organizationQ: 'Musterfirma GmbH',
  features: ['shareholdings']    // optional, +5 credits when data returned
});

console.log(person.contact?.emails); // structured address/type/label entries
console.log(person.shareholdings?.holdings?.current);
```

Use the `Person` class for lazy-loading and convenient property access (see below).

#### `fetchDocument(companyId, documentType, outputFile?)`

Download official PDF or XML documents. The positional signature remains
supported, and an object form is also available.

```javascript
// Download to buffer
const buffer = await client.fetchDocument('entity123', 'shareholders_list');

// Download to file
await client.fetchDocument('entity123', 'AD', './document.pdf');

// SI is returned as XML
await client.fetchDocument({
  companyId: 'entity123',
  documentType: 'SI',
  outputFile: './structured-information.xml'
});

// Include response Content-Type and server filename
const document = await client.fetchDocumentWithMetadata({
  companyId: 'entity123',
  documentType: 'SI'
});
console.log(document.contentType); // application/xml; charset=utf-8
```

Document types:
- `shareholders_list` - List of shareholders (Gesellschafterliste)
- `articles_of_association` - Articles / bylaws (Gesellschaftsvertrag / Satzung)
- `AD` - Current company data (Aktuelle Daten)
- `CD` - Historical data (Chronologische Daten)
- `SI` - Structured information (XML)

### Signals

Signals expose commercial-register changes through seven stable topic codes.
Catalog requests are free; successful list pages and detail requests cost 20
credits. Pages contain 20 entries and use opaque cursor pagination.

```javascript
const { Handelsregister, SignalTopic } = require('handelsregister');

const client = new Handelsregister();
const filters = {
  topics: [SignalTopic.CAPITAL_CHANGES, SignalTopic.TRANSFORMATIONS],
  organizationIds: ['organization-id-one', 'organization-id-two'],
  fromDate: '2026-07-01',
  toDate: '2026-07-30'
};

const page = await client.listSignals(filters);
const catalog = await client.getSignalCatalog();
if (page.signals.length > 0) {
  const detail = await client.getSignal(page.signals[0].event.id);
  console.log(detail.signal?.event.topic);
}
```

For manual pagination, preserve the original filters and pass
`pagination.next_cursor` unchanged:

```javascript
if (page.pagination.next_cursor) {
  const second = await client.listSignals({
    ...filters,
    cursor: page.pagination.next_cursor
  });
}
```

`iterateSignals` follows cursors lazily and stops without fetching another
page when `maxResults` is reached:

```javascript
for await (const signal of client.iterateSignals({
  topics: [SignalTopic.NEW_REGISTRATIONS],
  maxResults: 50
})) {
  console.log(signal.event.id, signal.organization?.entity_id);
}
```

Multiple `organizationIds` use OR semantics and are sent as one comma-separated
query value. The seven `SignalTopic` values are:

- `NEW_REGISTRATIONS`
- `MASTER_DATA_CHANGES`
- `CLOSURES`
- `ROLE_HOLDER_CHANGES`
- `CAPITAL_CHANGES`
- `INSOLVENCIES` (Pro or Max)
- `TRANSFORMATIONS` (Max)

HTTP 403 `PLAN_REQUIRED` responses are exposed as
`SubscriptionRequiredError` and cost no credits.

### Account and Usage

Account requests are free. API keys or Bearer tokens with `account:read` can
read the profile, credits, usage, subscription, and masked API-key list.

```javascript
const account = await client.getAccount();
const credits = await client.getAccountCredits();
const subscription = await client.getAccountSubscription();
const keys = await client.listApiKeys();

const usage = await client.getAccountUsage({
  fromDate: '2026-07-01',
  toDate: '2026-07-30',
  groupBy: 'day'
});

const page = await client.getAccountUsageTransactions({
  endpoint: '/api/v1/signals',
  perPage: 25
});
```

`fromDate` and `toDate` accept ISO 8601 strings or `Date` objects. Usage
ranges may span at most 366 days. Transactions use opaque cursors and can be
consumed automatically:

```javascript
for await (const transaction of client.iterateAccountUsageTransactions({
  perPage: 100
})) {
  console.log(transaction.endpoint, transaction.credits);
}
```

API-key creation and revocation require a dashboard-created Bearer token with
`account:keys`. Full keys are returned only once:

```javascript
const admin = new Handelsregister({ bearerToken: process.env.ADMIN_TOKEN });
const created = await admin.createApiKey();
await admin.revokeApiKey(created.api_key.id);
```

### Monitoring and Webhooks

Monitoring watches selected organizations and pushes normalized Signals to
registered HTTPS endpoints. Reads and management requests are free; a newly
activated monitor starts with the current 10-credit cycle floor. Use
`getMonitoringPricing()` to retrieve the current policy and topic
entitlements before creating or resuming monitors.

Authentication is intentionally separated:

- Monitor reads and lifecycle operations accept an API key or a Bearer token
  with `account:read` and `monitoring:manage`.
- Creating, rotating, enabling, disabling, or archiving webhook endpoints
  requires a Bearer token with `account:read` and `account:keys`.

The following example shows a complete disposable lifecycle. Store the
one-time signing secrets securely and never commit them to source control.

```javascript
const { setTimeout: delay } = require('node:timers/promises');
const { Handelsregister } = require('handelsregister');

const client = new Handelsregister({
  apiKey: process.env.HANDELSREGISTER_API_KEY
});
const admin = new Handelsregister({ bearerToken: process.env.ADMIN_TOKEN });

let endpointId;
let monitorId;

try {
  const createdEndpoint = await admin.createWebhookEndpoint({
    name: 'Production receiver',
    url: 'https://hooks.example.com/handelsregister',
    headers: { 'x-tenant': 'customer-42' }
  });
  endpointId = createdEndpoint.endpoint.id;
  const signingSecret = createdEndpoint.signing_secret; // returned only once

  const verification = await admin.verifyWebhookEndpoint(endpointId);
  if (verification.verified === false) {
    throw new Error('Receiver verification failed');
  }

  const rotated = await admin.rotateWebhookEndpointSecret(endpointId);
  const rotatedSigningSecret = rotated.signing_secret; // returned only once
  await admin.testWebhookEndpoint(endpointId);

  const pricing = await client.getMonitoringPricing(7);
  console.log(pricing);

  const createdMonitor = await client.createMonitor({
    entityId: 'organization-entity-id',
    pollIntervalDays: 7,
    endpointIds: [endpointId],
    label: 'Important customer'
  });
  monitorId = createdMonitor.monitor.id;

  // Baseline processing is asynchronous: initializing -> active.
  let monitor = createdMonitor.monitor;
  while (monitor.status === 'initializing') {
    await delay(2_000);
    monitor = (await client.getMonitor(monitorId)).monitor;
  }
  if (monitor.status !== 'active') {
    throw new Error(`Monitor activation stopped in ${monitor.status}`);
  }

  await client.updateMonitor(monitorId, 14);
  await client.pauseMonitor(monitorId);
  await client.resumeMonitor(monitorId);

  // Disabling the only endpoint parks the monitor in paused_configuration.
  await admin.disableWebhookEndpoint(endpointId);
  await admin.enableWebhookEndpoint(endpointId);
  await client.resumeMonitor(monitorId);

  const deliveries = await client.listWebhookDeliveries(endpointId);
  const events = await client.listWebhookEvents();
  console.log(deliveries, events);
} finally {
  // Archiving is recoverable history cleanup, not a hard delete.
  if (monitorId) await client.archiveMonitor(monitorId);
  if (endpointId) await admin.archiveWebhookEndpoint(endpointId);
}
```

Monitoring mutations do not accept a pricing-policy version. The current
policy returned by `getMonitoringPricing` is informational. Every mutation
gets an automatically generated `Idempotency-Key`, reused across safe internal
retries. Supply an explicit key as the last argument—or `idempotencyKey` when
creating resources—for durability across process restarts. Inspect
`client.lastIdempotencyStatus` for `created` or `replayed`.

HTTP 409 idempotency ambiguity is never retried. Webhook verification and test
operations retry only rate limiting and the pre-operation 503 kill switch,
because other 5xx results may mean the receiver was already contacted. A
normal failed verification challenge is returned as `{ verified: false }`
even though the API uses HTTP 422.

The full public method surface is:

```javascript
await client.getMonitoringPricing(7);
await client.listMonitors();
await client.createMonitor({ entityId, pollIntervalDays: 7, endpointIds });
await client.getMonitor(monitorId);
await client.updateMonitor(monitorId, 14);
await client.pauseMonitor(monitorId);
await client.resumeMonitor(monitorId);
await client.archiveMonitor(monitorId);

await admin.listWebhookEndpoints();
await admin.createWebhookEndpoint({ name, url, headers });
await admin.verifyWebhookEndpoint(endpointId);
await admin.rotateWebhookEndpointSecret(endpointId);
await admin.testWebhookEndpoint(endpointId);
await admin.enableWebhookEndpoint(endpointId);
await admin.disableWebhookEndpoint(endpointId);
await admin.archiveWebhookEndpoint(endpointId);

await client.listWebhookDeliveries(endpointId);
await client.retryWebhookDelivery(deliveryId);
await client.listWebhookEvents();
```

### Receiving Signed Webhooks

Always verify the exact raw request bytes before JSON parsing and deduplicate
at-least-once delivery using the event `id`:

```javascript
const {
  constructEvent,
  verificationResponseHeaders
} = require('handelsregister');

const event = constructEvent(rawBodyBuffer, requestHeaders, signingSecret);
if (event.type === 'endpoint.verification') {
  return {
    status: 204,
    headers: verificationResponseHeaders(event)
  };
}
```

`verifyWebhookSignature` validates the `v1,<base64>` HMAC-SHA256 signature
over `webhook-id.webhook-timestamp.raw_body`. It accepts an array containing
the current and predecessor secrets during rotation and enforces a default
five-minute timestamp tolerance. Pass `null` as its fourth argument only when
timestamp checking is handled elsewhere.

### Token Management

```javascript
// Create a long-lived token
const { token } = await client.createToken({
  tokenName: 'ci-pipeline',
  abilities: ['*'],
  expiresAt: '2027-01-01 00:00:00'
});

// List all tokens
const { tokens } = await client.listTokens();

// Revoke one
await client.revokeToken(tokens[0].id);

// Revoke all (use with care)
await client.revokeAllTokens();
```

#### `enrich(options)`

Batch enrich data files with company information.

```javascript
const result = await client.enrich({
  filePath: 'companies.csv',
  inputType: 'csv',
  queryProperties: {
    company_name: 'name',
    city: 'location'
  },
  snapshotDir: './snapshots',
  params: {
    features: ['financial_kpi', 'related_persons']
  }
});
```

### Company Class

The Company class provides convenient property access to company data:

```javascript
const company = new Company('search query', apiKey);

// Basic information
company.name;              // Company name
company.entityId;          // Unique identifier
company.status;            // Active/inactive status
company.legalForm;         // Legal form (e.g., "GmbH")
company.registerNumber;    // Registration number

// Address
company.address;           // Full address string
company.street;
company.postalCode;
company.city;

// Related persons
company.currentRelatedPersons;  // Current management
company.pastRelatedPersons;     // Former management
company.getRelatedPersonsByRole('Geschäftsführer');
company.representationScheme;          // organization-level rules + history
company.currentRelatedPersons[0]
  ?.role_representation_scheme;       // role-specific rules + history

// Financial data
company.financialKPIs;          // All financial KPIs
company.latestFinancialKPI;     // Most recent KPI
company.getFinancialKPIByYear(2023);

// Ownership and transactions
company.shareholders;
company.ubos;
company.shareholdings;
company.mergersAndAcquisitions;
company.network;                  // typed nodes and connections (Pro/Max)

// Documents
await company.fetchDocument('shareholders_list', 'output.pdf');
```

## CLI Usage

The package includes a command-line interface:

```bash
# Install globally
npm install -g handelsregister

# Search for a company
handelsregister fetch "KONUX GmbH München" --feature financial_kpi

# Download documents
handelsregister document "KONUX GmbH" --type shareholders_list --output konux.pdf

# Filter-only search using any documented filters
handelsregister search \
  --filters '{"legal_form_code":"GmbH","ownership_filters":{"owner_managed":true}}' \
  --sort revenue --order desc --match-context --limit 30

# Structured XML document
handelsregister document "KONUX GmbH" --type SI --output konux.xml

# Enrich data file
handelsregister enrich companies.csv \
  --query-properties name=company_name location=city \
  --feature related_persons --feature financial_kpi

# Monitoring reads and lifecycle
handelsregister monitors pricing --interval 7
handelsregister monitors list
handelsregister monitors show mon_01hzy2q6j3g5m8v9x0abcde123
handelsregister monitors create \
  --entity-id organization-entity-id \
  --interval 7 \
  --endpoint wep_01hzy2q6j3g5m8v9x0abcde123 \
  --label "Important customer"
handelsregister monitors update mon_01hzy2q6j3g5m8v9x0abcde123 --interval 14
handelsregister monitors pause mon_01hzy2q6j3g5m8v9x0abcde123
handelsregister monitors resume mon_01hzy2q6j3g5m8v9x0abcde123
handelsregister monitors archive mon_01hzy2q6j3g5m8v9x0abcde123

# Webhook endpoint and delivery management
handelsregister webhooks list
handelsregister webhooks create \
  --name "Production receiver" \
  --url https://hooks.example.com/handelsregister
handelsregister webhooks verify wep_01hzy2q6j3g5m8v9x0abcde123
handelsregister webhooks rotate-secret wep_01hzy2q6j3g5m8v9x0abcde123
handelsregister webhooks test wep_01hzy2q6j3g5m8v9x0abcde123
handelsregister webhooks disable wep_01hzy2q6j3g5m8v9x0abcde123
handelsregister webhooks enable wep_01hzy2q6j3g5m8v9x0abcde123
handelsregister webhooks deliveries --endpoint wep_01hzy2q6j3g5m8v9x0abcde123
handelsregister webhooks retry del_01hzy2q6j3g5m8v9x0abcde123
handelsregister webhooks events
handelsregister webhooks archive wep_01hzy2q6j3g5m8v9x0abcde123
```

### Person Class

```javascript
const { Person } = require('handelsregister');

const person = new Person('Erika Mustermann', 'Musterfirma GmbH', apiKey, {
  features: ['shareholdings']
});

await person.getRawData();    // triggers the API call
console.log(person.name);
console.log(person.bio);
console.log(person.handelsregisterRoles);
console.log(person.currentHandelsregisterRoles);
console.log(person.shareholdings);
```

## Available Features

When fetching company data, you can request additional features:

Core:
- `related_persons` - Management and executives
- `financial_kpi` - Financial key performance indicators
- `balance_sheet_accounts` - Balance sheet data
- `profit_and_loss_account` - P&L statement data
- `publications` - Official publications
- `annual_financial_statements` - Full annual reports (Markdown)
- `annual_financial_statements__html` - Full annual reports (HTML)
- `insolvency_publications` - Insolvency court notices

Ownership:
- `shareholders` - Shareholder list with capital contributions
- `ubos` - Ultimate beneficial owners
- `shareholdings` - Outbound shareholdings the company holds in others
- `mergers_and_acquisitions` - Mergers, divisions, enterprise agreements,
  counterparties, succession and control relationships
- `network` - Relationship graph of connected organizations and people
  (beta, Pro/Max)

Enrichment:
- `news` - News articles about the company
- `website_content` - Company website as LLM-ready Markdown (requires `aiSearch: true`)

### Current response structure

Core organization responses include `contact_data` and
`representation_scheme`. Coordinates use `latitude` and `longitude`.
Organization and person representation schemes expose `current` (or `latest`
for some past person roles) and dated `history` entries.

Feature response keys mostly match their requested names, with two important
details:

- `publications` is returned under `history`.
- `annual_financial_statements__html` keeps the double underscore in the
  response key.

The SDK types retain older flattened aliases as deprecated optional fields, but
new code should use the current nested structures:

```javascript
data.contact_data?.website;
data.shareholdings?.holdings?.current;
data.ubos?.beneficial_owners;
data.mergers_and_acquisitions?.control?.controlled_by;
data.network?.nodes;
data.network?.connections;
data.history; // requested via features: ['publications']
```

## Error Handling

The SDK provides specific error classes:

```javascript
const { 
  HandelsregisterError,
  AuthenticationError,
  InsufficientCreditsError,
  SubscriptionRequiredError,
  IdempotencyConflictError,
  ServiceUnavailableError,
  NotFoundError,
  RequestTimeoutError,
  RateLimitError,
  ValidationError 
} = require('handelsregister');

try {
  const data = await client.fetchOrganization('company name');
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Invalid API key');
  } else if (error instanceof RateLimitError) {
    console.error('Rate limit exceeded');
  } else if (error instanceof SubscriptionRequiredError) {
    console.error(error.message);
    console.error('Accepted plans:', error.requiredPlans);
    console.error('Blocked filters:', error.blockedFilters);
    console.error('Blocked features:', error.blockedFeatures);
  } else if (error instanceof IdempotencyConflictError) {
    console.error('Inspect the stored operation before retrying');
  }
}
```

Errors preserve the parsed API response on `error.response`, the HTTP status on
`error.statusCode`, response headers on `error.responseHeaders`, and
machine-readable API codes on `error.code` (also `error.errorCode`). Plan
errors additionally expose `requiredPlans`, `blockedFilters`, and
`blockedFeatures`. The legacy
`PaymentRequiredError`, `ForbiddenError`, and `ValidationError` classes remain
available; their current specialized subclasses continue to satisfy
`instanceof` checks against those base classes.

## TypeScript Support

This SDK is written in TypeScript and provides full type definitions:

```typescript
import {
  CompanyData,
  Feature,
  Handelsregister,
  OrganizationStatus,
  SearchOrganizationFilters,
  SearchSort,
  SortOrder
} from 'handelsregister';

const features: Feature[] = ['financial_kpi', 'related_persons'];
const data: CompanyData = await client.fetchOrganization({
  q: 'company name',
  features
});

const filters: SearchOrganizationFilters = {
  legal_form_code: 'GmbH',
  status: OrganizationStatus.ACTIVE,
  ownership_filters: { largest_share_ratio: { gte: 0.5 } }
};
await client.searchOrganizations({
  filters,
  sort: SearchSort.LARGEST_SHARE_RATIO,
  order: SortOrder.DESC,
  matchContext: true
});
```

## Examples

See the `examples/` directory for more detailed examples:

- `basic-usage.js` - Basic client usage
- `company-class.js` - Using the Company wrapper
- `search.js` - Paginated search with filters
- `person.js` - Person lookup using the `Person` class
- `token-management.js` - Create / list / revoke bearer tokens
- `account-signals.js` - Account reads and lazy Signals iteration
- `monitoring.js` - Monitoring reads and receiver-side webhook verification
- `enrichment.js` - Batch data enrichment
- `typescript-example.ts` - TypeScript example

## License

GNU Affero General Public License v3.0 — see [LICENSE](LICENSE).

## Support

For support and questions, please visit [handelsregister.ai](https://handelsregister.ai) or open an issue on GitHub.
