import { ClientHttp2Session, connect } from 'node:http2';
import { JwtSigner } from './jwt-signer';
import { PushMessage, PushResult, PushResults, PushTarget } from './push-sender';

/** The key from Apple Developer → Keys with "Apple Push Notifications service" on. */
export interface ApnsCredentials {
  /** The .p8 file's text. */
  privateKey: string;
  keyId: string;
  teamId: string;
  /** The app's bundle ID, the topic every push names. */
  bundleId: string;
  /** Apple's sandbox, for a build run from Xcode; TestFlight and the App Store use production. */
  isSandbox: boolean;
}

/**
 * iPhones through Apple's push service over HTTP/2 (module 34), with a token signed by the
 * team's .p8 key: Apple wants a new one at most every hour and at least every 20 minutes
 * apart, so one is kept for 40 minutes. A token Apple calls BadDeviceToken or Unregistered
 * (HTTP 410) is gone for good.
 */
export class ApnsPushSender {
  static readonly PRODUCTION = 'https://api.push.apple.com';
  static readonly SANDBOX = 'https://api.sandbox.push.apple.com';
  static readonly TOKEN_MS = 40 * 60_000;
  static readonly TIMEOUT_MS = 10_000;
  static readonly INVALID = new Set(['BadDeviceToken', 'Unregistered', 'DeviceTokenNotForTopic']);

  private session: ClientHttp2Session | null = null;
  private jwt: { value: string; at: number } | null = null;

  constructor(private readonly credentials: ApnsCredentials) {}

  async send(target: PushTarget, message: PushMessage): Promise<PushResult> {
    try {
      const { status, body } = await this.post(target.token, ApnsPushSender.payload(message));
      if (status === 200) {
        return PushResults.SENT;
      }
      const reason = (JSON.parse(body || '{}') as { reason?: string }).reason ?? `HTTP ${status}`;
      return PushResults.failed(reason, status === 410 || ApnsPushSender.INVALID.has(reason));
    } catch (error) {
      this.session?.close();
      this.session = null;
      return PushResults.failed((error as Error).message || 'request failed');
    }
  }

  /** The alert, with the app's page beside `aps` for the tap. */
  static payload(message: PushMessage): object {
    return {
      aps: { alert: { title: message.title, body: message.body }, sound: 'default' },
      ...message.data,
    };
  }

  private post(token: string, payload: object): Promise<{ status: number; body: string }> {
    return new Promise((resolve, reject) => {
      const request = this.connection().request({
        ':method': 'POST',
        ':path': `/3/device/${token}`,
        authorization: `bearer ${this.token()}`,
        'apns-topic': this.credentials.bundleId,
        'apns-push-type': 'alert',
        'apns-priority': '10',
      });
      let status = 0;
      let body = '';
      request.setTimeout(ApnsPushSender.TIMEOUT_MS, () => request.close());
      request.on('response', (headers) => (status = Number(headers[':status'])));
      request.on('data', (chunk: Buffer) => (body += chunk.toString()));
      request.on('end', () => resolve({ status, body }));
      request.on('error', reject);
      request.end(JSON.stringify(payload));
    });
  }

  private connection(): ClientHttp2Session {
    if (!this.session || this.session.closed || this.session.destroyed) {
      const host = this.credentials.isSandbox ? ApnsPushSender.SANDBOX : ApnsPushSender.PRODUCTION;
      this.session = connect(host);
      this.session.on('error', () => (this.session = null));
      this.session.unref();
    }
    return this.session;
  }

  private token(now = Date.now()): string {
    if (!this.jwt || now - this.jwt.at > ApnsPushSender.TOKEN_MS) {
      const value = JwtSigner.sign(
        { alg: 'ES256', kid: this.credentials.keyId },
        { iss: this.credentials.teamId, iat: Math.floor(now / 1000) },
        this.credentials.privateKey,
      );
      this.jwt = { value, at: now };
    }
    return this.jwt.value;
  }
}
