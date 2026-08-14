// Paginated search with optional filters.
//
// Run:
//   HANDELSREGISTER_API_KEY=... node examples/search.js

const {
  Handelsregister,
  OrganizationStatus,
  OwnershipStructure,
  SearchSort,
  SortOrder,
} = require('..');

async function main() {
  const client = new Handelsregister(process.env.HANDELSREGISTER_API_KEY);

  const result = await client.searchOrganizations({
    // q may be omitted when filters are present.
    limit: 5,
    filters: {
      postal_code: '80331',
      legal_form_code: 'GmbH',
      status: OrganizationStatus.ACTIVE,
      pl_revenue: { gte: 1_000_000 },
      ownership_filters: {
        structure: { eq: OwnershipStructure.FAMILY },
        owner_managed: true,
      },
    },
    sort: SearchSort.REVENUE,
    order: SortOrder.DESC,
    matchContext: true,
  });

  console.log(`Found ${result.total} matching companies (showing ${result.results.length}):\n`);
  result.results.forEach((r, i) => {
    const reg = r.registration || {};
    const addr = r.address || {};
    console.log(
      `${i + 1}. ${r.name}` +
        `\n   ${reg.court || ''} ${reg.register_number || ''}` +
        `\n   ${[addr.street, addr.postal_code, addr.city].filter(Boolean).join(', ')}\n`,
    );
  });

  if (result.meta) {
    console.log(`Credit cost: ${result.meta.request_credit_cost ?? 'n/a'}`);
    console.log(`Credits remaining: ${result.meta.credits_remaining ?? 'n/a'}`);
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
