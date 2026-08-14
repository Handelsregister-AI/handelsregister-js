import nock from 'nock';

import { Handelsregister } from '../src/client';
import {
  InsolvencyStatus,
  LegalFormLiabilityType,
  OrganizationFeature,
  OrganizationStatus,
  OwnershipStructure,
  SearchSort,
  SortOrder,
} from '../src/constants';
import { SubscriptionRequiredError, ValidationError } from '../src/errors';

const BASE_URL = 'https://handelsregister.ai';

describe('organization network and advanced search', () => {
  beforeEach(() => nock.cleanAll());
  afterEach(() => nock.cleanAll());

  it('exports the complete current feature and search taxonomies', () => {
    expect(OrganizationFeature.NETWORK).toBe('network');
    expect(SearchSort.DISTANCE).toBe('distance');
    expect(OrganizationStatus.INSOLVENT).toBe('INSOLVENT');
    expect(OwnershipStructure.CORPORATE_GROUP).toBe('corporate_group');
    expect(InsolvencyStatus.OPENING_RESCINDED).toBe('opening_rescinded');
  });

  it('preflights an entitled plan and returns the typed network feature', async () => {
    const client = new Handelsregister({ apiKey: 'key', cacheEnabled: false });
    nock(BASE_URL)
      .get('/api/v1/account/subscription')
      .reply(200, { subscription: { plan: 'max' } });
    const organization = nock(BASE_URL)
      .get('/api/v1/fetch-organization')
      .query((query) => query.q === 'Example GmbH' && query.feature === 'network')
      .reply(200, {
        entity_id: 'root',
        name: 'Example GmbH',
        network: {
          depth: 1,
          nodes: [
            { node_id: 'organization:root', entity_id: 'root', name: 'Example GmbH', is_root: true },
            { node_id: 'person:one', entity_id: 'one', name: 'Erika Beispiel', depth: 1 },
          ],
          connections: [
            {
              source: { node_id: 'organization:root', name: 'Example GmbH' },
              target: { node_id: 'person:one', name: 'Erika Beispiel' },
              connection_type: 'ROLE',
              label: 'Managing director',
              is_current: true,
            },
          ],
        },
      });

    const result = await client.fetchOrganization({
      q: 'Example GmbH',
      features: ['network'],
    });

    expect(result.network?.depth).toBe(1);
    expect(result.network?.nodes?.find((node) => node.is_root)?.entity_id).toBe('root');
    expect(result.network?.connections?.[0].target?.name).toBe('Erika Beispiel');
    expect(organization.isDone()).toBe(true);
  });

  it('stops a lower-tier network request before the billable organization call', async () => {
    const client = new Handelsregister({ apiKey: 'key', cacheEnabled: false });
    nock(BASE_URL)
      .get('/api/v1/account/subscription')
      .reply(200, { subscription: null });
    const organization = nock(BASE_URL)
      .get('/api/v1/fetch-organization')
      .query(true)
      .reply(200, { entity_id: 'unexpected', name: 'Unexpected' });

    let caught: unknown;
    try {
      await client.fetchOrganization({ q: 'Example GmbH', features: ['network'] });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(SubscriptionRequiredError);
    const planError = caught as SubscriptionRequiredError;
    expect(planError.message).toContain('Pro or Max');
    expect(planError.code).toBe('subscription_required');
    expect(planError.requiredPlans).toEqual(['pro', 'max']);
    expect(planError.blockedFeatures).toEqual(['network']);
    expect(planError.meta.request_credit_cost).toBe(0);
    expect(organization.isDone()).toBe(false);
  });

  it('keeps network lookup backward compatible when account access is inconclusive', async () => {
    const client = new Handelsregister({ apiKey: 'key', cacheEnabled: false });
    nock(BASE_URL)
      .get('/api/v1/account/subscription')
      .reply(401, { error: 'account lookup unavailable' });
    const organization = nock(BASE_URL)
      .get('/api/v1/fetch-organization')
      .query((query) => query.feature === 'network')
      .reply(200, { entity_id: 'root', name: 'Example GmbH' });

    await expect(
      client.fetchOrganization({ q: 'Example GmbH', features: ['network'] }),
    ).resolves.toMatchObject({ entity_id: 'root' });
    expect(organization.isDone()).toBe(true);
  });

  it('serializes current filters, sort, order, and match context', async () => {
    const client = new Handelsregister({ apiKey: 'key', cacheEnabled: false });
    const scope = nock(BASE_URL)
      .get('/api/v1/search-organizations')
      .query((query) => {
        if (
          query.sort !== SearchSort.REVENUE ||
          query.order !== SortOrder.DESC ||
          query.match_context !== '1'
        ) {
          return false;
        }
        const filters = JSON.parse(String(query.filters));
        return (
          filters.legal_form_code === 'GmbH' &&
          filters.status === OrganizationStatus.ACTIVE &&
          filters.legal_form_liability_type === LegalFormLiabilityType.LIMITED &&
          filters.location_coordinates.lat === 48.13 &&
          filters.location_coordinates.lon === 11.58 &&
          filters.location_max_distance_km === 25 &&
          filters.financial_filters.pl_revenue.gte === 1_000_000 &&
          filters.ownership_filters.structure.eq === OwnershipStructure.FAMILY &&
          filters.ownership_filters.largest_share_ratio.gte === 0.5 &&
          filters.executive_filters.md_oldest_birth_date.lte === '1960-01-01' &&
          filters.lifecycle_filters.insolvency_status.eq === InsolvencyStatus.OPENED
        );
      })
      .reply(200, { results: [], total: 0 });

    await client.searchOrganizations({
      filters: {
        legal_form_code: 'GmbH',
        status: OrganizationStatus.ACTIVE,
        legal_form_liability_type: LegalFormLiabilityType.LIMITED,
        location_coordinates: { latitude: 48.13, longitude: 11.58 },
        location_max_distance_km: 25,
        pl_revenue: { gte: 1_000_000 },
        ownership_filters: {
          structure: { eq: OwnershipStructure.FAMILY },
          largest_share_ratio: { gte: 0.5 },
        },
        executive_filters: {
          md_oldest_birth_date: { lte: '1960-01-01' },
        },
        lifecycle_filters: {
          insolvency_status: { eq: InsolvencyStatus.OPENED },
        },
      },
      sort: SearchSort.REVENUE,
      order: SortOrder.DESC,
      matchContext: true,
    });
    expect(scope.isDone()).toBe(true);
  });

  it('serializes list values in every advanced filter group', async () => {
    const client = new Handelsregister({ apiKey: 'key', cacheEnabled: false });
    const scope = nock(BASE_URL)
      .get('/api/v1/search-organizations')
      .query((query) => {
        const filters = JSON.parse(String(query.filters));
        return (
          filters.ownership_filters.owner_managed.join(',') === 'true,false' &&
          filters.executive_filters.md_oldest_birth_date.join(',') ===
            '1950-01-01,1960-01-01' &&
          filters.lifecycle_filters.insolvency_status.join(',') ===
            `${InsolvencyStatus.OPENED},${InsolvencyStatus.CONCLUDED}`
        );
      })
      .reply(200, { results: [], total: 0 });

    await client.searchOrganizations({
      filters: {
        ownership_filters: { owner_managed: [true, false] },
        executive_filters: {
          md_oldest_birth_date: ['1950-01-01', '1960-01-01'],
        },
        lifecycle_filters: {
          insolvency_status: [InsolvencyStatus.OPENED, InsolvencyStatus.CONCLUDED],
        },
      },
    });
    expect(scope.isDone()).toBe(true);
  });

  it('uses the human plan message and exposes blocked search context', async () => {
    const client = new Handelsregister({ apiKey: 'key', cacheEnabled: false });
    nock(BASE_URL)
      .get('/api/v1/search-organizations')
      .query(true)
      .reply(403, {
        error: 'subscription_required',
        meta: {
          message: 'Ownership filters require a Pro or Max plan.',
          required_plans: ['pro', 'max'],
          blocked_filters: ['ownership_filters'],
          request_credit_cost: 0,
        },
      });

    let caught: unknown;
    try {
      await client.searchOrganizations({
        filters: { ownership_filters: { owner_managed: true } },
      });
    } catch (error) {
      caught = error;
    }

    const planError = caught as SubscriptionRequiredError;
    expect(planError).toBeInstanceOf(SubscriptionRequiredError);
    expect(planError.message).toBe('Ownership filters require a Pro or Max plan.');
    expect(planError.code).toBe('subscription_required');
    expect(planError.requiredPlans).toEqual(['pro', 'max']);
    expect(planError.blockedFilters).toEqual(['ownership_filters']);
  });

  it('validates current query, geography, sorting, and advanced conditions', async () => {
    const client = new Handelsregister({ apiKey: 'key', cacheEnabled: false });
    await expect(client.searchOrganizations({ q: 'x'.repeat(501) })).rejects.toThrow(
      /at most 500/,
    );
    await expect(
      client.searchOrganizations({
        filters: { legal_form_code: ['GmbH'] } as never,
      }),
    ).rejects.toThrow(/one non-empty string/);
    await expect(
      client.searchOrganizations({
        filters: { location_coordinates: { lat: 48.13, lon: 11.58 } },
      }),
    ).rejects.toThrow(/requires location_max_distance_km/);
    await expect(
      client.searchOrganizations({
        q: 'Example',
        sort: 'unsupported' as never,
      }),
    ).rejects.toThrow(/sort must be one of/);
    await expect(
      client.searchOrganizations({
        filters: {
          ownership_filters: { largest_share_ratio: { gte: 1.1 } },
        },
      }),
    ).rejects.toThrow(/between 0 and 1/);
    await expect(
      client.searchOrganizations({
        filters: {
          lifecycle_filters: { insolvency_status: 'unknown' as never },
        },
      }),
    ).rejects.toThrow(/unsupported value/);
    await expect(
      client.searchOrganizations({
        filters: {
          ownership_filters: { owner_managed: { exists: 'yes' } as never },
        },
      }),
    ).rejects.toThrow(/exists.*boolean/);
  });

  it('preserves sort and match context across automatic pagination', async () => {
    const client = new Handelsregister({ apiKey: 'key', cacheEnabled: false });
    for (const [skip, results] of [
      [0, [{ entity_id: 'a', name: 'A' }]],
      [1, [{ entity_id: 'b', name: 'B' }]],
    ] as const) {
      nock(BASE_URL)
        .get('/api/v1/search-organizations')
        .query((query) =>
          query.q === 'tech' &&
          query.skip === String(skip) &&
          query.limit === '1' &&
          query.sort === SearchSort.REGISTRATION_DATE &&
          query.order === SortOrder.ASC &&
          query.match_context === '1',
        )
        .reply(200, { results, total: 2 });
    }

    const ids: string[] = [];
    for await (const result of client.iterateSearchOrganizations({
      q: 'tech',
      pageSize: 1,
      sort: SearchSort.REGISTRATION_DATE,
      order: SortOrder.ASC,
      matchContext: true,
    })) {
      ids.push(result.entity_id);
    }
    expect(ids).toEqual(['a', 'b']);
  });
});
