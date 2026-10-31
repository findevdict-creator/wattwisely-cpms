import { PushMessage, PushResult, PushResults, PushSender, PushTarget } from '../push-sender';

/** One push the fake took. */
export interface SentPush {
  target: PushTarget;
  message: PushMessage;
}

/** Records pushes instead of sending them; a token in `invalidTokens` is refused as gone. */
export class FakePushSender implements PushSender {
  readonly sent: SentPush[] = [];
  readonly invalidTokens = new Set<string>();

  isEnabled(): boolean {
    return true;
  }

  async send(target: PushTarget, message: PushMessage): Promise<PushResult> {
    if (this.invalidTokens.has(target.token)) {
      return PushResults.failed('Unregistered', true);
    }
    this.sent.push({ target, message });
    return PushResults.SENT;
  }
}
