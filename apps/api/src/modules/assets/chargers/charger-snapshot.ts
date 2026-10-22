import { ChargerRecord } from './charger-record';

/** The part of a charger worth keeping in the audit log's before and after. Never the password. */
export class ChargerSnapshot {
  static of(charger: ChargerRecord | null): object | null {
    if (!charger) {
      return null;
    }
    return {
      site_id: charger.siteId,
      site_name: charger.siteName,
      ocpp_identity: charger.ocppIdentity,
      vendor: charger.vendor,
      model: charger.model,
      auth_mode: charger.authMode,
      allow_plain_ws: charger.allowPlainWs,
      visibility_override: charger.visibilityOverride,
      boot_fingerprint: charger.bootFingerprint,
    };
  }
}
