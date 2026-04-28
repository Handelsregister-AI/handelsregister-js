# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-04-28

### Added
- `searchOrganizations(params)` — paginated search with optional `postal_code` filter (`q`, `skip`, `limit`).
- `fetchPerson(params)` — person profile lookup with company context (AI-enriched, 15 base credits).
- `Person` class — lazy-loading wrapper analogous to `Company`.
- Token management: `createToken`, `listTokens`, `revokeToken`, `revokeAllTokens`.
- Bearer token authentication via `bearerToken` config option or `HANDELSREGISTER_BEARER_TOKEN` env var. When both are provided, bearer takes precedence.
- `realtimeMode` parameter on `fetchOrganization` (+10 credits, live Handelsregister lookup). Accepts `boolean` or the literal string `'handelsregister-default'`.
- New `Feature` values: `news`, `website_content`, `shareholders`, `ubos`, `shareholdings`, `insolvency_publications`, `annual_financial_statements__html`.
- New `DocumentType` value: `articles_of_association` (Gesellschaftsvertrag / Satzung).
- New CLI commands: `search`, `person`, `token-create`, `token-list`, `token-revoke`, `token-revoke-all`. The `fetch` command gained `--realtime`.
- New `Company` accessors: `shareholders`, `ubos`, `shareholdings`, `news`, `insolvencyPublications`, `websiteContent`, `annualFinancialStatementsHtml`, `getAnnualFinancialStatementForYear(year, html?)`.
- New examples: `examples/search.js`, `examples/person.js`, `examples/token-management.js`.

### Changed
- **BREAKING (wire only)**: API key is now sent in the `x-api-key` request header instead of as an `?api_key=…` query parameter. The `apiKey` constructor option is unchanged, so most callers won't notice — but anyone replaying captured request URLs or matching on query strings will need to update.
- **Fix**: `aiSearch: 'on'` previously sent `ai_search=on` over the wire, which the API ignores. The wire value is now `ai_search=on-default`. The `aiSearch` field also accepts `boolean` (`true` → `on-default`, `false`/`undefined` → not sent). The old string `'on'` is no longer accepted; use `true` or `'on-default'`.
- `User-Agent` now reflects the actual package version (`handelsregister-js/0.2.0`) instead of the hardcoded `1.0.0`.
- Internal `Cache` is now generic over `unknown` so non-organization endpoints can also be cached. Each endpoint partitions cache keys with a `kind` discriminator to avoid collisions.

## [0.1.0] - 2025-01-15

### Added
- Initial release of the Handelsregister Node.js SDK
- Core `Handelsregister` client for API interactions
- `Company` class for convenient data access
- Full TypeScript support with type definitions
- Support for all major API features:
  - Company search with AI-powered search
  - Document downloads (shareholders list, AD, CD)
  - Financial KPIs and balance sheet data
  - Related persons information
  - Publications data
- Batch enrichment functionality for CSV, JSON, and Excel files
- Command-line interface (CLI) tool
- Built-in caching mechanism
- Rate limiting with configurable delays
- Retry logic with exponential backoff
- Comprehensive error handling with custom error classes
- Support for both CommonJS and ESM modules
- Extensive documentation and examples

### Features
- Search German companies by name and location
- Retrieve detailed company information including:
  - Basic company data (name, address, legal form)
  - Registration details
  - Financial key performance indicators
  - Management and board members
  - Historical data and publications
- Download official PDF documents
- Enrich existing datasets with company information
- Resume interrupted batch operations
- CLI tool for quick access to all features

### Technical Details
- Written in TypeScript for better type safety
- Uses axios for HTTP requests
- Supports Node.js 14 and above
- Zero runtime dependencies for core functionality
- Well-tested with real API calls