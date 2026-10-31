/** The two kinds of phone, and the service that pushes to each. */
export type PushPlatform = 'android' | 'ios';

/** One phone: its platform and the token its push service gave the app. */
export interface PushTarget {
  platform: PushPlatform;
  token: string;
}

/** What the phone shows, and the app's page the tap opens (`data.url`). */
export interface PushMessage {
  title: string;
  body: string;
  data: Record<string, string>;
}

/** What the service answered. */
export interface PushResult {
  isSent: boolean;
  /** The service no longer knows the token (the app was removed): stop sending to it. */
  isTokenInvalid: boolean;
  error: string | null;
}

/** The token the worker asks Nest for to get the configured sender. */
export const PUSH_SENDER = Symbol('PUSH_SENDER');

/**
 * Push notifications behind one interface (module 34), the way payments sit behind
 * PaymentGateway: Firebase Cloud Messaging for Android and Apple's push service for iOS
 * today, a fake for tests.
 */
export interface PushSender {
  /** False when the platform's credentials are not configured: nothing is sent to it. */
  isEnabled(platform: PushPlatform): boolean;
  send(target: PushTarget, message: PushMessage): Promise<PushResult>;
}

/** The results the senders share. */
export class PushResults {
  static readonly SENT: PushResult = { isSent: true, isTokenInvalid: false, error: null };

  static failed(error: string, isTokenInvalid = false): PushResult {
    return { isSent: false, isTokenInvalid, error };
  }
}
