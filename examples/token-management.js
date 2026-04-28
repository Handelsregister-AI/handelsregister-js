// Bearer token management: create, list, revoke.
//
// Run:
//   HANDELSREGISTER_API_KEY=... node examples/token-management.js
//
// Requires an account with token-management permission.

const { Handelsregister } = require('..');

async function main() {
  const client = new Handelsregister(process.env.HANDELSREGISTER_API_KEY);

  // 1) Create a new token
  const created = await client.createToken({
    tokenName: 'demo-token',
    abilities: ['*'],
    // expiresAt: '2027-01-01 00:00:00',
  });
  console.log('Created token payload:', JSON.stringify(created, null, 2));
  const newTokenId = created?.id ?? created?.token?.id;

  // 2) List tokens
  const list = await client.listTokens();
  const tokens = list.tokens || [];
  console.log(`\nYou have ${tokens.length} token(s):`);
  tokens.forEach((t) => {
    console.log(`  - id=${t.id}  name=${t.name ?? '-'}  expires=${t.expires_at ?? 'never'}`);
  });

  // 3) Revoke the one we just created (if we can find an id)
  if (newTokenId !== undefined) {
    await client.revokeToken(newTokenId);
    console.log(`\nRevoked token ${newTokenId}.`);
  } else {
    console.log('\nCould not determine the new token id; skipping revoke.');
  }

  // To revoke ALL tokens at once (irreversible):
  //   await client.revokeAllTokens();
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
