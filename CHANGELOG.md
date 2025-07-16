# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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