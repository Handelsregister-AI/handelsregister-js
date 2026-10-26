// Explicit opt-in: one company, both report formats, up to 15 credits.
const assert = require('node:assert/strict');
const { Company, Handelsregister } = require('../dist');
require('dotenv').config({
  path: process.env.HANDELSREGISTER_ENV_FILE || '.env',
});

async function main() {
  if (process.env.HANDELSREGISTER_RUN_AUDIT_TESTS !== '1') {
    throw new Error(
      'Set HANDELSREGISTER_RUN_AUDIT_TESTS=1 to authorize the live audit test.',
    );
  }
  const company = new Company(
    '110fe0da2f84c8d3174ec7bfd1f0f15a',
    new Handelsregister(),
    {
      features: [
        'annual_financial_statements',
        'annual_financial_statements__html',
      ],
      financialYears: 5,
      aiSearch: false,
    },
  );
  const raw = await company.getRawData();
  const reports = company.annualFinancialStatements;
  assert(
    reports.length > 0 && company.annualFinancialStatementsHtml.length > 0,
  );
  assert.strictEqual(reports, raw.annual_financial_statements);
  const metadata = (row) =>
    Object.fromEntries(
      Object.entries(row).filter(
        ([key]) => key !== 'document_md' && key !== 'document_html',
      ),
    );
  assert.deepEqual(
    reports.map(metadata),
    company.annualFinancialStatementsHtml.map(metadata),
  );
  assert(reports.some((report) => report.audit != null));
  for (const report of reports) {
    assert(company.financialYears.includes(report.year));
    assert(
      company.getAnnualFinancialStatementsForYear(report.year).includes(report),
    );
  }
  console.log(
    JSON.stringify({
      status: 'passed',
      company: company.name,
      reports: reports.length,
      audits: reports.filter((report) => report.audit != null).length,
      request_credit_cost: company.requestCreditCost,
    }),
  );
}

main().catch((error) => {
  // Never print an SDK/network error object: it may contain request headers.
  console.error(
    JSON.stringify({
      status: 'failed',
      error_type: error.name,
      status_code: error.statusCode,
    }),
  );
  process.exitCode = 1;
});
