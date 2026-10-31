import { ApnsCredentials, ApnsPushSender } from './apns-push.sender';
import { FcmPushSender } from './fcm-push.sender';
import { ServiceAccount } from './google-access-token';
import {
  PushMessage,
  PushPlatform,
  PushResult,
  PushResults,
  PushSender,
  PushTarget,
} from './push-sender';

/** One sender per platform. */
interface PlatformSender {
  send(target: PushTarget, message: PushMessage): Promise<PushResult>;
}

/**
 * Sends each push through its phone's service (module 34). A platform whose credentials are
 * not configured sends nothing, and the worker skips its phones.
 */
export class PlatformPushSender implements PushSender {
  private readonly senders: Partial<Record<PushPlatform, PlatformSender>>;

  constructor(android: ServiceAccount | null, ios: ApnsCredentials | null) {
    this.senders = {
      ...(android ? { android: new FcmPushSender(android) } : {}),
      ...(ios ? { ios: new ApnsPushSender(ios) } : {}),
    };
  }

  isEnabled(platform: PushPlatform): boolean {
    return this.senders[platform] !== undefined;
  }

  send(target: PushTarget, message: PushMessage): Promise<PushResult> {
    const sender = this.senders[target.platform];
    return sender
      ? sender.send(target, message)
      : Promise.resolve(PushResults.failed(`Push to ${target.platform} is not configured.`));
  }
}
