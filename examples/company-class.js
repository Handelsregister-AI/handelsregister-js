const { Company } = require('../dist');

async function main() {
  // Initialize Company instance
  const company = new Company(
    'BMW AG München',
    process.env.HANDELSREGISTER_API_KEY,
    { features: ['related_persons', 'financial_kpi', 'balance_sheet_accounts'] }
  );

  try {
    // Access basic properties (triggers API call on first access)
    console.log('=== Basic Information ===');
    console.log('Name:', await company.getName());
    console.log('Entity ID:', await company.getId());
    console.log('Legal Form:', await company.getLegalForm());
    console.log('Status:', await company.getStatus());
    console.log('');

    // After the first API call, properties can be accessed synchronously
    console.log('=== Registration Details ===');
    console.log('Court:', company.court);
    console.log('Register Type:', company.registerType);
    console.log('Register Number:', company.registerNumber);
    console.log('Register Date:', company.registerDate);
    console.log('');

    // Address information
    console.log('=== Address ===');
    console.log('Full Address:', company.address);
    console.log('Street:', company.street);
    console.log('Postal Code:', company.postalCode);
    console.log('City:', company.city);
    console.log('');

    // Contact information
    console.log('=== Contact ===');
    console.log('Website:', company.website || 'N/A');
    console.log('Phone:', company.phoneNumber || 'N/A');
    console.log('Email:', company.email || 'N/A');
    console.log('');

    // Related persons
    console.log('=== Management ===');
    const currentManagement = company.currentRelatedPersons;
    if (currentManagement.length > 0) {
      console.log('Current Management:');
      currentManagement.slice(0, 5).forEach(person => {
        console.log(`  - ${person.name} (${person.role})`);
      });
    }

    // Find specific roles
    const ceos = company.getRelatedPersonsByRole('Vorstand');
    if (ceos.length > 0) {
      console.log('\nBoard Members:');
      ceos.forEach(person => {
        console.log(`  - ${person.name}`);
      });
    }
    console.log('');

    // Financial data
    console.log('=== Financial Information ===');
    const latestKPI = company.latestFinancialKPI;
    if (latestKPI) {
      console.log(`Latest Financial Year: ${latestKPI.year}`);
      if (latestKPI.revenue) console.log(`Revenue: €${latestKPI.revenue.toLocaleString()}`);
      if (latestKPI.profit) console.log(`Profit: €${latestKPI.profit.toLocaleString()}`);
      if (latestKPI.employees) console.log(`Employees: ${latestKPI.employees}`);
    }

    // Historical financial data
    const kpi2022 = company.getFinancialKPIByYear(2022);
    if (kpi2022) {
      console.log(`\n2022 Financial Data:`);
      if (kpi2022.revenue) console.log(`Revenue: €${kpi2022.revenue.toLocaleString()}`);
      if (kpi2022.profit) console.log(`Profit: €${kpi2022.profit.toLocaleString()}`);
    }

    // Balance sheet data
    const balanceSheets = company.balanceSheets;
    if (balanceSheets.length > 0) {
      console.log(`\nBalance Sheet Years Available: ${balanceSheets.map(bs => bs.year).join(', ')}`);
    }

    // API usage info
    console.log('\n=== API Usage ===');
    console.log('Credits Used:', company.requestCreditCost || 'N/A');
    console.log('Credits Remaining:', company.creditsRemaining || 'N/A');

    // Fetch a document
    console.log('\n=== Document Download ===');
    console.log('Downloading current excerpt (AD)...');
    await company.fetchDocument('AD', './bmw_current_excerpt.pdf');
    console.log('Document saved successfully!');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the example
main().catch(console.error);