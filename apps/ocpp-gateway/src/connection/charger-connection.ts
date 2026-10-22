import { randomUUID } from 'node:crypto';
import { WebSocket } from 'ws';
import { ChargerIdentity } from '../storage/charger-identity';
import { CallReply } from '../transport/call-reply';
import { CallErrorFrame, CallResultFrame } from '../transport/ocpp-frame';
import { OcppFrameCodec } from '../transport/ocpp-frame-codec';
import { PendingCallTracker } from '../transport/pending-call-tracker';
import { AcceptedUpgrade } from './accepted-upgrade';

/** One open socket to one charger: send, receive, ping, close, and the calls waiting for replies. */
export class ChargerConnection {
  readonly charger: ChargerIdentity;
  readonly connectionId: string;
  readonly remoteIp: string;
  readonly openedAt = Date.now();
  /** When the charger last sent anything; the heartbeat watcher closes silent sockets. */
  lastSeenAt = Date.now();
  /** Set by an accepted BootNotification, or from the start when an accepted charger reconnects. */
  isBooted: boolean;
  heartbeatIntervalS: number;

  private readonly pending = new PendingCallTracker();
  private commandChain: Promise<void> = Promise.resolve();

  constructor(
    private readonly socket: WebSocket,
    accepted: AcceptedUpgrade,
    heartbeatIntervalS: number,
  ) {
    this.charger = accepted.charger;
    this.connectionId = accepted.connectionId;
    this.remoteIp = accepted.remoteIp;
    this.isBooted = accepted.charger.registrationStatus === 'accepted';
    this.heartbeatIntervalS = accepted.charger.heartbeatIntervalS ?? heartbeatIntervalS;
  }

  get isOpen(): boolean {
    return this.socket.readyState === WebSocket.OPEN;
  }

  touch(): void {
    this.lastSeenAt = Date.now();
  }

  send(text: string): void {
    if (this.isOpen) {
      this.socket.send(text);
    }
  }

  close(code: number, reason: string): void {
    if (this.isOpen || this.socket.readyState === WebSocket.CONNECTING) {
      this.socket.close(code, reason);
    }
  }

  /** Sends a CALL and waits for its reply (or a timeout, or the socket closing). */
  call(
    action: string,
    payload: unknown,
    timeoutMs: number,
  ): { id: string; reply: Promise<CallReply> } {
    const id = randomUUID();
    const reply = this.pending.track(id, action, timeoutMs);
    this.send(OcppFrameCodec.encodeCall(id, action, payload));
    return { id, reply };
  }

  /** Hands a reply to the call waiting for it; returns that call's action, or null. */
  resolve(frame: CallResultFrame | CallErrorFrame): string | null {
    return this.pending.resolve(frame);
  }

  /** The socket is gone: every call still waiting learns it. */
  closed(): void {
    this.pending.closeAll();
  }

  /** True when the charger answers a WebSocket ping within the time. */
  ping(timeoutMs: number): Promise<boolean> {
    if (!this.isOpen) {
      return Promise.resolve(false);
    }
    return new Promise((resolve) => {
      const timer = setTimeout(() => finish(false), timeoutMs);
      const finish = (isAlive: boolean) => {
        clearTimeout(timer);
        this.socket.off('pong', onPong);
        resolve(isAlive);
      };
      const onPong = () => finish(true);
      this.socket.once('pong', onPong);
      this.socket.ping();
    });
  }

  /** Runs commands one after another: chargers drop overlapping calls. */
  serialize(work: () => Promise<void>): Promise<void> {
    this.commandChain = this.commandChain.then(work, work);
    return this.commandChain;
  }
}
