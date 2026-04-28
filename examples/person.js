// Person profile lookup with company context.
//
// Run:
//   HANDELSREGISTER_API_KEY=... node examples/person.js

const { Person } = require('..');

async function main() {
  const person = new Person(
    'Erika Mustermann',
    'Musterfirma GmbH',
    process.env.HANDELSREGISTER_API_KEY,
    { features: ['shareholdings'] },
  );

  await person.getRawData(); // triggers the request

  console.log(`Name:           ${person.name}`);
  console.log(`Entity ID:      ${person.entityId}`);
  console.log(`Birth date:     ${person.birthDate ?? '-'}`);
  console.log(`Home city:      ${person.homeCity ?? '-'}`);
  console.log(`Bio:            ${person.bio ?? '-'}`);

  if (person.handelsregisterRoles.length > 0) {
    console.log('\nHandelsregister roles:');
    person.handelsregisterRoles.forEach((r) => {
      console.log(
        `  - ${r.label || '?'} @ ${r.organization || '?'}${r.is_current ? ' (current)' : ''}`,
      );
    });
  }

  if (person.shareholdings?.current?.length) {
    console.log('\nCurrent shareholdings:');
    person.shareholdings.current.forEach((s) => {
      console.log(`  - ${s.organization_name}: ${s.percentage ?? '?'}%`);
    });
  }

  console.log(`\nCredits remaining: ${person.creditsRemaining ?? 'n/a'}`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
