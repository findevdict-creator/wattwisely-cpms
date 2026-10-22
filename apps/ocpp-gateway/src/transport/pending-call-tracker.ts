import { CallReply } from './call-reply';
import { CallErrorFrame, CallResultFrame } from './ocpp-frame';

interface PendingCall {
  action: string;
  resolve: (reply: CallReply) => void;
  timer: NodeJS.Timeout;
}

/** Waits for the replies to calls the gateway sent on one connection, each with its own timeout. */
export class PendingCallTracker {
  private readonly calls = new Map<string, PendingCall>();

  get size(): number {
    return this.calls.size;
  }

  /** Resolves with the reply, or `timeout` after `timeoutMs`, or `closed` when the socket goes away. */
  track(id: string, action: string, timeoutMs: number): Promise<CallReply> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.calls.delete(id);
        resolve({ kind: 'timeout' });
      }, timeoutMs);
      this.calls.set(id, { action, resolve, timer });
    });
  }

  /** Hands a reply to its waiting call. Returns the call's action, or null when nothing waited for it. */
  resolve(frame: CallResultFrame | CallErrorFrame): string | null {
    const pending = this.calls.get(frame.id);
    if (!pending) {
      return null;
    }
    clearTimeout(pending.timer);
    this.calls.delete(frame.id);
    pending.resolve(
      frame.type === 'call_result'
        ? { kind: 'result', payload: frame.payload }
        : {
            kind: 'error',
            code: frame.code,
            description: frame.description,
            details: frame.details,
          },
    );
    return pending.action;
  }

  /** The socket closed: every waiting call learns it will never get its reply. */
  closeAll(): void {
    for (const pending of this.calls.values()) {
      clearTimeout(pending.timer);
      pending.resolve({ kind: 'closed' });
    }
    this.calls.clear();
  }
}
