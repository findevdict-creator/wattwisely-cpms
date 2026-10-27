import { Injectable } from '@nestjs/common';
import { WebhookSignature } from '@wattwisely/webhooks';

/** The shape of what fetch throws: a name, a system code, and the errors behind it. */
interface Failure {
  name?: string;
  code?: string;
  message?: string;
  cause?: unknown;
  errors?: unknown[];
}

/** What the endpoint answered, or why it could not be reached. */
export interface SendResult {
  statusCode: number | null;
  error: string | null;
}

/**
 * Posts one delivery (module 16): the JSON body, signed with the endpoint's secret in the
 * Wattwisely-Signature header, with the event type and delivery id in headers of their own
 * so a receiver can route before parsing. Any 2xx within the timeout counts as delivered.
 */
@Injectable()
export class WebhookSender {
  static readonly TIMEOUT_MS = 10_000;
  static readonly USER_AGENT = 'Wattwisely-Webhooks/1.0';

  async send(
    url: string,
    secret: string,
    delivery: { id: string; eventType: string; payload: Record<string, unknown> },
    now: Date,
  ): Promise<SendResult> {
    const body = JSON.stringify(delivery.payload);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'user-agent': WebhookSender.USER_AGENT,
          'wattwisely-event': delivery.eventType,
          'wattwisely-delivery': delivery.id,
          [WebhookSignature.HEADER]: WebhookSignature.sign(secret, body, now),
        },
        body,
        redirect: 'manual',
        signal: AbortSignal.timeout(WebhookSender.TIMEOUT_MS),
      });
      await response.body?.cancel();
      return { statusCode: response.status, error: response.ok ? null : `HTTP ${response.status}` };
    } catch (error) {
      return { statusCode: null, error: WebhookSender.describe(error) };
    }
  }

  /** "timed out", "ECONNREFUSED", or whatever the runtime said, cut short. */
  private static describe(error: unknown): string {
    return (WebhookSender.reasonOf(error, 0) ?? 'request failed').slice(0, 200);
  }

  private static directReason(failure: Failure): string | undefined {
    if (failure.name === 'TimeoutError') {
      return 'timed out';
    }
    return typeof failure.code === 'string' ? failure.code : undefined;
  }

  /** The most telling word in the error and its causes: the timeout, a system code, a message. */
  private static reasonOf(error: unknown, depth: number): string | undefined {
    if (!error || typeof error !== 'object' || depth > 4) {
      return undefined;
    }
    const failure = error as Failure;
    const direct = WebhookSender.directReason(failure);
    if (direct) {
      return direct;
    }
    for (const inner of [failure.cause, ...(failure.errors ?? [])]) {
      const reason = WebhookSender.reasonOf(inner, depth + 1);
      if (reason) {
        return reason;
      }
    }
    return failure.message && failure.message !== 'fetch failed' ? failure.message : undefined;
  }
}
