const {
  Handelsregister,
  constructEvent,
  verificationResponseHeaders,
} = require('handelsregister');

async function inspectMonitoring() {
  const client = new Handelsregister();

  console.log(await client.getMonitoringPricing(7));
  console.log(await client.listMonitors());
  console.log(await client.listWebhookEndpoints());
  console.log(await client.listWebhookDeliveries());
  console.log(await client.listWebhookEvents());
}

function handleWebhook(rawBody, requestHeaders, signingSecret) {
  const event = constructEvent(rawBody, requestHeaders, signingSecret);
  if (event.type === 'endpoint.verification') {
    return { status: 204, headers: verificationResponseHeaders(event) };
  }

  // Delivery is at-least-once: deduplicate on event.id before processing.
  return { status: 204, headers: {} };
}

if (require.main === module) {
inspectMonitoring().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
}

module.exports = { handleWebhook };
