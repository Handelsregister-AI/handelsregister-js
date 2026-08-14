import { Handelsregister } from './client.js';
import {
  CompanyData,
  AiSearchMode,
  RealtimeMode,
  Feature,
  DocumentType,
  RelatedPerson,
  FinancialKPI,
  BalanceSheetAccount,
  ProfitLossAccount,
  Publication,
  ShareholderInfo,
  UBOInfo,
  ShareholdingsInfo,
  NewsItem,
  InsolvencyPublication,
  WebsiteContent,
  Coordinates,
  RepresentationScheme,
  MergersAndAcquisitionsInfo,
  OrganizationNetwork,
  AnnualFinancialStatement,
} from './types.js';
import { HandelsregisterConfig } from './types.js';

export interface CompanyOptions {
  features?: Feature[];
  aiSearch?: AiSearchMode | boolean;
  realtimeMode?: RealtimeMode | boolean;
}

export class Company {
  private client: Handelsregister;
  private data?: CompanyData;
  private searchQuery: string;
  private features?: Feature[];
  private aiSearch?: AiSearchMode | boolean;
  private realtimeMode?: RealtimeMode | boolean;

  constructor(
    searchQuery: string,
    configOrClient?: HandelsregisterConfig | string | Handelsregister,
    options?: CompanyOptions,
  ) {
    this.searchQuery = searchQuery;
    this.features = options?.features;
    this.aiSearch = options?.aiSearch;
    this.realtimeMode = options?.realtimeMode;

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
        features: this.features,
        aiSearch: this.aiSearch,
        realtimeMode: this.realtimeMode,
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

    const streetLine = [data.address.street, data.address.house_number]
      .filter(Boolean)
      .join(' ');
    const parts = [
      streetLine || undefined,
      data.address.postal_code,
      data.address.city,
      data.address.country || data.address.country_code
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(', ') : undefined;
  }

  get address(): string | undefined {
    if (!this.data?.address) return undefined;

    const streetLine = [
      this.data.address.street,
      this.data.address.house_number,
    ]
      .filter(Boolean)
      .join(' ');
    const parts = [
      streetLine || undefined,
      this.data.address.postal_code,
      this.data.address.city,
      this.data.address.country || this.data.address.country_code
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
    return this.data?.address?.country_code || this.data?.address?.country;
  }

  get coordinates(): Coordinates | undefined {
    return this.data?.address?.coordinates;
  }

  // Contact information
  get website(): string | undefined {
    return this.data?.contact_data?.website || this.data?.website;
  }

  get phoneNumber(): string | undefined {
    return this.data?.contact_data?.phone_number || this.data?.phone_number;
  }

  get email(): string | undefined {
    return this.data?.contact_data?.email || this.data?.email;
  }

  get representationScheme(): RepresentationScheme | undefined {
    return this.data?.representation_scheme;
  }

  async getRepresentationScheme(): Promise<
    RepresentationScheme | undefined
  > {
    return (await this.ensureData()).representation_scheme;
  }

  // Business information
  get keywords(): string[] | undefined {
    return this.data?.keywords;
  }

  get productsAndServices(): string | undefined {
    return this.data?.products_and_services;
  }

  get industryClassification(): string | Record<string, unknown> | undefined {
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
      const personRole = this.getRoleSearchText(person.role);
      return personRole.toLowerCase().includes(role.toLowerCase());
    });
  }

  private getRoleSearchText(role: RelatedPerson['role']): string {
    if (typeof role === 'string') return role;
    if ('designation' in role && typeof role.designation === 'string') {
      return role.designation;
    }

    const values: string[] = [];
    for (const locale of [role.de, role.en]) {
      if (typeof locale === 'string') {
        values.push(locale);
      } else if (locale && typeof locale === 'object') {
        const localized = locale as Record<string, unknown>;
        if (typeof localized.long === 'string') values.push(localized.long);
        if (typeof localized.short === 'string') values.push(localized.short);
      }
    }
    return values.join(' ');
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
    return data.history || data.publications || [];
  }

  get publications(): Publication[] {
    return this.data?.history || this.data?.publications || [];
  }

  // Annual financial statements
  get annualFinancialStatements(): AnnualFinancialStatement[] {
    return this.data?.annual_financial_statements || [];
  }

  get annualFinancialStatementsHtml(): AnnualFinancialStatement[] {
    return (
      this.data?.annual_financial_statements__html ||
      this.data?.annual_financial_statements_html ||
      []
    );
  }

  getAnnualFinancialStatementForYear(
    year: number,
    html: boolean = false,
  ): AnnualFinancialStatement | undefined {
    const list = html
      ? this.data?.annual_financial_statements__html ||
        this.data?.annual_financial_statements_html
      : this.data?.annual_financial_statements;
    return list?.find((s) => s.year === year);
  }

  // Ownership: shareholders / UBOs / shareholdings
  get shareholders(): ShareholderInfo | undefined {
    return this.data?.shareholders;
  }

  get ubos(): UBOInfo | undefined {
    return this.data?.ubos;
  }

  get shareholdings(): ShareholdingsInfo | undefined {
    return this.data?.shareholdings;
  }

  get mergersAndAcquisitions(): MergersAndAcquisitionsInfo | undefined {
    return this.data?.mergers_and_acquisitions;
  }

  /** Relationship graph returned by the Pro/Max `network` feature. */
  get network(): OrganizationNetwork | undefined {
    return this.data?.network;
  }

  // News, insolvency, website content
  get news(): NewsItem[] {
    return this.data?.news || [];
  }

  get insolvencyPublications(): InsolvencyPublication[] {
    return this.data?.insolvency_publications || [];
  }

  get websiteContent(): WebsiteContent | undefined {
    return this.data?.website_content;
  }

  // Meta information
  get requestCreditCost(): number | undefined {
    return this.data?.meta?.request_credit_cost;
  }

  get creditsRemaining(): number | string | undefined {
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
