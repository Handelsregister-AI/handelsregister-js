import { Handelsregister } from './client';
import { 
  CompanyData, 
  SearchParams, 
  Feature, 
  DocumentType,
  RelatedPerson,
  FinancialKPI,
  BalanceSheetAccount,
  ProfitLossAccount,
  Publication
} from './types';
import { HandelsregisterConfig } from './types';

export class Company {
  private client: Handelsregister;
  private data?: CompanyData;
  private searchQuery: string;
  private features?: Feature[];

  constructor(
    searchQuery: string,
    configOrClient?: HandelsregisterConfig | string | Handelsregister,
    options?: { features?: Feature[] }
  ) {
    this.searchQuery = searchQuery;
    this.features = options?.features;

    if (configOrClient instanceof Handelsregister) {
      this.client = configOrClient;
    } else {
      this.client = new Handelsregister(configOrClient || process.env.HANDELSREGISTER_API_KEY || '');
    }
  }

  private async ensureData(): Promise<CompanyData> {
    if (!this.data) {
      this.data = await this.client.fetchOrganization({
        q: this.searchQuery,
        features: this.features
      });
    }
    return this.data;
  }

  async refresh(): Promise<void> {
    this.data = undefined;
    await this.ensureData();
  }

  // Basic properties
  async getId(): Promise<string> {
    const data = await this.ensureData();
    return data.entity_id;
  }

  get entityId(): string {
    return this.data?.entity_id || '';
  }

  async getName(): Promise<string> {
    const data = await this.ensureData();
    return data.name;
  }

  get name(): string {
    return this.data?.name || '';
  }

  async getStatus(): Promise<string | undefined> {
    const data = await this.ensureData();
    return data.status;
  }

  get status(): string | undefined {
    return this.data?.status;
  }

  async getPurpose(): Promise<string | undefined> {
    const data = await this.ensureData();
    return data.purpose;
  }

  get purpose(): string | undefined {
    return this.data?.purpose;
  }

  // Registration information
  async getCourt(): Promise<string | undefined> {
    const data = await this.ensureData();
    return data.court || data.registration?.court;
  }

  get court(): string | undefined {
    return this.data?.court || this.data?.registration?.court;
  }

  async getRegisterType(): Promise<string | undefined> {
    const data = await this.ensureData();
    return data.register_type || data.registration?.register_type;
  }

  get registerType(): string | undefined {
    return this.data?.register_type || this.data?.registration?.register_type;
  }

  async getRegisterNumber(): Promise<string | undefined> {
    const data = await this.ensureData();
    return data.registration?.register_number || data.register_number;
  }

  get registerNumber(): string | undefined {
    return this.data?.registration?.register_number || this.data?.register_number;
  }

  get registrationNumber(): string | undefined {
    return this.registerNumber;
  }

  async getRegisterDate(): Promise<string | undefined> {
    const data = await this.ensureData();
    return data.register_date || data.registration?.register_date;
  }

  get registerDate(): string | undefined {
    return this.data?.register_date || this.data?.registration?.register_date;
  }

  async getLegalForm(): Promise<string | undefined> {
    const data = await this.ensureData();
    return data.legal_form;
  }

  get legalForm(): string | undefined {
    return this.data?.legal_form;
  }

  // Address information
  async getAddress(): Promise<string | undefined> {
    const data = await this.ensureData();
    if (!data.address) return undefined;
    
    const parts = [
      data.address.street,
      data.address.postal_code,
      data.address.city,
      data.address.country_code
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(', ') : undefined;
  }

  get address(): string | undefined {
    if (!this.data?.address) return undefined;
    
    const parts = [
      this.data.address.street,
      this.data.address.postal_code,
      this.data.address.city,
      this.data.address.country_code
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(', ') : undefined;
  }

  get street(): string | undefined {
    return this.data?.address?.street;
  }

  get postalCode(): string | undefined {
    return this.data?.address?.postal_code;
  }

  get city(): string | undefined {
    return this.data?.address?.city;
  }

  get countryCode(): string | undefined {
    return this.data?.address?.country_code;
  }

  get coordinates(): { lat: number; lon: number } | undefined {
    return this.data?.address?.coordinates;
  }

  // Contact information
  get website(): string | undefined {
    return this.data?.website;
  }

  get phoneNumber(): string | undefined {
    return this.data?.phone_number;
  }

  get email(): string | undefined {
    return this.data?.email;
  }

  // Business information
  get keywords(): string[] | undefined {
    return this.data?.keywords;
  }

  get productsAndServices(): string | undefined {
    return this.data?.products_and_services;
  }

  get industryClassification(): string | undefined {
    return this.data?.industry_classification;
  }

  get wz2008Codes(): string[] | undefined {
    return this.data?.wz2008_codes;
  }

  // Related persons
  async getRelatedPersons(type?: 'current' | 'past'): Promise<RelatedPerson[]> {
    const data = await this.ensureData();
    if (!data.related_persons) return [];

    if (type === 'current') {
      return data.related_persons.current || [];
    } else if (type === 'past') {
      return data.related_persons.past || [];
    }

    // Return all if no type specified
    return [
      ...(data.related_persons.current || []),
      ...(data.related_persons.past || [])
    ];
  }

  get currentRelatedPersons(): RelatedPerson[] {
    return this.data?.related_persons?.current || [];
  }

  get pastRelatedPersons(): RelatedPerson[] {
    return this.data?.related_persons?.past || [];
  }

  getRelatedPersonsByRole(role: string): RelatedPerson[] {
    const allPersons = [
      ...(this.data?.related_persons?.current || []),
      ...(this.data?.related_persons?.past || [])
    ];
    
    return allPersons.filter(person => {
      const personRole = typeof person.role === 'string' 
        ? person.role 
        : person.role?.designation || '';
      return personRole.toLowerCase().includes(role.toLowerCase());
    });
  }

  // Financial data
  async getFinancialKPIs(year?: number): Promise<FinancialKPI[]> {
    const data = await this.ensureData();
    if (!data.financial_kpi) return [];

    if (year !== undefined) {
      return data.financial_kpi.filter(kpi => kpi.year === year);
    }

    return data.financial_kpi;
  }

  get financialKPIs(): FinancialKPI[] {
    return this.data?.financial_kpi || [];
  }

  getFinancialKPIByYear(year: number): FinancialKPI | undefined {
    return this.data?.financial_kpi?.find(kpi => kpi.year === year);
  }

  get latestFinancialKPI(): FinancialKPI | undefined {
    if (!this.data?.financial_kpi || this.data.financial_kpi.length === 0) {
      return undefined;
    }
    
    return this.data.financial_kpi.reduce((latest, current) => 
      current.year > latest.year ? current : latest
    );
  }

  async getBalanceSheets(year?: number): Promise<BalanceSheetAccount[]> {
    const data = await this.ensureData();
    if (!data.balance_sheet_accounts) return [];

    if (year !== undefined) {
      return data.balance_sheet_accounts.filter(sheet => sheet.year === year);
    }

    return data.balance_sheet_accounts;
  }

  get balanceSheets(): BalanceSheetAccount[] {
    return this.data?.balance_sheet_accounts || [];
  }

  async getProfitLossAccounts(year?: number): Promise<ProfitLossAccount[]> {
    const data = await this.ensureData();
    if (!data.profit_and_loss_account) return [];

    if (year !== undefined) {
      return data.profit_and_loss_account.filter(account => account.year === year);
    }

    return data.profit_and_loss_account;
  }

  get profitLossAccounts(): ProfitLossAccount[] {
    return this.data?.profit_and_loss_account || [];
  }

  // Publications
  async getPublications(): Promise<Publication[]> {
    const data = await this.ensureData();
    return data.publications || [];
  }

  get publications(): Publication[] {
    return this.data?.publications || [];
  }

  // Meta information
  get requestCreditCost(): number | undefined {
    return this.data?.meta?.request_credit_cost;
  }

  get creditsRemaining(): number | undefined {
    return this.data?.meta?.credits_remaining;
  }

  // Document fetching
  async fetchDocument(documentType: DocumentType, outputFile?: string): Promise<Buffer> {
    const entityId = await this.getId();
    return this.client.fetchDocument(entityId, documentType, outputFile);
  }

  // Raw data access
  async getRawData(): Promise<CompanyData> {
    return await this.ensureData();
  }

  get rawData(): CompanyData | undefined {
    return this.data;
  }

  // Utility methods
  toJSON(): CompanyData | undefined {
    return this.data;
  }

  toString(): string {
    if (!this.data) {
      return `Company(${this.searchQuery}) - not loaded`;
    }
    return `Company(${this.data.name}) - ${this.data.legal_form || 'Unknown'} - ${this.data.status || 'Unknown status'}`;
  }
}