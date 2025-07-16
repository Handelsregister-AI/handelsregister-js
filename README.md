# Handelsregister Node.js SDK

[![npm version](https://img.shields.io/npm/v/handelsregister.svg)](https://www.npmjs.com/package/handelsregister)
[![npm downloads](https://img.shields.io/npm/dm/handelsregister.svg)](https://www.npmjs.com/package/handelsregister)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

Official Node.js SDK for accessing German company registry (Handelsregister) data via the handelsregister.ai API.

## Installation

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

### API Key

You can provide your API key in several ways:

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

## API Reference

### Handelsregister Client

#### `fetchOrganization(params)`

Search and retrieve company information.

```javascript
const data = await client.fetchOrganization({
  q: 'KONUX GmbH München',
  features: ['related_persons', 'financial_kpi'],
  aiSearch: 'on'  // or 'off'
});
```

#### `fetchDocument(companyId, documentType, outputFile?)`

Download official PDF documents.

```javascript
// Download to buffer
const buffer = await client.fetchDocument('entity123', 'shareholders_list');

// Download to file
await client.fetchDocument('entity123', 'AD', './document.pdf');
```

Document types:
- `shareholders_list` - List of shareholders
- `AD` - Current company data (Aktuelle Daten)
- `CD` - Historical data (Chronologische Daten)

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

// Financial data
company.financialKPIs;          // All financial KPIs
company.latestFinancialKPI;     // Most recent KPI
company.getFinancialKPIByYear(2023);

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

# Enrich data file
handelsregister enrich companies.csv \
  --query-properties name=company_name location=city \
  --feature related_persons --feature financial_kpi
```

## Available Features

When fetching company data, you can request additional features:

- `related_persons` - Management and executives
- `financial_kpi` - Financial key performance indicators
- `balance_sheet_accounts` - Balance sheet data
- `profit_and_loss_account` - P&L statement data
- `publications` - Official publications

## Error Handling

The SDK provides specific error classes:

```javascript
const { 
  HandelsregisterError,
  AuthenticationError,
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
  }
}
```

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
- `enrichment.js` - Batch data enrichment
- `typescript-example.ts` - TypeScript example

## License

MIT

## Support

For support and questions, please visit [handelsregister.ai](https://handelsregister.ai) or open an issue on GitHub.