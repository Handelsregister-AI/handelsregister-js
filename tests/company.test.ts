import nock from 'nock';
import { Company } from '../src/company';
import { Handelsregister } from '../src/client';
import { CompanyData } from '../src/types';

describe('Company Class', () => {
  const API_KEY = 'test-api-key';
  const BASE_URL = 'https://handelsregister.ai';
  
  const mockCompanyData: CompanyData = {
    entity_id: 'entity-123',
    name: 'Test Company GmbH',
    status: 'active',
    purpose: 'Software development',
    court: 'Amtsgericht München',
    register_type: 'HRB',
    register_number: 'HRB 12345',
    register_date: '2020-01-01',
    legal_form: 'GmbH',
    address: {
      street: 'Teststraße 1',
      postal_code: '80331',
      city: 'München',
      country_code: 'DE',
      coordinates: { lat: 48.1351, lon: 11.5820 }
    },
    website: 'https://test-company.de',
    phone_number: '+49 89 12345678',
    email: 'info@test-company.de',
    keywords: ['software', 'technology'],
    products_and_services: 'Software solutions',
    industry_classification: 'Information technology',
    wz2008_codes: ['62.01'],
    related_persons: {
      current: [
        { name: 'Max Mustermann', role: 'Geschäftsführer' },
        { name: 'Erika Musterfrau', role: 'Prokurist' }
      ],
      past: [
        { name: 'John Doe', role: 'Geschäftsführer' }
      ]
    },
    financial_kpi: [
      { year: 2022, revenue: 1000000, profit: 100000, employees: 20 },
      { year: 2023, revenue: 1500000, profit: 200000, employees: 25 }
    ],
    balance_sheet_accounts: [
      {
        year: 2023,
        assets: { fixed_assets: 500000, current_assets: 300000, total: 800000 },
        liabilities: { equity: 400000, provisions: 100000, liabilities: 300000, total: 800000 }
      }
    ],
    publications: [
      { date: '2023-01-01', type: 'Annual Report', content: 'Annual report 2022' }
    ],
    meta: {
      request_credit_cost: 2,
      credits_remaining: 98
    }
  };

  beforeEach(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('constructor and initialization', () => {
    it('should create instance with search query and api key', () => {
      const company = new Company('Test Company', API_KEY);
      expect(company).toBeInstanceOf(Company);
    });

    it('should create instance with existing client', () => {
      const client = new Handelsregister(API_KEY);
      const company = new Company('Test Company', client);
      expect(company).toBeInstanceOf(Company);
    });

    it('should create instance with features', () => {
      const company = new Company('Test Company', API_KEY, {
        features: ['financial_kpi', 'related_persons']
      });
      expect(company).toBeInstanceOf(Company);
    });
  });

  describe('async properties', () => {
    let company: Company;

    beforeEach(() => {
      company = new Company('Test Company', API_KEY);
      
      nock(BASE_URL)
        .get('/api/v1/fetch-organization')
        .query(true)
        .reply(200, mockCompanyData);
    });

    it('should fetch and return basic properties', async () => {
      expect(await company.getId()).toBe('entity-123');
      expect(await company.getName()).toBe('Test Company GmbH');
      expect(await company.getStatus()).toBe('active');
      expect(await company.getPurpose()).toBe('Software development');
    });

    it('should fetch and return registration info', async () => {
      expect(await company.getCourt()).toBe('Amtsgericht München');
      expect(await company.getRegisterType()).toBe('HRB');
      expect(await company.getRegisterNumber()).toBe('HRB 12345');
      expect(await company.getRegisterDate()).toBe('2020-01-01');
      expect(await company.getLegalForm()).toBe('GmbH');
    });

    it('should fetch and return address', async () => {
      const address = await company.getAddress();
      expect(address).toBe('Teststraße 1, 80331, München, DE');
    });

    it('should cache data after first fetch', async () => {
      // First call triggers API request
      await company.getName();
      
      // Subsequent calls should use cached data
      expect(company.entityId).toBe('entity-123');
      expect(company.name).toBe('Test Company GmbH');
      expect(company.status).toBe('active');
    });
  });

  describe('sync properties', () => {
    let company: Company;

    beforeEach(async () => {
      company = new Company('Test Company', API_KEY);
      
      nock(BASE_URL)
        .get('/api/v1/fetch-organization')
        .query(true)
        .reply(200, mockCompanyData);
      
      // Load data
      await company.getName();
    });

    it('should return basic properties', () => {
      expect(company.entityId).toBe('entity-123');
      expect(company.name).toBe('Test Company GmbH');
      expect(company.status).toBe('active');
      expect(company.legalForm).toBe('GmbH');
    });

    it('should return address properties', () => {
      expect(company.street).toBe('Teststraße 1');
      expect(company.postalCode).toBe('80331');
      expect(company.city).toBe('München');
      expect(company.countryCode).toBe('DE');
      expect(company.coordinates).toEqual({ lat: 48.1351, lon: 11.5820 });
    });

    it('should return contact properties', () => {
      expect(company.website).toBe('https://test-company.de');
      expect(company.phoneNumber).toBe('+49 89 12345678');
      expect(company.email).toBe('info@test-company.de');
    });
  });

  describe('related persons', () => {
    let company: Company;

    beforeEach(async () => {
      company = new Company('Test Company', API_KEY);
      
      nock(BASE_URL)
        .get('/api/v1/fetch-organization')
        .query(true)
        .reply(200, mockCompanyData);
      
      await company.getName();
    });

    it('should return current related persons', () => {
      const current = company.currentRelatedPersons;
      expect(current).toHaveLength(2);
      expect(current[0].name).toBe('Max Mustermann');
      expect(current[0].role).toBe('Geschäftsführer');
    });

    it('should return past related persons', () => {
      const past = company.pastRelatedPersons;
      expect(past).toHaveLength(1);
      expect(past[0].name).toBe('John Doe');
    });

    it('should filter persons by role', () => {
      const directors = company.getRelatedPersonsByRole('Geschäftsführer');
      expect(directors).toHaveLength(2); // 1 current + 1 past
      expect(directors.map(p => p.name)).toContain('Max Mustermann');
      expect(directors.map(p => p.name)).toContain('John Doe');
    });

    it('should get all related persons', async () => {
      const all = await company.getRelatedPersons();
      expect(all).toHaveLength(3);
    });

    it('should get related persons by type', async () => {
      const current = await company.getRelatedPersons('current');
      expect(current).toHaveLength(2);
      
      const past = await company.getRelatedPersons('past');
      expect(past).toHaveLength(1);
    });
  });

  describe('financial data', () => {
    let company: Company;

    beforeEach(async () => {
      company = new Company('Test Company', API_KEY);
      
      nock(BASE_URL)
        .get('/api/v1/fetch-organization')
        .query(true)
        .reply(200, mockCompanyData);
      
      await company.getName();
    });

    it('should return all financial KPIs', () => {
      const kpis = company.financialKPIs;
      expect(kpis).toHaveLength(2);
      expect(kpis[0].year).toBe(2022);
      expect(kpis[1].year).toBe(2023);
    });

    it('should return latest financial KPI', () => {
      const latest = company.latestFinancialKPI;
      expect(latest?.year).toBe(2023);
      expect(latest?.revenue).toBe(1500000);
    });

    it('should get KPI by year', () => {
      const kpi2022 = company.getFinancialKPIByYear(2022);
      expect(kpi2022?.revenue).toBe(1000000);
      expect(kpi2022?.employees).toBe(20);
    });

    it('should return balance sheets', () => {
      const sheets = company.balanceSheets;
      expect(sheets).toHaveLength(1);
      expect(sheets[0].year).toBe(2023);
      expect(sheets[0].assets?.total).toBe(800000);
    });
  });

  describe('document fetching', () => {
    let company: Company;

    beforeEach(async () => {
      company = new Company('Test Company', API_KEY);
      
      nock(BASE_URL)
        .get('/api/v1/fetch-organization')
        .query(true)
        .reply(200, mockCompanyData);
      
      await company.getName();
    });

    it('should fetch document using entity id', async () => {
      const mockPdf = Buffer.from('mock pdf');

      nock(BASE_URL, { reqheaders: { 'x-api-key': API_KEY } })
        .get('/api/v1/fetch-document')
        .query({
          company_id: 'entity-123',
          document_type: 'AD',
        })
        .reply(200, mockPdf);

      const result = await company.fetchDocument('AD');
      expect(result).toEqual(mockPdf);
    });

    it('should accept articles_of_association doc type via Company.fetchDocument', async () => {
      const mockPdf = Buffer.from('articles');

      nock(BASE_URL)
        .get('/api/v1/fetch-document')
        .query({
          company_id: 'entity-123',
          document_type: 'articles_of_association',
        })
        .reply(200, mockPdf);

      const result = await company.fetchDocument('articles_of_association');
      expect(result).toEqual(mockPdf);
    });
  });

  describe('new accessors (shareholders/ubos/shareholdings/news/insolvency/website)', () => {
    let company: Company;

    const enrichedData: CompanyData = {
      entity_id: 'enriched-1',
      name: 'Enriched GmbH',
      shareholders: {
        entries: [
          { display_name: 'Alice', percentage: 60, contribution_amount: 30000 },
          { display_name: 'Bob', percentage: 40, contribution_amount: 20000 },
        ],
        total_capital: 50000,
      },
      ubos: {
        resolved: [{ name: 'Alice', percentage: 60, type: 'natural', resolved: true }],
      },
      shareholdings: {
        current: [{ organization_name: 'SubCo GmbH', percentage: 100 }],
      },
      news: [{ title: 'Funding round closed', date: '2026-03-01' }],
      insolvency_publications: [
        { date: '2025-11-12', court: 'AG München', case_number: '123/25' },
      ],
      website_content: { url: 'https://example.com', content: 'About us...' },
      annual_financial_statements: [{ year: 2023, revenue: 1_000_000 }],
      annual_financial_statements_html: [{ year: 2023, html: '<p>Report</p>' }],
    };

    beforeEach(async () => {
      company = new Company('Enriched', API_KEY);
      nock(BASE_URL).get('/api/v1/fetch-organization').query(true).reply(200, enrichedData);
      await company.getName();
    });

    it('exposes shareholders', () => {
      expect(company.shareholders?.entries).toHaveLength(2);
      expect(company.shareholders?.total_capital).toBe(50000);
    });

    it('exposes UBOs', () => {
      expect(company.ubos?.resolved?.[0].name).toBe('Alice');
    });

    it('exposes shareholdings', () => {
      expect(company.shareholdings?.current?.[0].organization_name).toBe('SubCo GmbH');
    });

    it('exposes news', () => {
      expect(company.news).toHaveLength(1);
      expect(company.news[0].title).toBe('Funding round closed');
    });

    it('exposes insolvency publications', () => {
      expect(company.insolvencyPublications).toHaveLength(1);
      expect(company.insolvencyPublications[0].court).toBe('AG München');
    });

    it('exposes websiteContent', () => {
      expect((company.websiteContent as any).url).toBe('https://example.com');
    });

    it('exposes annualFinancialStatementsHtml separately from markdown variant', () => {
      expect(company.annualFinancialStatements).toHaveLength(1);
      expect(company.annualFinancialStatementsHtml).toHaveLength(1);
      expect(company.getAnnualFinancialStatementForYear(2023)).toBeDefined();
      expect(company.getAnnualFinancialStatementForYear(2023, true)).toEqual({
        year: 2023,
        html: '<p>Report</p>',
      });
      expect(company.getAnnualFinancialStatementForYear(2099)).toBeUndefined();
    });
  });

  describe('current API v1 response shapes', () => {
    let company: Company;

    const currentApiData: CompanyData = {
      entity_id: 'current-1',
      name: 'Current Shape AG',
      address: {
        street: 'Teststraße',
        house_number: '42',
        postal_code: '80331',
        city: 'München',
        country: 'DEU',
        coordinates: { latitude: 48.13, longitude: 11.58 },
      },
      contact_data: {
        website: 'https://current.example',
        phone_number: '+49 89 123',
        email: 'info@current.example',
      },
      representation_scheme: {
        current: ['Two board members represent jointly.'],
        history: [
          {
            value: ['One board member represented individually.'],
            effective_from: '2020-01-01',
            effective_to: '2024-01-01',
          },
        ],
      },
      related_persons: {
        current: [
          {
            name: 'Erika Vorstand',
            role: {
              de: { long: 'Vorsitzende des Vorstands', short: 'Vorstand' },
              en: { long: 'Board Chair', short: 'Board' },
            },
            organization_representation_scheme: {
              current: ['Two board members represent jointly.'],
              history: [],
            },
            role_representation_scheme: {
              current: ['einzelvertretungsberechtigt'],
              history: [],
            },
          },
        ],
      },
      history: [
        {
          entity_type: 'EVENT',
          name: { en: 'Legal form change', de: 'Rechtsformwechsel' },
          start_date: '2024-01-01',
        },
      ],
      annual_financial_statements__html: [
        { year: 2024, document_html: '<p>Report</p>' },
      ],
      website_content: '# Current Shape AG\n\nCompany website content.',
      mergers_and_acquisitions: {
        transactions: [
          {
            id: 'tx-1',
            type: {
              category: 'MERGER',
              event_type: 'GROUP.MERGER',
              name: { en: 'Merger', de: 'Verschmelzung' },
            },
          },
        ],
        control: { controlled_by: [], controls: [], former: [] },
        summary: { total_transactions: 1 },
      },
      network: {
        depth: 1,
        nodes: [
          {
            node_id: 'organization:current',
            entity_id: 'current',
            name: 'Current Shape AG',
            is_root: true,
          },
        ],
        connections: [],
      },
    };

    beforeEach(async () => {
      company = new Company('Current Shape AG', API_KEY);
      nock(BASE_URL)
        .get('/api/v1/fetch-organization')
        .query(true)
        .reply(200, currentApiData);
      await company.getRawData();
    });

    it('uses nested contact data and current coordinate names', () => {
      expect(company.address).toBe('Teststraße 42, 80331, München, DEU');
      expect(company.countryCode).toBe('DEU');
      expect(company.coordinates).toEqual({
        latitude: 48.13,
        longitude: 11.58,
      });
      expect(company.website).toBe('https://current.example');
      expect(company.phoneNumber).toBe('+49 89 123');
      expect(company.email).toBe('info@current.example');
    });

    it('exposes organization and person representation schemes', () => {
      expect(company.representationScheme?.current).toHaveLength(1);
      expect(
        company.currentRelatedPersons[0].role_representation_scheme?.current,
      ).toEqual(['einzelvertretungsberechtigt']);
      expect(company.getRelatedPersonsByRole('Board Chair')).toHaveLength(1);
      expect(company.getRelatedPersonsByRole('Vorsitzende')).toHaveLength(1);
    });

    it('maps publications to the history response key', () => {
      expect(company.publications).toHaveLength(1);
      expect(company.publications[0].entity_type).toBe('EVENT');
    });

    it('exposes the double-underscore HTML and M&A response keys', () => {
      expect(company.annualFinancialStatementsHtml[0].document_html).toBe(
        '<p>Report</p>',
      );
      expect(
        company.mergersAndAcquisitions?.summary?.total_transactions,
      ).toBe(1);
      expect(company.websiteContent).toContain('# Current Shape AG');
      expect(company.network?.nodes?.[0].is_root).toBe(true);
    });
  });

  describe('utility methods', () => {
    let company: Company;

    beforeEach(async () => {
      // Create a client with caching disabled
      const client = new Handelsregister({
        apiKey: API_KEY,
        cacheEnabled: false
      });
      company = new Company('Test Company', client);
      
      nock(BASE_URL)
        .get('/api/v1/fetch-organization')
        .query(true)
        .reply(200, mockCompanyData)
        .persist();
      
      await company.getName();
    });

    it('should convert to JSON', () => {
      const json = company.toJSON();
      expect(json).toEqual(mockCompanyData);
    });

    it('should provide string representation', () => {
      const str = company.toString();
      expect(str).toBe('Company(Test Company GmbH) - GmbH - active');
    });

    it('should show unloaded state in toString', () => {
      const newCompany = new Company('Another Company', API_KEY);
      const str = newCompany.toString();
      expect(str).toBe('Company(Another Company) - not loaded');
    });

    it('should refresh data', async () => {
      // First verify the initial state
      expect(company.name).toBe('Test Company GmbH');
      
      const updatedData = { ...mockCompanyData, name: 'Updated Company GmbH' };
      
      // Clean up the persistent nock from beforeEach
      nock.cleanAll();
      
      // Set up a new nock for the refresh call - use .persist() to ensure it's available
      nock(BASE_URL)
        .get('/api/v1/fetch-organization')
        .query(true)  // Accept any query params
        .reply(200, updatedData);

      await company.refresh();
      
      // Check if nock was called
      if (!nock.isDone()) {
        console.log('Pending nock interceptors:', nock.pendingMocks());
      }
      
      // The refresh should have fetched the updated data
      expect(company.name).toBe('Updated Company GmbH');
    });
  });
});
