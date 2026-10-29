import { ApnsCredentials, PlatformPushSender, ServiceAccount } from '@wattwisely/push';
import { PushSettings } from '../config/push-settings';

/** The push sender the settings allow: each platform only with its credentials (module 34). */
export class PushSenderFactory {
  static create(settings: PushSettings): PlatformPushSender {
    return new PlatformPushSender(
      PushSenderFactory.android(settings),
      PushSenderFactory.ios(settings),
    );
  }

  private static android(settings: PushSettings): ServiceAccount | null {
    if (!settings.fcmServiceAccountJson) {
      return null;
    }
    const account = JSON.parse(settings.fcmServiceAccountJson) as ServiceAccount;
    if (!account.project_id || !account.client_email || !account.private_key) {
      throw new Error('FCM_SERVICE_ACCOUNT_JSON is not a service account key');
    }
    return account;
  }

  private static ios(settings: PushSettings): ApnsCredentials | null {
    if (!settings.apnsPrivateKey) {
      return null;
    }
    if (!settings.apnsKeyId || !settings.apnsTeamId) {
      throw new Error('APNS_PRIVATE_KEY needs APNS_KEY_ID and APNS_TEAM_ID');
    }
    return {
      privateKey: settings.apnsPrivateKey,
      keyId: settings.apnsKeyId,
      teamId: settings.apnsTeamId,
      bundleId: settings.apnsBundleId,
      isSandbox: settings.isApnsSandbox,
    };
  }
}
