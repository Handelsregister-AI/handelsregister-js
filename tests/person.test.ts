import nock from 'nock';
import { Person } from '../src/person';
import { Handelsregister } from '../src/client';
import { PersonData } from '../src/types';

describe('Person Class', () => {
  const API_KEY = 'test-api-key';
  const BASE_URL = 'https://handelsregister.ai';

  const mockPersonData: PersonData = {
    entity_id: 'p-123',
    name: 'Erika Mustermann',
    birth_date: '1980-05-12',
    name_parts: {
      given: 'Erika',
      family: 'Mustermann',
      canonical_name: 'Erika Mustermann',
      previous_names: ['Erika Schmidt'],
    },
    location: { home: { city: 'München' } },
    bio: 'Founder of Musterfirma GmbH',
    expertise: ['software', 'fintech'],
    contact: {
      emails: ['erika@musterfirma.example'],
      phones: ['+49 89 0000000'],
    },
    profiles: { linkedin: 'https://linkedin.com/in/erika', github: 'erikamustermann' },
    handelsregister_roles: [
      { label: 'Geschäftsführer', organization: 'Musterfirma GmbH', is_current: true },
      { label: 'Prokurist', organization: 'Other AG', is_current: false },
    ],
    affiliations: [],
    shareholdings: {
      current: [{ organization_name: 'Musterfirma GmbH', percentage: 100 }],
      summary: { total_current: 1 },
    },
    meta: { request_credit_cost: 15, credits_remaining: 985 },
  };

  beforeEach(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('constructor', () => {
    it('builds with api key string', () => {
      const p = new Person('Erika Mustermann', 'Musterfirma GmbH', API_KEY);
      expect(p).toBeInstanceOf(Person);
    });

    it('builds with existing client', () => {
      const client = new Handelsregister(API_KEY);
      const p = new Person('Erika Mustermann', 'Musterfirma GmbH', client);
      expect(p).toBeInstanceOf(Person);
    });
  });

  describe('sync getters before load', () => {
    it('return safe defaults when not loaded yet', () => {
      const p = new Person('Erika Mustermann', 'Musterfirma GmbH', API_KEY);
      expect(p.name).toBe('');
      expect(p.entityId).toBe('');
      expect(p.expertise).toEqual([]);
      expect(p.handelsregisterRoles).toEqual([]);
      expect(p.bio).toBeUndefined();
      expect(p.shareholdings).toBeUndefined();
    });
  });

  describe('after load', () => {
    let person: Person;

    beforeEach(async () => {
      person = new Person('Erika Mustermann', 'Musterfirma GmbH', API_KEY);
      nock(BASE_URL).get('/api/v1/fetch-person').query(true).reply(200, mockPersonData);
      await person.getRawData();
    });

    it('exposes basic fields', () => {
      expect(person.name).toBe('Erika Mustermann');
      expect(person.entityId).toBe('p-123');
      expect(person.birthDate).toBe('1980-05-12');
      expect(person.givenName).toBe('Erika');
      expect(person.familyName).toBe('Mustermann');
      expect(person.canonicalName).toBe('Erika Mustermann');
      expect(person.previousNames).toEqual(['Erika Schmidt']);
      expect(person.homeCity).toBe('München');
      expect(person.bio).toContain('Founder');
    });

    it('exposes contact + profiles', () => {
      expect(person.emails).toEqual(['erika@musterfirma.example']);
      expect(person.phones).toEqual(['+49 89 0000000']);
      expect(person.linkedin).toBe('https://linkedin.com/in/erika');
      expect(person.github).toBe('erikamustermann');
    });

    it('exposes roles', () => {
      expect(person.handelsregisterRoles).toHaveLength(2);
      expect(person.currentHandelsregisterRoles).toHaveLength(1);
      expect(person.currentHandelsregisterRoles[0].organization).toBe('Musterfirma GmbH');
    });

    it('filters roles by label case-insensitively', () => {
      expect(person.getHandelsregisterRolesByLabel('geschäftsführer')).toHaveLength(1);
      expect(person.getHandelsregisterRolesByLabel('PROKURIST')).toHaveLength(1);
      expect(person.getHandelsregisterRolesByLabel('nope')).toHaveLength(0);
    });

    it('exposes shareholdings', () => {
      expect(person.shareholdings?.current?.[0].organization_name).toBe('Musterfirma GmbH');
    });

    it('exposes meta', () => {
      expect(person.requestCreditCost).toBe(15);
      expect(person.creditsRemaining).toBe(985);
    });
  });

  describe('refresh', () => {
    it('re-fetches data', async () => {
      const client = new Handelsregister({ apiKey: API_KEY, cacheEnabled: false });
      const person = new Person('Erika Mustermann', 'Musterfirma GmbH', client);

      nock(BASE_URL)
        .get('/api/v1/fetch-person')
        .query(true)
        .reply(200, mockPersonData)
        .get('/api/v1/fetch-person')
        .query(true)
        .reply(200, { ...mockPersonData, name: 'Erika Mustermann (updated)' });

      await person.getRawData();
      expect(person.name).toBe('Erika Mustermann');

      await person.refresh();
      expect(person.name).toBe('Erika Mustermann (updated)');
    });
  });

  describe('current API contact, role, and shareholding shapes', () => {
    it('normalizes structured contacts and detects current roles by end_date', async () => {
      const currentData: PersonData = {
        entity_id: 'p-current',
        name: 'Erika Mustermann',
        contact: {
          emails: [
            {
              address: 'info@musterfirma.example',
              type: 'organization',
              label: 'Company email',
            },
          ],
          phones: [
            {
              number: '+49 89 123',
              type: 'organization',
            },
          ],
        },
        handelsregister_roles: [
          {
            entity_id: 'org-1',
            name: 'Musterfirma GmbH',
            label: 'MANAGING_DIRECTOR',
            role: {
              en: 'Managing Director',
              de: 'Geschäftsführer',
            },
            start_date: '2020-01-01',
            end_date: null,
          },
          {
            entity_id: 'org-2',
            name: 'Old GmbH',
            label: 'MANAGING_DIRECTOR',
            end_date: '2019-12-31',
          },
        ],
        shareholdings: {
          holdings: {
            current: [
              {
                organization: {
                  entity_id: 'org-1',
                  name: 'Musterfirma GmbH',
                },
                ownership: {
                  percentage: 25,
                  contribution: { amount: 12500, currency: 'EUR' },
                },
                as_of: '2025-03-15',
              },
            ],
          },
          summary: { total_current: 1 },
        },
      };

      const person = new Person('Erika Mustermann', 'Musterfirma GmbH', API_KEY);
      nock(BASE_URL)
        .get('/api/v1/fetch-person')
        .query(true)
        .reply(200, currentData);
      await person.getRawData();

      expect(person.emails).toEqual(['info@musterfirma.example']);
      expect(person.phones).toEqual(['+49 89 123']);
      expect(person.emailContacts[0]).toEqual(
        expect.objectContaining({ type: 'organization' }),
      );
      expect(person.currentHandelsregisterRoles).toHaveLength(1);
      expect(person.currentHandelsregisterRoles[0].name).toBe(
        'Musterfirma GmbH',
      );
      expect(
        person.shareholdings?.holdings?.current?.[0].ownership?.percentage,
      ).toBe(25);
    });
  });
});
