// Run from a built checkout: npm run build && node examples/audits.js
const { Company, Handelsregister } = require('../dist');
require('dotenv').config();

async function main() {
  const company = new Company(
    process.argv[2] || 'KONUX GmbH',
    new Handelsregister(),
    {
      features: ['annual_financial_statements'],
      financialYears: 5,
      aiSearch: false,
    },
  );
  await company.getRawData();
  const year = process.argv[3]
    ? Number(process.argv[3])
    : company.financialYears[0];
  const reports = company.getAnnualFinancialStatementsForYear(year);
  if (!reports.length)
    console.log('No annual reports returned for the selected year.');
  for (const report of reports) {
    console.log(`${company.name}: ${report.year} / ${report.document_type}`);
    console.log(
      `Report: ${report.document_title} (published ${report.document_date})`,
    );
    const audit = report.audit;
    if (audit == null) {
      console.log('Audit information: not available');
      continue;
    }
    console.log(
      `Audit: ${audit.kind}, subject: ${audit.subject}, audited: ${audit.audited ?? 'unknown'}`,
    );
    console.log(
      `Accounting framework: ${audit.accounting_framework ?? 'unknown'}`,
    );
    if (audit.auditor) {
      const auditor = audit.auditor;
      console.log(
        `Auditor: ${auditor.name ?? 'Name not available'} (${auditor.type})`,
      );
      if (auditor.entity_id)
        console.log(`Auditor entity ID: ${auditor.entity_id}`);
      if (auditor.network)
        console.log(
          `Network: ${auditor.network.name} (${auditor.network.key})`,
        );
      for (const signer of auditor.signatories ?? []) {
        const name = [signer.academic_title, signer.name]
          .filter(Boolean)
          .join(' ');
        console.log(
          `Signatory: ${name}, qualification: ${signer.qualification ?? 'unknown'}`,
        );
      }
    }
    if (audit.signed)
      console.log(
        `Signed: ${audit.signed.place ?? 'unknown'}, ${audit.signed.date ?? 'unknown'}`,
      );
  }
}

main().catch((error) => {
  // Network errors may retain credentials in request headers.
  console.error(
    `Audit lookup failed (${error.name}, status ${error.statusCode ?? 'unknown'})`,
  );
  process.exitCode = 1;
});
