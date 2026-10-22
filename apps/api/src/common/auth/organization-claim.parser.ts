import { Injectable } from '@nestjs/common';
import { TenantMembership } from '../tenant/tenant-membership';
import { OrganizationClaim, OrganizationDetails } from './access-token-claims';

/**
 * Turns the token's `organization` claim into tenant memberships.
 *
 * Keycloak can write this claim in three shapes:
 *   { "acme-charging": { "id": "…" } }                    map with ids (what we configure)
 *   ["acme-charging"]                                     aliases only
 *   ["acme-charging", { "acme-charging": { "id": "…" } }] both, when two mappers fill the claim
 * Only entries with an id can be checked against X-Tenant-Id, so alias-only entries are skipped.
 */
@Injectable()
export class OrganizationClaimParser {
  parse(claim: OrganizationClaim | undefined): TenantMembership[] {
    return Object.entries(this.collectDetails(claim))
      .filter(([, details]) => typeof details?.id === 'string')
      .map(([alias, details]) => new TenantMembership(details.id as string, alias));
  }

  private collectDetails(
    claim: OrganizationClaim | undefined,
  ): Record<string, OrganizationDetails> {
    if (!claim) {
      return {};
    }
    const parts = Array.isArray(claim) ? claim : [claim];
    const maps = parts.filter(
      (part): part is Record<string, OrganizationDetails> => typeof part === 'object',
    );
    return Object.assign({}, ...maps);
  }
}
