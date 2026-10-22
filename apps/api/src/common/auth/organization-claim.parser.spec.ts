import { OrganizationClaimParser } from './organization-claim.parser';

describe('OrganizationClaimParser', () => {
  const parser = new OrganizationClaimParser();

  it('reads tenants from the map shape that carries organization ids', () => {
    const memberships = parser.parse({
      'acme-charging': { id: 'org-1' },
      'volt-hotels': { id: 'org-2' },
    });

    expect(memberships).toEqual([
      { id: 'org-1', alias: 'acme-charging' },
      { id: 'org-2', alias: 'volt-hotels' },
    ]);
  });

  it('returns no tenants when the claim is missing', () => {
    expect(parser.parse(undefined)).toEqual([]);
  });

  it('ignores the alias-only list shape, because it has no ids to check against', () => {
    expect(parser.parse(['acme-charging'])).toEqual([]);
  });

  it('reads the mixed list Keycloak sends when two mappers fill the claim', () => {
    const memberships = parser.parse([
      'acme-charging',
      'volt-hotels',
      { 'acme-charging': { id: 'org-1' }, 'volt-hotels': { id: 'org-2' } },
    ]);

    expect(memberships.map((membership) => membership.id)).toEqual(['org-1', 'org-2']);
  });

  it('skips entries without an id', () => {
    expect(parser.parse({ 'acme-charging': {} })).toEqual([]);
  });
});
