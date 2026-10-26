import { isDeepStrictEqual } from 'node:util';
import type { AnnualFinancialStatement, CompanyData } from './types.js';

/** Internal readers retain original report objects and the legacy HTML alias. */
export function annualReports(
  data?: CompanyData,
  html = false,
): AnnualFinancialStatement[] {
  const payload = html
    ? (data?.annual_financial_statements__html ??
      data?.annual_financial_statements_html)
    : data?.annual_financial_statements;
  if (!Array.isArray(payload)) return [];
  const rows = payload.filter(
    (row) => row !== null && typeof row === 'object' && !Array.isArray(row),
  );
  return rows.length === payload.length ? payload : rows;
}

export function annualReportMetadata(
  report: AnnualFinancialStatement,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(report).filter(
      ([key]) => key !== 'document_md' && key !== 'document_html',
    ),
  );
}

/** Remove only matching HTML copies; keep distinct and repeated documents. */
export function annualReportsForDisplay(
  data: CompanyData,
): AnnualFinancialStatement[] {
  const markdown = annualReports(data);
  const unmatched = markdown.map(annualReportMetadata);
  const reports = [...markdown];
  for (const report of annualReports(data, true)) {
    const metadata = annualReportMetadata(report);
    const index = unmatched.findIndex((candidate) =>
      isDeepStrictEqual(candidate, metadata),
    );
    if (index >= 0) unmatched.splice(index, 1);
    else reports.push(report);
  }
  return reports;
}

/** Compact columns for tabular enrichment, including explicit null audits. */
export function annualAuditColumns(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload))
    return {};
  const data = payload as CompanyData;
  const columns: Record<string, unknown> = {};
  for (const [feature, html] of [
    ['annual_financial_statements', false],
    ['annual_financial_statements__html', true],
  ] as const) {
    const metadata = annualReports(data, html)
      .filter((report) => Object.prototype.hasOwnProperty.call(report, 'audit'))
      .map(annualReportMetadata);
    if (metadata.length) columns[`hr_${feature}_audit`] = metadata;
  }
  return columns;
}
