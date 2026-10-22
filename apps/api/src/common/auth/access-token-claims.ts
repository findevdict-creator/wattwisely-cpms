import { JWTPayload } from 'jose';

/** What Keycloak says about one organization (our tenant) when "Add organization id" is on. */
export interface OrganizationDetails {
  id?: string;
}

/**
 * Keycloak puts the user's organizations (our tenants) in the `organization` claim,
 * as a map of alias to details, a list of aliases, or a list holding both.
 * OrganizationClaimParser reads every shape.
 */
export type OrganizationClaim =
  Record<string, OrganizationDetails> | (string | Record<string, OrganizationDetails>)[];

/** The parts of a Keycloak access token the API reads. */
export interface AccessTokenClaims extends JWTPayload {
  sub: string;
  email?: string;
  name?: string;
  preferred_username?: string;
  organization?: OrganizationClaim;
  realm_access?: { roles?: string[] };
}
