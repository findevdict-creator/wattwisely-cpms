import { GoogleAccessToken, ServiceAccount } from './google-access-token';
import { PushMessage, PushResult, PushResults, PushTarget } from './push-sender';

/** What FCM answers when a send fails. */
interface FcmError {
  error?: { message?: string; status?: string; details?: { errorCode?: string }[] };
}

/**
 * Android phones through Firebase Cloud Messaging's HTTP v1 API (module 34): one POST per
 * phone to `projects/{project}/messages:send`, with the service account's access token. A
 * token FCM calls UNREGISTERED, or answers 404 for, is gone for good.
 */
export class FcmPushSender {
  static readonly API_URL = 'https://fcm.googleapis.com/v1';
  static readonly TIMEOUT_MS = 10_000;
  static readonly INVALID = new Set(['UNREGISTERED']);

  private readonly accessToken: GoogleAccessToken;

  constructor(private readonly account: ServiceAccount) {
    this.accessToken = new GoogleAccessToken(account);
  }

  async send(target: PushTarget, message: PushMessage): Promise<PushResult> {
    try {
      const url = `${FcmPushSender.API_URL}/projects/${this.account.project_id}/messages:send`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${await this.accessToken.get()}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(FcmPushSender.body(target.token, message)),
        signal: AbortSignal.timeout(FcmPushSender.TIMEOUT_MS),
      });
      if (response.ok) {
        return PushResults.SENT;
      }
      return FcmPushSender.failure(response.status, (await response.json()) as FcmError);
    } catch (error) {
      return PushResults.failed((error as Error).message || 'request failed');
    }
  }

  /** A notification the system shows, with the page to open in `data`. */
  static body(token: string, message: PushMessage): object {
    return {
      message: {
        token,
        notification: { title: message.title, body: message.body },
        data: message.data,
        android: { priority: 'high', notification: { channel_id: 'charging' } },
      },
    };
  }

  static failure(status: number, answer: FcmError): PushResult {
    const code = answer.error?.details?.find((detail) => detail.errorCode)?.errorCode;
    const reason = code ?? answer.error?.status ?? '';
    const text = answer.error?.message ?? `HTTP ${status}`;
    return PushResults.failed(text, status === 404 || FcmPushSender.INVALID.has(reason));
  }
}
