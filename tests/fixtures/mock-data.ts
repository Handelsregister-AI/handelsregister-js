import { CompanyData } from '../../src/types';

export const mockCompanyDataMinimal: CompanyData = {
  entity_id: 'entity-minimal',
  name: 'Minimal Company GmbH'
};

export const mockCompanyDataFull: CompanyData = {
  entity_id: 'entity-full',
  name: 'Full Company AG',
  status: 'active',
  purpose: 'Manufacturing and distribution of industrial equipment',
  
  // Registration
  court: 'Amtsgericht Frankfurt',
  register_type: 'HRB',
  register_number: 'HRB 98765',
  register_date: '2015-03-15',
  legal_form: 'AG',
  
  // Address
  address: {
    street: 'Industriestraße 123',
    postal_code: '60311',
    city: 'Frankfurt am Main',
    country_code: 'DE',
    coordinates: {
      lat: 50.1109,
      lon: 8.6821
    }
  },
  
  // Contact
  website: 'https://full-company.de',
  phone_number: '+49 69 98765432',
  email: 'contact@full-company.de',
  
  // Business info
  keywords: ['manufacturing', 'industrial', 'equipment', 'machinery'],
  products_and_services: 'Manufacturing of industrial machinery and equipment',
  industry_classification: 'Manufacturing',
  wz2008_codes: ['28.10', '28.20'],
  
  // Related persons
  related_persons: {
    current: [
      { name: 'Dr. Klaus Schmidt', role: 'Vorstandsvorsitzender' },
      { name: 'Maria Weber', role: 'Vorstand' },
      { name: 'Thomas Müller', role: 'Vorstand' },
      { name: 'Anna Wagner', role: 'Aufsichtsratsvorsitzende' }
    ],
    past: [
      { name: 'Prof. Dr. Hans Meyer', role: 'Vorstandsvorsitzender' },
      { name: 'Peter Becker', role: 'Vorstand' }
    ]
  },
  
  // Financial data
  financial_kpi: [
    {
      year: 2021,
      revenue: 50000000,
      profit: 5000000,
      employees: 250,
      balance_sheet_total: 75000000,
      equity: 30000000,
      liabilities: 45000000
    },
    {
      year: 2022,
      revenue: 55000000,
      profit: 6500000,
      employees: 275,
      balance_sheet_total: 82000000,
      equity: 35000000,
      liabilities: 47000000
    },
    {
      year: 2023,
      revenue: 60000000,
      profit: 7200000,
      employees: 300,
      balance_sheet_total: 90000000,
      equity: 40000000,
      liabilities: 50000000
    }
  ],
  
  // Balance sheet
  balance_sheet_accounts: [
    {
      year: 2023,
      assets: {
        fixed_assets: 45000000,
        current_assets: 45000000,
        total: 90000000
      },
      liabilities: {
        equity: 40000000,
        provisions: 15000000,
        liabilities: 35000000,
        total: 90000000
      }
    }
  ],
  
  // P&L
  profit_and_loss_account: [
    {
      year: 2023,
      revenue: 60000000,
      other_operating_income: 2000000,
      cost_of_materials: 25000000,
      personnel_costs: 18000000,
      depreciation: 3000000,
      other_operating_expenses: 7000000,
      financial_result: -800000,
      taxes: 1000000,
      net_income: 7200000
    }
  ],
  
  // Publications
  publications: [
    {
      date: '2024-03-15',
      type: 'Jahresabschluss',
      content: 'Jahresabschluss zum Geschäftsjahr 2023',
      source: 'Bundesanzeiger'
    },
    {
      date: '2023-06-01',
      type: 'Gesellschafterbeschluss',
      content: 'Bestellung neuer Vorstandsmitglieder'
    }
  ],
  
  // History
  history: [
    {
      date: '2015-03-15',
      event: 'Gründung der Gesellschaft'
    },
    {
      date: '2018-01-01',
      event: 'Umwandlung von GmbH zu AG'
    },
    {
      date: '2023-06-01',
      event: 'Erweiterung des Vorstands'
    }
  ],
  
  // Meta
  meta: {
    request_credit_cost: 3,
    credits_remaining: 97
  }
};

export const mockCompanySearchResults = [
  {
    entity_id: 'entity-1',
    name: 'Tech Startup GmbH',
    legal_form: 'GmbH',
    city: 'Berlin',
    status: 'active'
  },
  {
    entity_id: 'entity-2',
    name: 'Tech Solutions AG',
    legal_form: 'AG',
    city: 'Munich',
    status: 'active'
  },
  {
    entity_id: 'entity-3',
    name: 'Tech Innovations UG',
    legal_form: 'UG (haftungsbeschränkt)',
    city: 'Hamburg',
    status: 'active'
  }
];

export const mockErrorResponses = {
  unauthorized: {
    error: 'Unauthorized',
    message: 'Invalid API key',
    status: 401
  },
  rateLimited: {
    error: 'Rate limit exceeded',
    message: 'Too many requests',
    status: 429,
    retry_after: 60
  },
  notFound: {
    error: 'Not found',
    message: 'Company not found',
    status: 404
  },
  serverError: {
    error: 'Internal server error',
    message: 'Something went wrong',
    status: 500
  }
};