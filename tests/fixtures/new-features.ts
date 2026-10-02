import type { CompanyData } from '../../src';

const source = {
  statement_type: 'Jahresabschluss',
  period_start: '2023-01-01',
  period_end: '2023-12-31',
  exempt_subsidiary: false,
  parent_organization: null,
};
const tree = [
  {
    name: { en: 'Assets', de: 'Aktivseite' },
    value: 0,
    children: [
      {
        name: { in_report: 'A. Anlagevermögen' },
        value: -5,
        children: null,
        future_field: true,
      },
    ],
  },
];
export const financialFixture: CompanyData = {
  entity_id: 'energy',
  name: 'Example energy company',
  capital: {
    current: {
      amount: 50000,
      currency: 'EUR',
      kind: 'STAMMKAPITAL',
      change_amount: { amount: 1000, currency: 'EUR' },
    },
    history: [{ value: null, effective_from: null, effective_to: null }],
  },
  financial_kpi: [
    { year: 2024, revenue: 100 },
    {
      year: 2023,
      revenue: 0,
      net_income: -5,
      employees: 0,
      equity_ratio: 0.25,
      debt_to_equity: 2,
      _provenance: source,
    },
  ],
  balance_sheet_accounts: [
    { year: 2024, balance_sheet_accounts: [], _provenance: source },
    {
      year: 2023,
      balance_sheet_accounts: tree,
      _provenance: source,
      activity_statements: [
        {
          activity: {
            name: { en: 'Electricity distribution', in_report: 'Strom Netz' },
          },
          balance_sheet_accounts: tree,
          _provenance: { ...source, statement_type: 'Tätigkeitsabschluss' },
          future_field: 'kept',
        },
      ],
    },
  ],
  profit_and_loss_account: [
    {
      year: 2023,
      profit_and_loss_accounts: [{ name: 'Revenue', value: 0 }],
      _provenance: {
        ...source,
        exempt_subsidiary: true,
        parent_organization: { name: 'Parent GmbH' },
      },
      activity_statements: [
        {
          activity: { name: { en: 'Electricity distribution' } },
          profit_and_loss_accounts: [{ name: 'Net income', value: -5 }],
          _provenance: { ...source, statement_type: 'Tätigkeitsabschluss' },
        },
      ],
    },
  ],
};
