// Explicit opt-in: these requests spend credits. Never run this script in CI.
const assert = require('node:assert/strict');
const dotenv = require('dotenv');
const {
  Company,
  Handelsregister,
  walkFinancialAccounts,
  financialAccountName,
} = require('../dist');

dotenv.config({ path: process.env.HANDELSREGISTER_ENV_FILE || '.env' });

async function main() {
  if (process.env.HANDELSREGISTER_RUN_LIVE_FEATURE_TESTS !== '1') {
    throw new Error(
      'Set HANDELSREGISTER_RUN_LIVE_FEATURE_TESTS=1 to authorize billable live tests.',
    );
  }
  const nonmax = process.argv.includes('--nonmax');
  const client = new Handelsregister({
    apiKey: process.env.HANDELSREGISTER_API_KEY,
    baseUrl:
      process.env.HANDELSREGISTER_BASE_URL ||
      'https://dev.handelsregister.ai/api/v1/',
    cacheEnabled: false,
    timeout: 180000,
    extraHeaders:
      process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET
        ? {
            'CF-Access-Client-Id': process.env.CF_ACCESS_CLIENT_ID,
            'CF-Access-Client-Secret': process.env.CF_ACCESS_CLIENT_SECRET,
          }
        : undefined,
  });
  const account = await client.getAccountSubscription();
  const plan = account.subscription?.plan ?? account.plan;
  assert(nonmax ? plan !== 'max' : plan === 'max', 'Unexpected account tier');
  const financial = [
    'financial_kpi',
    'balance_sheet_accounts',
    'profit_and_loss_account',
  ];
  const ownership = ['shareholders', 'shareholders_deep'];
  const cases = nonmax
    ? [
        ['Stadtwerke Münster GmbH', [...ownership, ...financial]],
        ['OroraTech GmbH München', [...ownership, ...financial]],
      ]
    : [
        ['Stadtwerke Bad Pyrmont GmbH', financial],
        ['Stadtwerke Münster GmbH', financial],
        ['Stadtwerke Bielefeld GmbH', financial],
        ['110fe0da2f84c8d3174ec7bfd1f0f15a', ownership],
        ['OroraTech GmbH München', ownership],
      ];
  let totalCredits = 0;
  for (const [query, features] of cases) {
    const company = new Company(query, client, { features, aiSearch: false });
    const data = await company.getRawData();
    let activityCount = 0;
    let nodeCount = 0;
    for (const row of [
      ...company.balanceSheets,
      ...company.profitLossAccounts,
    ]) {
      assert(row._provenance, 'Missing financial provenance');
      for (const activity of row.activity_statements ?? []) {
        activityCount++;
        assert(financialAccountName(activity.activity?.name));
        assert(activity._provenance);
        for (const node of walkFinancialAccounts(
          activity.balance_sheet_accounts ?? activity.profit_and_loss_accounts,
        )) {
          nodeCount++;
          assert(financialAccountName(node.name));
        }
      }
    }
    if (nonmax) {
      assert(
        !Object.hasOwn(data, 'shareholders_deep'),
        'Deep shareholders must be omitted on non-Max',
      );
      assert.equal(activityCount, 0);
    } else if (features.includes('shareholders_deep')) {
      assert(company.shareholders?.entries?.length);
      assert(company.shareholdersDeep?.entries?.length);
    } else {
      assert(
        activityCount > 0 && nodeCount > 0,
        'Expected real activity statements',
      );
    }
    totalCredits += company.requestCreditCost ?? 0;
    console.log(
      JSON.stringify({
        company: company.name,
        activity_statements: activityCount,
        activity_account_nodes: nodeCount,
        deep_rows: company.shareholdersDeep?.entries?.length ?? 0,
        request_credit_cost: company.requestCreditCost,
        status: 'passed',
      }),
    );
  }
  console.log(
    JSON.stringify({
      companies: cases.length,
      total_credits: totalCredits,
      status: 'passed',
    }),
  );
}

main().catch((error) => {
  // SDK/network errors may retain request headers; never print the error object.
  console.error(
    JSON.stringify({
      status: 'failed',
      error_type: error.name,
      status_code: error.statusCode,
    }),
  );
  process.exitCode = 1;
});
