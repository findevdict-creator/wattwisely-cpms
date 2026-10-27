import { JWTPayload } from 'jose';

/** The parts of a Keycloak access token the API reads. */
export interface AccessTokenClaims extends JWTPayload {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  preferred_username?: string;
  realm_access?: { roles?: string[] };
  /** The Keycloak client the token was issued to, e.g. wattwisely-portal or wattwisely-driver. */
  azp?: string;
}
