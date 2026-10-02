const { Company, Handelsregister } = require('handelsregister');
require('dotenv').config();

async function main() {
  const client = new Handelsregister(process.env.HANDELSREGISTER_API_KEY);
  const company = new Company(
    process.argv[2] || 'OroraTech GmbH München',
    client,
    {
      features: ['shareholders', 'shareholders_deep'],
    },
  );
  await company.getRawData();
  console.log('Registered capital:', company.capitalInfo);
  console.log('Regular shareholders:', company.shareholders);
  const deep = company.shareholdersDeep;
  if (!deep) {
    console.log(
      deep === null
        ? 'No current deep shareholder data.'
        : 'Deep shareholders were not returned; Max is required.',
    );
    return;
  }
  console.log('Source:', deep.record, 'Share capital:', deep.share_capital);
  for (const entry of deep.entries ?? []) {
    console.log(
      entry.holder?.name,
      entry.ownership?.percentage,
      entry.since,
      entry.ownership?.share_ranges,
    );
    if (entry.holder?.type === 'JOINT')
      console.log(
        'Co-owners (no individual percentage allocation):',
        entry.holder.members,
      );
  }
  console.log('History:', deep.history, 'Changes:', deep.changes);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
