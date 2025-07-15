const { Handelsregister } = require('../dist');

async function main() {
  // Initialize client with API key
  const client = new Handelsregister(process.env.HANDELSREGISTER_API_KEY);

  try {
    // Simple search
    console.log('=== Simple Search ===');
    const basicData = await client.fetchOrganization('KONUX GmbH München');
    console.log('Company:', basicData.name);
    console.log('Legal Form:', basicData.legal_form);
    console.log('Status:', basicData.status);
    console.log('');

    // Search with additional features
    console.log('=== Search with Features ===');
    const detailedData = await client.fetchOrganization({
      q: 'OroraTech GmbH München',
      features: ['related_persons', 'financial_kpi', 'publications']
    });

    console.log('Company:', detailedData.name);
    console.log('Registration:', detailedData.register_number);
    
    // Display management
    if (detailedData.related_persons?.current) {
      console.log('\nCurrent Management:');
      detailedData.related_persons.current.forEach(person => {
        console.log(`  - ${person.name} (${person.role})`);
      });
    }

    // Display financial data
    if (detailedData.financial_kpi && detailedData.financial_kpi.length > 0) {
      console.log('\nFinancial KPIs:');
      const latestKpi = detailedData.financial_kpi[detailedData.financial_kpi.length - 1];
      console.log(`  Year: ${latestKpi.year}`);
      if (latestKpi.revenue) console.log(`  Revenue: €${latestKpi.revenue.toLocaleString()}`);
      if (latestKpi.employees) console.log(`  Employees: ${latestKpi.employees}`);
    }

    // Download a document
    console.log('\n=== Document Download ===');
    const entityId = detailedData.entity_id;
    console.log('Downloading shareholders list...');
    
    await client.fetchDocument(
      entityId,
      'shareholders_list',
      './shareholders.pdf'
    );
    console.log('Document saved to: ./shareholders.pdf');

  } catch (error) {
    console.error('Error:', error.message);
    if (error.statusCode) {
      console.error('Status Code:', error.statusCode);
    }
  }
}

// Run the example
main().catch(console.error);