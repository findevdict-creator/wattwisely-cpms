/**
 * Where the stack under test answers. The defaults are apps/e2e/stack's (the apps on the host as
 * in "npm start"); E2E_* variables point the suite at another stack, such as a staging server.
 */
export class StackUrls {
  static readonly API = process.env['E2E_API_URL'] ?? 'http://localhost:3000';
  static readonly PORTAL = process.env['E2E_PORTAL_URL'] ?? 'http://localhost:4200';
  static readonly DRIVER = process.env['E2E_DRIVER_URL'] ?? 'http://localhost:4300';
  static readonly ADMIN = process.env['E2E_ADMIN_URL'] ?? 'http://localhost:4400';
  static readonly MOBILE = process.env['E2E_MOBILE_URL'] ?? 'http://localhost:4500';
  static readonly KEYCLOAK = process.env['E2E_KEYCLOAK_URL'] ?? 'http://auth.localhost';
  static readonly MAILPIT = process.env['E2E_MAILPIT_URL'] ?? 'http://localhost:8025';
  static readonly OCPP = process.env['E2E_OCPP_URL'] ?? 'ws://localhost:3100/ocpp';
  static readonly WORKER = process.env['E2E_WORKER_URL'] ?? 'http://localhost:3200';
  static readonly GATEWAY_HTTP = process.env['E2E_GATEWAY_URL'] ?? 'http://localhost:3100';
  static readonly DATABASE =
    process.env['E2E_DATABASE_URL'] ??
    'postgres://wattwisely:e2e-postgres@localhost:5432/wattwisely';
}
