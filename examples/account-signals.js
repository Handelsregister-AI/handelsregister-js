const { Handelsregister, SignalTopic } = require('handelsregister');

async function main() {
  const client = new Handelsregister();

  const account = await client.getAccount();
  const credits = await client.getAccountCredits();
  const catalog = await client.getSignalCatalog();

  console.log('Account', account);
  console.log('Credits', credits);
  console.log('Signal catalog', catalog);

  for await (const signal of client.iterateSignals({
    topics: [SignalTopic.NEW_REGISTRATIONS],
    maxResults: 20,
  })) {
    console.log(signal.event.id, signal.organization?.entity_id);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
