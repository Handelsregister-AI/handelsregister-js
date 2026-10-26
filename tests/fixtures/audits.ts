import type { AnnualFinancialStatement, CompanyData } from '../../src';

/** Synthetic documents; shapes match the live firm/individual audit responses. */
export function auditFixture(): CompanyData {
  const report: AnnualFinancialStatement = {
    year: 2024,
    document_type: 'Jahresabschluss',
    document_title: 'Annual report 2024',
    document_date: '2026-01-05',
    language: 'Deutsch',
    document_md: '# Synthetic report',
    future_report_field: 'retained',
    audit: {
      kind: 'AUDIT_REPORT',
      subject: 'OWN',
      audited: true,
      accounting_framework: 'HGB',
      auditor: {
        name: 'Example Audit GmbH',
        type: 'FIRM',
        entity_id: null,
        network: { key: 'EXAMPLE', name: 'Example Network', future: 1 },
        signatories: [
          {
            name: 'Müller',
            academic_title: 'Dr.',
            qualification: 'WP',
            future: 2,
          },
          { name: 'Schmidt', academic_title: null, qualification: 'WP' },
        ],
        future: 3,
      },
      signed: { place: 'Köln', date: '2025-05-26', future: 4 },
      future: 5,
    },
  };
  const group = structuredClone(report);
  group.document_type = 'Konzernabschluss';
  group.document_title = 'Group report 2024';
  group.audit!.accounting_framework = 'IFRS';
  const individual = structuredClone(report);
  individual.year = 2023;
  individual.document_title = 'Annual report 2023';
  Object.assign(individual.audit!.auditor!, {
    name: null,
    type: 'INDIVIDUAL_AUDITORS',
    network: null,
  });
  const absent = {
    ...report,
    year: 2022,
    document_title: 'Annual report 2022',
    audit: null,
  };
  const legacy = {
    ...report,
    year: 2021,
    document_title: 'Legacy report 2021',
  };
  delete legacy.audit;
  const reports = [report, group, individual, absent, legacy];
  return {
    entity_id: 'example',
    name: 'Example company',
    annual_financial_statements: reports,
    annual_financial_statements__html: reports.map((row) => {
      const html = structuredClone(row);
      delete html.document_md;
      html.document_html = '<h1>Synthetic report</h1>';
      return html;
    }),
  };
}
