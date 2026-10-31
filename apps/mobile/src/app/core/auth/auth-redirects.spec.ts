import { AuthRedirects } from './auth-redirects';

describe('AuthRedirects', () => {
  it("tells Keycloak's sign-in answer from its sign-out answer and other links", () => {
    expect(AuthRedirects.isCallback('com.wattwisely.driver:/callback?code=abc&state=xyz')).toBe(
      true,
    );
    expect(AuthRedirects.isSignedOut('com.wattwisely.driver:/signed-out')).toBe(true);
    expect(AuthRedirects.isCallback('https://charge.test/c/WW-1/1')).toBe(false);
  });

  it('hands the sign-in library the query, question mark included', () => {
    expect(AuthRedirects.query('com.wattwisely.driver:/callback?code=abc&state=xyz')).toBe(
      '?code=abc&state=xyz',
    );
    expect(AuthRedirects.query('com.wattwisely.driver:/callback')).toBe('');
  });
});
