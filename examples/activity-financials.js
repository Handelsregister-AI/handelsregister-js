const {
  Company,
  Handelsregister,
  financialAccountName,
  walkFinancialAccounts,
} = require('handelsregister');
require('dotenv').config();

async function main() {
  const client = new Handelsregister(process.env.HANDELSREGISTER_API_KEY);
  const company = new Company(
    process.argv[2] || 'Stadtwerke Bad Pyrmont GmbH',
    client,
    {
      features: ['balance_sheet_accounts', 'profit_and_loss_account'],
    },
  );
  await company.getRawData();
  const year = Number(process.argv[3] || 2023);
  console.log(
    'Balance-sheet source (all plans):',
    company.getBalanceSheetForYear(year)?._provenance,
  );
  console.log(
    'P&L source (all plans):',
    company.getProfitLossAccountForYear(year)?._provenance,
  );
  const balance = company.getActivityBalanceSheetsForYear(year);
  const pnl = company.getActivityProfitLossAccountsForYear(year);
  for (const activity of [...balance, ...pnl]) {
    console.log(
      financialAccountName(activity.activity?.name),
      activity._provenance,
    );
    for (const node of walkFinancialAccounts(
      activity.balance_sheet_accounts ?? activity.profit_and_loss_accounts,
    )) {
      console.log(financialAccountName(node.name), node.value);
    }
  }
  if (!balance.length && !pnl.length)
    console.log(
      'No activity statements for this year; Max is required for activity data.',
    );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
