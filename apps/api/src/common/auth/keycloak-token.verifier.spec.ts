import { ApiConfig } from '../../config/api.config';
import { ProblemException } from '../problem/problem.exception';
import { TestTokenIssuer } from '../../testing/test-token.issuer';
import { KeycloakKeySetProvider } from './keycloak-key-set.provider';
import { KeycloakTokenVerifier } from './keycloak-token.verifier';

describe('KeycloakTokenVerifier', () => {
  let issuer: TestTokenIssuer;
  let verifier: KeycloakTokenVerifier;

  beforeAll(async () => {
    issuer = await new TestTokenIssuer().init();
    const config = Object.assign(new ApiConfig(), {
      keycloakIssuerUrl: TestTokenIssuer.ISSUER,
      keycloakAudience: TestTokenIssuer.AUDIENCE,
    });
    const keySetProvider = { getKeySet: () => issuer.getKeySet() } as KeycloakKeySetProvider;
    verifier = new KeycloakTokenVerifier(config, keySetProvider);
  });

  it('accepts a token signed by the realm for this API', async () => {
    const token = await issuer.sign({ email: 'owner@acme.test' });

    const claims = await verifier.verify(token);

    expect(claims.sub).toBe('user-1');
    expect(claims.email).toBe('owner@acme.test');
  });

  it.each([
    ['another audience', { audience: 'some-other-client' }],
    ['another issuer', { issuer: 'http://evil.test/realms/wattwisely' }],
    ['an expired token', { expiresAt: Math.floor(Date.now() / 1000) - 60 }],
  ])('rejects %s with 401 token_invalid', async (_case, overrides) => {
    const token = await issuer.sign({}, overrides);

    await expect(verifier.verify(token)).rejects.toMatchObject({
      code: 'token_invalid',
      status: 401,
    });
  });

  it('rejects a token that is not a JWT', async () => {
    await expect(verifier.verify('not-a-token')).rejects.toBeInstanceOf(ProblemException);
  });
});
