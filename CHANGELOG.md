# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0] - 2026-10-02

### Added

- Separate Max-only `shareholders_deep` feature with types for holders, joint
  communities, share ranges, ownership, tenure, document history and changes.
  Existing regular shareholders remain available alongside it.
- Typed registered capital and capital history in the base response, exposed
  through `Company.capital` and `Company.capitalInfo`.
- All-plan financial `_provenance`, expanded Pro/Max KPI types and Max-only
  activity balance sheets and P&Ls under the existing financial features.
- Year-specific Company helpers and public account traversal/name helpers.
- CLI display of full financial trees, separate activity statements and their
  sources, regular/deep shareholders, and local `--financial-year` selection.
- Runnable examples, offline compatibility/contract/export/CLI tests and
  TypeScript consumer checks for the new fields.
- Tag-triggered npm trusted-publishing workflow through GitHub Actions.

### Fixed

- CSV/Excel enrichment now includes new response columns and serializes nested
  values as JSON, preserving provenance, activity statements and deep ownership.
- Oversized Excel values are split into literal chunks on `Long values` with
  JSON references in the main sheet, preserving data beyond the cell limit.
- CLI financial output retains zero/negative values and displays ratios without
  currency suffixes.
- Fix the CLI's Chalk import so human-readable commands and error rendering work.
- Updated Axios, CSV parsing and development dependencies to patched releases.

## [0.5.0] - 2026-08-14

### Added

- Pro/Max `network` organization feature with typed graph nodes and
  connections, plus `Company.network`.
- First-class organization-search sorting, ordering, and match-context
  parameters, including automatic pagination forwarding.
- Typed ownership, executive, and lifecycle search filters with comparison
  and existence conditions.
- Public organization-status, liability, ownership-structure,
  insolvency-status, search-sort, and sort-order constants and types.
- Actionable plan-denial properties on `SubscriptionRequiredError`:
  `requiredPlans`, `blockedFilters`, and `blockedFeatures`.

### Changed

- Organization search now enforces the current 500-character query maximum,
  accepts one legal-form code, normalizes legacy search coordinates to
  `{lat, lon}`, and validates current geographic and advanced-filter shapes.
- API plan errors prefer the server's human-readable message over its machine
  code.
- The published ESM build now uses Node-compatible module specifiers and is
  exercised alongside the CommonJS build in CI.
- Network requests preflight the plan through the free Account API, preventing
  lower-tier accounts from being charged for a silently reduced base profile.
- Updated the CLI, README, examples, and unit coverage for the new APIs.

## [0.4.0] - 2026-08-07

### Added

- Complete Account API support: profile, credits, usage, cursor-paginated
  transactions, subscription, masked API-key listing, and Bearer-only API-key
  creation/revocation.
- Complete Signals API support: catalog, filtered list/detail requests,
  multi-organization filtering, opaque cursor handling, lazy async iteration,
  and all seven public `SignalTopic` values.
- Complete Monitoring API support for pricing, monitor lifecycle, webhook
  endpoint lifecycle, delivery retry/history, and event history.
- Durable idempotency keys on every Monitoring mutation, explicit-key support,
  replay status capture, and safe retry rules for database and receiver-side
  operations.
- Receiver helpers for webhook HMAC verification, secret rotation, timestamp
  tolerance, event construction, and endpoint-verification challenges.
- Current API error classes for subscription requirements, conflicts,
  idempotency failures, server failures, and the temporary execution kill
  switch while preserving compatibility with existing error classes.
- `iterateSearchOrganizations()` for lazy offset pagination with exact final
  page sizing.
- Generic `extraHeaders` and `HANDELSREGISTER_EXTRA_HEADERS` support for
  gateways and proxies without allowing authentication headers to be
  overridden.
- Monitoring and webhook-management CLI command groups.

### Changed

- The project is now licensed under GNU Affero General Public License v3.0
  (`AGPL-3.0-only`).
- Search financial filters now use the current nested `financial_filters`
  wire shape and `company_size_category` maps to `emp_size_category`.
- Real-time organization requests are no longer cached and reject features
  that the real-time service cannot combine.
- JSON endpoints send `Accept: application/json`, redirects surface as API
  errors, and API errors retain response headers, payload, detail, and meta.
- Monitoring pricing policy versions remain informational and cannot be
  supplied through monitor mutation methods.

## [0.3.0] - 2026-07-27

### Added
- Full response types for organization and related-person representation
  schemes, including current/latest values and dated history.
- `mergers_and_acquisitions` organization feature with transaction,
  counterparty, succession, control, and summary types.
- Complete typed organization-search filter surface and filter-only searches.
- `aiMode` support for `searchOrganizations`.
- `SI` document support and `fetchDocumentWithMetadata` for content type and
  server filename access.
- Current nested response types for contacts, financial accounts,
  shareholders, UBOs, organization/person shareholdings, publications, and
  annual statements.
- Specific `PaymentRequiredError`, `ForbiddenError`, `NotFoundError`, and
  `RequestTimeoutError` classes.

### Changed
- Organization search now enforces the documented maximum of 30 results.
- `Company` resolves current `contact_data`, `history`, coordinate, and
  double-underscore HTML statement fields while retaining legacy fallbacks.
- `Person` normalizes structured email/phone entries and detects current
  Handelsregister roles using `end_date`.
- HTTP error messages and machine-readable error codes are preserved from API
  responses. HTTP 408 is not automatically retried.
- Updated Axios and SheetJS to maintained, vulnerability-free releases.
- Replaced Jest with Vitest and migrated to ESLint's current flat
  configuration to remove vulnerable development dependency chains.
- Raised the minimum supported Node.js version to 22.13 to match supported
  dependencies.

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
