/**
 * The driver's login as the shared code sees it. The driver web app answers with its
 * Keycloak redirect login, the mobile app with its system-browser login (module 30);
 * the API interceptor only needs to know whether there is a token, and what it is.
 */
export abstract class DriverSession {
  abstract isLoggedIn(): boolean;

  abstract accessToken(): string;
}
