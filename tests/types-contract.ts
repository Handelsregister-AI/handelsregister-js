import {
  Company,
  OrganizationFeature,
  financialAccountEntries,
  walkFinancialAccounts,
} from '../dist';
import type {
  ActivityBalanceSheet,
  ActivityProfitLossAccount,
  CapitalInfo,
  CompanyData,
  Feature,
  FinancialKPI,
  FinancialProvenance,
  ShareholdersDeep,
} from '../dist';

const feature: Feature = OrganizationFeature.SHAREHOLDERS_DEEP;
// @ts-expect-error Activity statements are nested data, not another feature flag.
const invalidFeature: Feature = 'activity_statements';
const provenance: FinancialProvenance = {
  statement_type: 'Tätigkeitsabschluss',
  period_start: null,
  period_end: '2023-12-31',
  exempt_subsidiary: true,
  parent_organization: { entity_id: 'parent', name: 'Parent GmbH' },
};
const balance: ActivityBalanceSheet = {
  activity: {
    name: { en: 'Electricity distribution', in_report: 'Strom Netz' },
  },
  balance_sheet_accounts: [{ name: 'Assets', value: 0, children: null }],
  _provenance: provenance,
};
const pnl: ActivityProfitLossAccount = {
  activity: { name: 'Gas distribution' },
  profit_and_loss_accounts: { revenue: 100, net_income: -10 },
  _provenance: null,
};
const capital: CapitalInfo = {
  current: { amount: 50000, currency: 'EUR', kind: 'FUTURE_KIND' },
  history: [{ value: null, effective_from: null, effective_to: null }],
};
const deep: ShareholdersDeep = {
  record: { date: null, source: 'COMMERCIAL_REGISTER' },
  share_capital: null,
  entries: [
    {
      holder: {
        type: 'JOINT',
        name: null,
        members: [{ type: 'PERSON', name: null }],
      },
      ownership: {
        percentage: null,
        nominal_amount: null,
        share_ranges: [{ from: null, to: null, nominal_value: null }],
      },
      since: null,
      until: null,
      since_basis: 'FUTURE_VALUE',
    },
  ],
  history: [],
  changes: null,
};
const kpi: FinancialKPI = {
  year: 2023,
  ebitda: 20,
  equity_ratio: null,
  _provenance: provenance,
};
const ratio: number | null | undefined = kpi.equity_ratio;
const data: CompanyData = {
  entity_id: 'example',
  name: 'Example',
  capital,
  shareholders_deep: deep,
  financial_kpi: [kpi],
  balance_sheet_accounts: [{ year: 2023, activity_statements: [balance] }],
  profit_and_loss_account: [{ year: 2023, activity_statements: [pnl] }],
};
const company = new Company('example', 'offline', { features: [feature] });
const optionalDeep: ShareholdersDeep | null | undefined =
  company.shareholdersDeep;
const activities: ActivityBalanceSheet[] =
  company.getActivityBalanceSheetsForYear(2023);
financialAccountEntries(balance.balance_sheet_accounts);
walkFinancialAccounts(pnl.profit_and_loss_accounts);
void [invalidFeature, data, ratio, optionalDeep, activities];
