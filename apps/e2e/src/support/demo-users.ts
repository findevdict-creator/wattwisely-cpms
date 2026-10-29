/** The users deploy/scripts/seed-demo.sh creates, all with the same password. */
export class DemoUsers {
  static readonly PASSWORD = 'Wattwisely-demo-1';
  static readonly OWNER = 'owner@acme.test';
  static readonly TECH = 'tech@acme.test';
  static readonly MULTI = 'multi@demo.test';
  static readonly NOBODY = 'nobody@demo.test';
  static readonly ADMIN = 'admin@wattwisely.test';
  static readonly SUPPORT = 'support@wattwisely.test';
  static readonly DANA = 'dana@acme.test';
  /** Staff users must set up an authenticator app; drivers need none. */
  static readonly STAFF = [
    DemoUsers.OWNER,
    DemoUsers.TECH,
    DemoUsers.MULTI,
    DemoUsers.NOBODY,
    DemoUsers.ADMIN,
    DemoUsers.SUPPORT,
  ];
  static readonly FLEET_API_KEY = 'wwk_demo-fleet-tool-0000000000000000000000000000';
  static readonly ACME_ID = '01900000-0000-7000-8000-00000000a001';
  static readonly RIVERSIDE_ID = '01900000-0000-7000-8000-00000000c001';
  static readonly RIVERSIDE_CHARGER = 'WW-7KQ4M2XR9T';
  static readonly RIVERSIDE_SECOND_CHARGER = 'WW-3NB8TF5D2W';
  static readonly DEPOT_CHARGER = 'SN-AB129934';
}
