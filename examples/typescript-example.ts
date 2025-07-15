import { 
  Handelsregister, 
  Company, 
  CompanyData, 
  SearchParams,
  Feature,
  FinancialKPI,
  RelatedPerson,
  HandelsregisterError,
  AuthenticationError
} from '../src';

async function demonstrateTypeScript(): Promise<void> {
  // Initialize with configuration
  const client = new Handelsregister({
    apiKey: process.env.HANDELSREGISTER_API_KEY || '',
    timeout: 60000,
    cacheEnabled: true,
    rateLimit: 0.5
  });

  try {
    // Type-safe search parameters
    const searchParams: SearchParams = {
      q: 'Porsche AG Stuttgart',
      features: ['financial_kpi', 'related_persons', 'balance_sheet_accounts'],
      aiSearch: 'on'
    };

    // Fetch with full type inference
    const companyData: CompanyData = await client.fetchOrganization(searchParams);

    // Access typed properties
    console.log('=== Company Information ===');
    console.log(`Name: ${companyData.name}`);
    console.log(`Entity ID: ${companyData.entity_id}`);
    console.log(`Legal Form: ${companyData.legal_form || 'N/A'}`);

    // Work with typed arrays
    if (companyData.financial_kpi) {
      const latestYear: FinancialKPI | undefined = companyData.financial_kpi
        .sort((a, b) => b.year - a.year)[0];

      if (latestYear) {
        console.log(`\nLatest Financial Year: ${latestYear.year}`);
        console.log(`Revenue: €${latestYear.revenue?.toLocaleString() || 'N/A'}`);
        console.log(`Employees: ${latestYear.employees || 'N/A'}`);
      }
    }

    // Filter typed person data
    if (companyData.related_persons?.current) {
      const executives: RelatedPerson[] = companyData.related_persons.current
        .filter(person => person.role.includes('Vorstand'));

      console.log('\nBoard Members:');
      executives.forEach(exec => {
        console.log(`- ${exec.name}`);
      });
    }

    // Using Company class with type safety
    await demonstrateCompanyClass();

    // Error handling with specific types
    await demonstrateErrorHandling(client);

  } catch (error) {
    if (error instanceof AuthenticationError) {
      console.error('Authentication failed:', error.message);
    } else if (error instanceof HandelsregisterError) {
      console.error(`API Error (${error.statusCode}):`, error.message);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

async function demonstrateCompanyClass(): Promise<void> {
  console.log('\n=== Company Class Demo ===');
  
  const company = new Company(
    'SAP SE Walldorf',
    process.env.HANDELSREGISTER_API_KEY || ''
  );

  // Type-safe property access
  const name: string = await company.getName();
  const registrationNumber: string | undefined = company.registerNumber;
  
  console.log(`Company: ${name}`);
  console.log(`Registration: ${registrationNumber || 'N/A'}`);

  // Get typed financial data
  const kpis: FinancialKPI[] = await company.getFinancialKPIs();
  const latestKPI: FinancialKPI | undefined = company.latestFinancialKPI;

  if (latestKPI) {
    console.log(`Latest Revenue: €${latestKPI.revenue?.toLocaleString() || 'N/A'}`);
  }

  // Filter persons by role with type safety
  const directors: RelatedPerson[] = company.getRelatedPersonsByRole('Geschäftsführer');
  console.log(`Directors found: ${directors.length}`);
}

async function demonstrateErrorHandling(client: Handelsregister): Promise<void> {
  console.log('\n=== Error Handling Demo ===');
  
  try {
    // This will throw a ValidationError
    await client.fetchOrganization('');
  } catch (error) {
    if (error instanceof HandelsregisterError) {
      console.log(`Caught ${error.name}: ${error.message}`);
    }
  }

  try {
    // Test with invalid document type (TypeScript will catch this at compile time)
    // await client.fetchDocument('entity123', 'invalid_type' as any);
    
    // Valid call
    await client.fetchDocument('entity123', 'AD');
  } catch (error) {
    console.log('Document fetch error handled');
  }
}

// Define custom type guards
function hasFinancialData(data: CompanyData): data is CompanyData & { 
  financial_kpi: FinancialKPI[] 
} {
  return Array.isArray(data.financial_kpi) && data.financial_kpi.length > 0;
}

function hasRelatedPersons(data: CompanyData): data is CompanyData & {
  related_persons: { current: RelatedPerson[]; past?: RelatedPerson[] }
} {
  return data.related_persons !== undefined && 
         Array.isArray(data.related_persons.current);
}

// Run the demonstration
demonstrateTypeScript().catch(console.error);