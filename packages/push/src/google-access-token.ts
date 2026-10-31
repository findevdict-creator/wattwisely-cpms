import { JwtSigner } from './jwt-signer';

/** The fields of a Google service account's JSON key that matter here. */
export interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
}

/**
 * An OAuth access token for Firebase Cloud Messaging from a service account key: a JWT signed
 * with the key is traded at Google's token endpoint for an hour's access token, which is kept
 * until five minutes before it runs out.
 */
export class GoogleAccessToken {
  static readonly SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
  static readonly TOKEN_URI = 'https://oauth2.googleapis.com/token';
  static readonly MARGIN_MS = 5 * 60_000;

  private token: string | null = null;
  private expiresAt = 0;

  constructor(private readonly account: ServiceAccount) {}

  async get(now = Date.now()): Promise<string> {
    if (this.token && now < this.expiresAt - GoogleAccessToken.MARGIN_MS) {
      return this.token;
    }
    const uri = this.account.token_uri ?? GoogleAccessToken.TOKEN_URI;
    const response = await fetch(uri, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: this.assertion(uri, now),
      }),
    });
    const answer = (await response.json()) as { access_token?: string; expires_in?: number };
    if (!response.ok || !answer.access_token) {
      throw new Error(`Google refused the service account (HTTP ${response.status})`);
    }
    this.token = answer.access_token;
    this.expiresAt = now + (answer.expires_in ?? 3600) * 1000;
    return this.token;
  }

  private assertion(audience: string, now: number): string {
    const issuedAt = Math.floor(now / 1000);
    return JwtSigner.sign(
      { alg: 'RS256', typ: 'JWT' },
      {
        iss: this.account.client_email,
        scope: GoogleAccessToken.SCOPE,
        aud: audience,
        iat: issuedAt,
        exp: issuedAt + 3600,
      },
      this.account.private_key,
    );
  }
}
