import nock from 'nock';
import {
  Company,
  Handelsregister,
  OrganizationFeature,
  financialAccountEntries,
  financialAccountName,
  walkFinancialAccounts,
} from '../src';
import type { CompanyData, Feature } from '../src';
import documented from './fixtures/shareholders-deep.json';

const BASE = 'https://handelsregister.ai';
import { financialFixture } from './fixtures/new-features';

describe('deep shareholders and activity financials', () => {
  beforeEach(() => nock.cleanAll());
  afterEach(() => nock.cleanAll());

  async function load(
    data: CompanyData,
    features: Feature[] = [
      'shareholders',
      'shareholders_deep',
      'balance_sheet_accounts',
      'profit_and_loss_account',
    ],
  ) {
    const scope = nock(BASE)
      .get('/api/v1/fetch-organization')
      .query((query) => {
        expect(query.feature).toEqual(features);
        return true;
      })
      .reply(200, data);
    const company = new Company(
      'example',
      new Handelsregister({ apiKey: 'offline', cacheEnabled: false }),
      { features },
    );
    const raw = await company.getRawData();
    expect(scope.isDone()).toBe(true);
    return { company, raw };
  }

  it('requests the distinct feature without a subscription preflight and keeps regular shareholders', async () => {
    expect(OrganizationFeature.SHAREHOLDERS_DEEP).toBe('shareholders_deep');
    const data = {
      ...documented,
      shareholders: {
        entries: [{ display_name: 'Regular owner', contribution_ratio: 0.75 }],
      },
    } as CompanyData;
    const { company, raw } = await load(data);
    expect(company.shareholders).toBe(raw.shareholders);
    expect(company.shareholdersDeep).toBe(raw.shareholders_deep);
    expect(await company.getShareholdersDeep()).toBe(raw.shareholders_deep);
    expect(company.shareholdersDeep).toEqual(documented.shareholders_deep);
    expect(company.shareholders?.entries?.[0].contribution_ratio).toBe(0.75);
    expect(company.shareholdersDeep?.entries?.[0].ownership?.percentage).toBe(
      75,
    );
    expect(company.toJSON()).toEqual(data);
  });

  it.each(['free', 'basic', 'pro'])(
    'accepts the omitted deep field for %s plans',
    async () => {
      const data = {
        entity_id: 'example',
        name: 'Example',
        shareholders: { entries: [{ display_name: 'Regular owner' }] },
      };
      const { company, raw } = await load(data);
      expect(company.shareholdersDeep).toBeUndefined();
      expect('shareholders_deep' in raw).toBe(false);
      expect(company.shareholders?.entries).toHaveLength(1);
    },
  );

  it('preserves null versus omitted feature blocks', async () => {
    const { company, raw } = await load({
      entity_id: 'example',
      name: 'Example',
      shareholders_deep: null,
    });
    expect(company.shareholdersDeep).toBeNull();
    expect(raw).toHaveProperty('shareholders_deep', null);
  });

  it('preserves duplicate rows, joint ownership, nulls and future enum/field values', async () => {
    const entry = {
      holder: {
        type: 'JOINT',
        name: null,
        members: [{ type: 'PERSON', name: null }],
      },
      ownership: {
        percentage: 50,
        share_count: null,
        share_ranges: [{ from: null, to: null, count: 1, nominal_value: null }],
      },
      since: null,
      since_basis: 'FUTURE_BASIS',
      until: null,
      future_field: 'preserved',
    };
    const data = {
      entity_id: 'example',
      name: 'Example',
      shareholders_deep: {
        record: { date: null, source: 'FUTURE_SOURCE' },
        entries: [entry, entry],
        share_capital: null,
        history: [{ entries: [entry] }],
        changes: null,
      },
    };
    const { company } = await load(data);
    expect(company.shareholdersDeep).toEqual(data.shareholders_deep);
    expect(company.shareholdersDeep?.entries).toHaveLength(2);
    expect(
      company.shareholdersDeep?.entries?.[0].holder?.members?.[0],
    ).not.toHaveProperty('ownership');
  });

  it('exposes complete sources, separate activities and registered capital without changing raw data', async () => {
    const { company, raw } = await load(financialFixture);
    expect(company.balanceSheets).toBe(raw.balance_sheet_accounts);
    expect(company.profitLossAccounts).toBe(raw.profit_and_loss_account);
    expect(company.getBalanceSheetForYear(2023)?._provenance).toEqual(
      financialFixture.balance_sheet_accounts?.[1]._provenance,
    );
    expect(
      company.getProfitLossAccountForYear(2023)?._provenance
        ?.parent_organization?.name,
    ).toBe('Parent GmbH');
    expect(company.getActivityBalanceSheetsForYear(2023)).toBe(
      raw.balance_sheet_accounts?.[1].activity_statements,
    );
    expect(company.getActivityProfitLossAccountsForYear(2023)).toHaveLength(1);
    expect(company.capitalInfo).toBe(raw.capital);
    expect(company.capital?.current?.change_amount?.amount).toBe(1000);
    expect(company.toJSON()).toEqual(financialFixture);
    const activity = company.getActivityBalanceSheetsForYear(2023)[0];
    expect(
      [...walkFinancialAccounts(activity.balance_sheet_accounts)].map(
        (node) => node.value,
      ),
    ).toEqual([0, -5]);
  });

  it.each([2024, 1900])(
    'returns empty activities for absent year/activity %s',
    async (year) => {
      const { company } = await load(financialFixture);
      expect(company.getActivityBalanceSheetsForYear(year)).toEqual([]);
      expect(company.getActivityProfitLossAccountsForYear(year)).toEqual([]);
    },
  );

  it('supports older API responses and never adds features automatically', async () => {
    const legacy: CompanyData = {
      entity_id: 'legacy',
      name: 'Legacy',
      financial_kpi: [{ year: 2022, profit: 1 }],
      balance_sheet_accounts: [{ year: 2022, assets: { total: 100 } }],
      profit_and_loss_account: [{ year: 2022, revenue: 5 }],
    };
    const { company, raw } = await load(legacy, [
      'financial_kpi',
      'balance_sheet_accounts',
      'profit_and_loss_account',
    ]);
    expect(raw).toEqual(legacy);
    expect(company.shareholdersDeep).toBeUndefined();
    expect(company.capitalInfo).toBeUndefined();
    expect(company.getBalanceSheetForYear(2022)?._provenance).toBeUndefined();
    expect(company.getActivityBalanceSheetsForYear(2022)).toEqual([]);
    expect(company.getActivityProfitLossAccountsForYear(2022)).toEqual([]);
  });

  it('normalizes dictionary accounts and traverses original nodes in report order', () => {
    expect(financialAccountEntries({ revenue: 5, net_income: null })).toEqual([
      { name: 'revenue', value: 5 },
      { name: 'net_income', value: null },
    ]);
    const tree =
      financialFixture.balance_sheet_accounts?.[1].balance_sheet_accounts;
    expect([...walkFinancialAccounts(tree)][0]).toBe(
      financialAccountEntries(tree)[0],
    );
    expect(
      [...walkFinancialAccounts({ assets: { total: 100 } })].map(
        (node) => node.value,
      ),
    ).toEqual([undefined, 100]);
    expect([...walkFinancialAccounts(null)]).toEqual([]);
    expect(financialAccountName({ de: 'Aktivseite' })).toBe('Aktivseite');
    expect(financialAccountName({ in_report: 'Strom Netz' })).toBe(
      'Strom Netz',
    );
  });
});
