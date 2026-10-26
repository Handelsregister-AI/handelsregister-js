import nock from 'nock';
import { vi } from 'vitest';
import { Company, Handelsregister, ValidationError } from '../src';
import type {
  AnnualFinancialStatement,
  CompanyData,
  SearchParams,
} from '../src';
import {
  annualAuditColumns,
  annualReportsForDisplay,
} from '../src/annualReports';
import { auditFixture } from './fixtures/audits';

describe('annual-report audits', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    nock.cleanAll();
  });

  it('loads once and retains document-level audits, unknown fields and raw object identity', async () => {
    const data = auditFixture();
    const before = structuredClone(data);
    const client = new Handelsregister('offline');
    const fetch = vi.spyOn(client, 'fetchOrganization').mockResolvedValue(data);
    const company = new Company('example', client, {
      features: [
        'annual_financial_statements',
        'annual_financial_statements__html',
      ],
      financialYears: 5,
      financialStatementType: 'annual',
    });
    expect(company.financialYears).toEqual([]);
    expect(company.getAnnualFinancialStatementsForYear(2024)).toEqual([]);
    const reports = await company.getAnnualFinancialStatements();
    expect(reports).toBe(data.annual_financial_statements);
    expect(company.annualFinancialStatementsHtml).toBe(
      data.annual_financial_statements__html,
    );
    expect(await company.getAnnualFinancialStatements(2024)).toHaveLength(2);
    expect(await company.getAnnualFinancialStatements(2024, true)).toHaveLength(
      2,
    );
    expect(
      company
        .getAnnualFinancialStatementsForYear(2024)
        .map((row) => row.document_type),
    ).toEqual(['Jahresabschluss', 'Konzernabschluss']);
    expect(company.getAnnualFinancialStatementForYear(2024)).toBe(reports[0]);
    expect(company.getAnnualFinancialStatementForYear(2024, true)).toBe(
      data.annual_financial_statements__html![0],
    );
    expect(company.getAnnualFinancialStatementForYear(1900)).toBeUndefined();
    expect(company.getAnnualFinancialStatementsForYear(1900)).toEqual([]);
    expect(company.financialYears).toEqual([2024, 2023, 2022, 2021]);
    expect(reports[0].audit?.auditor?.network?.future).toBe(1);
    expect(reports[0].audit?.auditor?.signatories?.[0].academic_title).toBe(
      'Dr.',
    );
    expect(
      company.getAnnualFinancialStatementForYear(2023)?.audit?.auditor,
    ).toMatchObject({ name: null, type: 'INDIVIDUAL_AUDITORS', network: null });
    expect(company.getAnnualFinancialStatementForYear(2022)?.audit).toBeNull();
    expect(
      company.getAnnualFinancialStatementForYear(2021)?.audit,
    ).toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      expect.objectContaining({
        financialYears: 5,
        financialStatementType: 'annual',
      }),
    );
    expect(company.toJSON()).toEqual(before);
    expect(data).toEqual(before);
  });

  it('supports the legacy HTML alias and includes all financial sources in available years', async () => {
    const data = auditFixture();
    data.annual_financial_statements_html =
      data.annual_financial_statements__html;
    delete data.annual_financial_statements__html;
    delete data.annual_financial_statements;
    data.financial_kpi = [{ year: 2025 }];
    data.balance_sheet_accounts = [{ year: 2019 }];
    data.profit_and_loss_account = [{ year: 2018 }];
    const client = new Handelsregister('offline');
    vi.spyOn(client, 'fetchOrganization').mockResolvedValue(data);
    const company = new Company('example', client);
    expect(await company.getAnnualFinancialStatements(2023, true)).toHaveLength(
      1,
    );
    expect(company.financialYears).toEqual([
      2025, 2024, 2023, 2022, 2021, 2019, 2018,
    ]);
    expect(annualAuditColumns(data)).toHaveProperty(
      'hr_annual_financial_statements__html_audit',
    );
  });

  it.each(
    [null, undefined, 'invalid', [null, 'invalid']].map((payload) => [payload]),
  )('handles absent/malformed report collections: %j', async (payload) => {
    const client = new Handelsregister('offline');
    vi.spyOn(client, 'fetchOrganization').mockResolvedValue({
      entity_id: 'example',
      name: 'Example',
      annual_financial_statements: payload,
    } as unknown as CompanyData);
    const company = new Company('example', client);
    expect(await company.getAnnualFinancialStatements()).toEqual([]);
    expect(company.financialYears).toEqual([]);
  });

  it('deduplicates matching formats regardless of key order without collapsing distinct documents', () => {
    const data = auditFixture();
    data.annual_financial_statements__html![0] = Object.fromEntries(
      Object.entries(data.annual_financial_statements__html![0]).reverse(),
    ) as AnnualFinancialStatement;
    expect(annualReportsForDisplay(data)).toHaveLength(5);
    data.annual_financial_statements__html![0].audit!.subject =
      'FUTURE_SUBJECT';
    data.annual_financial_statements__html!.push(
      structuredClone(data.annual_financial_statements__html![1]),
    );
    expect(annualReportsForDisplay(data)).toHaveLength(7);
    const columns = annualAuditColumns(data);
    expect(columns.hr_annual_financial_statements_audit).toHaveLength(4);
    expect(columns.hr_annual_financial_statements_audit).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ year: 2022, audit: null }),
      ]),
    );
    expect(JSON.stringify(columns)).not.toContain('document_md');
    expect(JSON.stringify(columns)).not.toContain('document_html');
    expect(
      annualAuditColumns({ annual_financial_statements: [{ year: 2020 }] }),
    ).toEqual({});
  });

  it('forwards selectors and separates cached responses for different selections', async () => {
    const client = new Handelsregister('offline');
    const selections: SearchParams[] = [
      { financialYears: 1, financialStatementType: 'annual' },
      { financialYears: 2, financialStatementType: 'annual' },
      { financialYears: 2, financialStatementType: 'consolidated' },
      {},
    ];
    for (const [index, selection] of selections.entries()) {
      const scope = nock('https://handelsregister.ai')
        .get('/api/v1/fetch-organization')
        .query((query) => {
          expect(query.feature).toBe('annual_financial_statements');
          expect(query.financial_years).toBe(
            selection.financialYears?.toString(),
          );
          expect(query.financial_statement_type).toBe(
            selection.financialStatementType,
          );
          return true;
        })
        .reply(200, { name: `Selection ${index}`, entity_id: 'example' });
      const params = {
        q: 'example',
        features: ['annual_financial_statements'] as const,
        ...selection,
      };
      const data = await client.fetchOrganization({
        ...params,
        features: [...params.features],
      });
      expect(data.name).toBe(`Selection ${index}`);
      expect(
        await client.fetchOrganization({
          ...params,
          features: [...params.features],
        }),
      ).toBe(data);
      expect(scope.isDone()).toBe(true);
    }
  });

  it.each([0, 31, 1.5, NaN, Infinity])(
    'rejects invalid year count %s before a request',
    async (financialYears) => {
      await expect(
        new Handelsregister('offline').fetchOrganization({
          q: 'example',
          financialYears,
        }),
      ).rejects.toBeInstanceOf(ValidationError);
    },
  );

  it('rejects an unsupported statement type', async () => {
    await expect(
      new Handelsregister('offline').fetchOrganization({
        q: 'example',
        financialStatementType: 'invalid',
      } as unknown as SearchParams),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
