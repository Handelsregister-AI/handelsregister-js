const { Handelsregister } = require('../dist');
const fs = require('fs');
const path = require('path');

async function main() {
  // Create sample data files for demonstration
  await createSampleFiles();

  const client = new Handelsregister(process.env.HANDELSREGISTER_API_KEY);

  try {
    // Example 1: Enrich JSON file
    console.log('=== Enriching JSON File ===');
    const jsonResult = await client.enrich({
      filePath: './sample_companies.json',
      inputType: 'json',
      queryProperties: {
        name: 'company_name',
        location: 'city'
      },
      snapshotDir: './snapshots',
      params: {
        features: ['financial_kpi', 'related_persons']
      }
    });

    console.log(`Processed: ${jsonResult.processedCount} companies`);
    console.log(`Errors: ${jsonResult.errorCount}`);
    console.log(`Output saved to: ${jsonResult.outputPath}\n`);

    // Example 2: Enrich CSV file
    console.log('=== Enriching CSV File ===');
    const csvResult = await client.enrich({
      filePath: './sample_companies.csv',
      inputType: 'csv',
      queryProperties: {
        company_name: 'name',
        city: 'location'
      },
      snapshotDir: './snapshots',
      snapshotInterval: 5,
      params: {
        features: ['financial_kpi']
      }
    });

    console.log(`Processed: ${csvResult.processedCount} companies`);
    console.log(`Errors: ${csvResult.errorCount}`);
    console.log(`Output saved to: ${csvResult.outputPath}\n`);

    // Display enriched data sample
    console.log('=== Sample Enriched Data ===');
    const enrichedData = JSON.parse(
      fs.readFileSync('./sample_companies_enriched.json', 'utf-8')
    );

    const firstCompany = enrichedData[0];
    console.log(`Original company name: ${firstCompany.company_name}`);
    if (firstCompany.handelsregister_data) {
      console.log(`Matched company: ${firstCompany.handelsregister_data.name}`);
      console.log(`Legal form: ${firstCompany.handelsregister_data.legal_form}`);
      console.log(`Registration: ${firstCompany.handelsregister_data.register_number}`);
      
      const latestKPI = firstCompany.handelsregister_data.financial_kpi?.slice(-1)[0];
      if (latestKPI) {
        console.log(`Latest revenue: €${latestKPI.revenue?.toLocaleString() || 'N/A'}`);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    // Cleanup sample files
    cleanupSampleFiles();
  }
}

async function createSampleFiles() {
  // Create sample JSON file
  const jsonData = [
    {
      company_name: "KONUX GmbH",
      city: "München",
      industry: "Technology"
    },
    {
      company_name: "OroraTech GmbH",
      city: "München",
      industry: "Space Technology"
    },
    {
      company_name: "Lilium GmbH",
      city: "Wessling",
      industry: "Aviation"
    }
  ];

  fs.writeFileSync('./sample_companies.json', JSON.stringify(jsonData, null, 2));

  // Create sample CSV file
  const csvContent = `company_name,city,industry
"BMW AG","München","Automotive"
"Siemens AG","München","Technology"
"Allianz SE","München","Insurance"
`;

  fs.writeFileSync('./sample_companies.csv', csvContent);

  // Create snapshots directory
  if (!fs.existsSync('./snapshots')) {
    fs.mkdirSync('./snapshots');
  }
}

function cleanupSampleFiles() {
  // Remove created files
  const filesToRemove = [
    './sample_companies.json',
    './sample_companies.csv',
    './sample_companies_enriched.json',
    './sample_companies_enriched.csv'
  ];

  filesToRemove.forEach(file => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  });

  // Remove snapshots directory
  if (fs.existsSync('./snapshots')) {
    fs.rmSync('./snapshots', { recursive: true, force: true });
  }
}

// Run the example
main().catch(console.error);