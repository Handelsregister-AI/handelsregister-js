import { Handelsregister } from './client.js';
import {
  HandelsregisterConfig,
  PersonData,
  PersonFeature,
  PersonShareholdings,
  PersonContactEntry,
  PersonRegistryRole,
} from './types.js';

export interface PersonOptions {
  features?: PersonFeature[];
}

export class Person {
  private client: Handelsregister;
  private data?: PersonData;
  private personQ: string;
  private organizationQ: string;
  private features?: PersonFeature[];

  constructor(
    personQ: string,
    organizationQ: string,
    configOrClient?: HandelsregisterConfig | string | Handelsregister,
    options?: PersonOptions,
  ) {
    this.personQ = personQ;
    this.organizationQ = organizationQ;
    this.features = options?.features;

    if (configOrClient instanceof Handelsregister) {
      this.client = configOrClient;
    } else {
      this.client = new Handelsregister(
        configOrClient || process.env.HANDELSREGISTER_API_KEY || '',
      );
    }
  }

  private async ensureData(): Promise<PersonData> {
    if (!this.data) {
      this.data = await this.client.fetchPerson({
        personQ: this.personQ,
        organizationQ: this.organizationQ,
        features: this.features,
      });
    }
    return this.data;
  }

  async refresh(): Promise<void> {
    this.data = undefined;
    await this.ensureData();
  }

  // ----- async getters (lazy load) -----

  async getId(): Promise<string> {
    return (await this.ensureData()).entity_id;
  }

  async getName(): Promise<string> {
    return (await this.ensureData()).name;
  }

  async getBio(): Promise<string | undefined> {
    return (await this.ensureData()).bio;
  }

  async getRawData(): Promise<PersonData> {
    return await this.ensureData();
  }

  // ----- sync getters (return defaults if not loaded yet) -----

  get entityId(): string {
    return this.data?.entity_id || '';
  }

  get name(): string {
    return this.data?.name || '';
  }

  get birthDate(): string | undefined {
    return this.data?.birth_date;
  }

  get givenName(): string | undefined {
    return this.data?.name_parts?.given;
  }

  get familyName(): string | undefined {
    return this.data?.name_parts?.family;
  }

  get canonicalName(): string | undefined {
    return this.data?.name_parts?.canonical_name;
  }

  get previousNames(): string[] {
    return this.data?.name_parts?.previous_names || [];
  }

  get homeCity(): string | undefined {
    return this.data?.location?.home?.city;
  }

  get bio(): string | undefined {
    return this.data?.bio;
  }

  get expertise(): string[] {
    return this.data?.expertise || [];
  }

  get emails(): string[] {
    return (this.data?.contact?.emails || [])
      .map((entry) =>
        typeof entry === 'string'
          ? entry
          : entry.address || entry.value || '',
      )
      .filter(Boolean);
  }

  get phones(): string[] {
    return (this.data?.contact?.phones || [])
      .map((entry) =>
        typeof entry === 'string'
          ? entry
          : entry.number || entry.value || entry.address || '',
      )
      .filter(Boolean);
  }

  get emailContacts(): Array<string | PersonContactEntry> {
    return this.data?.contact?.emails || [];
  }

  get phoneContacts(): Array<string | PersonContactEntry> {
    return this.data?.contact?.phones || [];
  }

  get linkedin(): string | undefined {
    return this.data?.profiles?.linkedin;
  }

  get github(): string | undefined {
    return this.data?.profiles?.github;
  }

  get handelsregisterRoles(): PersonRegistryRole[] {
    return this.data?.handelsregister_roles || [];
  }

  get currentHandelsregisterRoles(): PersonRegistryRole[] {
    return (this.data?.handelsregister_roles || []).filter(
      (role) =>
        role.is_current === true ||
        (role.is_current === undefined && !role.end_date),
    );
  }

  get affiliations(): NonNullable<PersonData['affiliations']> {
    return this.data?.affiliations || [];
  }

  get shareholdings(): PersonShareholdings | undefined {
    return this.data?.shareholdings;
  }

  get requestCreditCost(): number | undefined {
    return this.data?.meta?.request_credit_cost;
  }

  get creditsRemaining(): number | string | undefined {
    return this.data?.meta?.credits_remaining;
  }

  get rawData(): PersonData | undefined {
    return this.data;
  }

  // ----- helpers -----

  getHandelsregisterRolesByLabel(label: string): PersonRegistryRole[] {
    const lower = label.toLowerCase();
    return (this.data?.handelsregister_roles || []).filter((role) => {
      const l = typeof role.label === 'string' ? role.label : '';
      return l.toLowerCase().includes(lower);
    });
  }

  toJSON(): PersonData | undefined {
    return this.data;
  }

  toString(): string {
    if (!this.data) {
      return `Person(${this.personQ} @ ${this.organizationQ}) - not loaded`;
    }
    return `Person(${this.data.name})`;
  }
}
