import { IsBoolean, IsInt, IsString, Min } from 'class-validator';

/**
 * Push notifications to the mobile app (module 34). Each platform sends only when its
 * credentials are set: a Firebase service account's JSON key for Android, and an Apple .p8
 * key with its key ID and team for iOS. See docs/modules/34-mobile-push.md.
 */
export class PushSettings {
  /** How often sessions are checked for the pushes their drivers are due (PUSH_INTERVAL_MS). */
  @IsInt()
  @Min(100)
  intervalMs!: number;

  /** The service account key's JSON text (FCM_SERVICE_ACCOUNT_JSON); empty switches Android off. */
  @IsString()
  fcmServiceAccountJson!: string;

  /** The .p8 key's text (APNS_PRIVATE_KEY); empty switches iOS off. */
  @IsString()
  apnsPrivateKey!: string;

  @IsString()
  apnsKeyId!: string;

  @IsString()
  apnsTeamId!: string;

  /** The app's bundle ID (APNS_BUNDLE_ID), com.wattwisely.driver by default. */
  @IsString()
  apnsBundleId!: string;

  /** Apple's sandbox (APNS_SANDBOX=true), for builds run from Xcode. */
  @IsBoolean()
  isApnsSandbox!: boolean;
}
