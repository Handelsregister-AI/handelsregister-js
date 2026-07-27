# Handelsregister Node.js SDK

[![npm version](https://img.shields.io/npm/v/handelsregister.svg)](https://www.npmjs.com/package/handelsregister)
[![npm downloads](https://img.shields.io/npm/dm/handelsregister.svg)](https://www.npmjs.com/package/handelsregister)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

Official Node.js SDK for accessing German company registry (Handelsregister) data via the handelsregister.ai API.

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
    'mergers_and_acquisitions'
  ],
  aiSearch: true,            // sends ai_search=on-default; pass false to disable
  realtimeMode: false        // set to true for a live Handelsregister lookup (+10 credits)
});

console.log(data.representation_scheme?.current);
console.log(
  data.related_persons?.current?.[0].role_representation_scheme?.history
);
console.log(data.mergers_and_acquisitions?.transactions);
```

The `aiSearch` option accepts a `boolean` or the literal string `'on-default' | 'off'`. The `realtimeMode` option accepts a `boolean` or the literal string `'handelsregister-default'`.

#### `searchOrganizations(params)`

Paginated search with optional filters.

```javascript
const result = await client.searchOrganizations({
  q: 'tech',
  skip: 0,
  limit: 20,                     // 1..30
  filters: {
    postal_code: '80331',
    legal_form_code: ['GmbH', 'UG'],
    active: true,
    pl_revenue: { gte: 1_000_000, lte: 5_000_000 }
  },
  aiMode: false                  // true sends ai_mode=on-default (5 credits)
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
identity, industry, status, location/radius, register, employee, balance-sheet,
and profit-and-loss filter.

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
  --filters '{"legal_form_code":"GmbH","pl_revenue":{"gte":1000000}}' \
  --limit 30

# Structured XML document
handelsregister document "KONUX GmbH" --type SI --output konux.xml

# Enrich data file
handelsregister enrich companies.csv \
  --query-properties name=company_name location=city \
  --feature related_persons --feature financial_kpi
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
data.history; // requested via features: ['publications']
```

## Error Handling

The SDK provides specific error classes:

```javascript
const { 
  HandelsregisterError,
  AuthenticationError,
  PaymentRequiredError,
  ForbiddenError,
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
  } else if (error instanceof ForbiddenError &&
             error.errorCode === 'subscription_required') {
    console.error('fetch-person requires Plus, Pro, or Max');
  }
}
```

Errors preserve the parsed API response on `error.response`, the HTTP status on
`error.statusCode`, and machine-readable API codes such as
`subscription_required` on `error.errorCode`. HTTP 408 responses are not
automatically retried, avoiding duplicate paid AI work.

## TypeScript Support

This SDK is written in TypeScript and provides full type definitions:

```typescript
import { Handelsregister, Company, CompanyData, Feature } from 'handelsregister';

const features: Feature[] = ['financial_kpi', 'related_persons'];
const data: CompanyData = await client.fetchOrganization({
  q: 'company name',
  features
});
```

## Examples

See the `examples/` directory for more detailed examples:

- `basic-usage.js` - Basic client usage
- `company-class.js` - Using the Company wrapper
- `search.js` - Paginated search with filters
- `person.js` - Person lookup using the `Person` class
- `token-management.js` - Create / list / revoke bearer tokens
- `enrichment.js` - Batch data enrichment
- `typescript-example.ts` - TypeScript example

## License

MIT

## Support

For support and questions, please visit [handelsregister.ai](https://handelsregister.ai) or open an issue on GitHub.
