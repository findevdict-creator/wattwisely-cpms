import { randomUUID } from 'node:crypto';
import { ClientRequestArgs } from 'node:http';
import { ClientOptions, WebSocket } from 'ws';
import { CallHandler } from './call-handler';
import { ChargerOptions } from './charger-options';
import { ConnectRefused } from './connect-refused';
import { IncomingCall, SimFrames, SimReply } from './sim-frames';

/**
 * A charge point for tests and demos: it connects like an OCPP-J charger (1.6 unless told
 * to offer 2.0.1), sends the usual messages (`ChargerMessages` or `ChargerMessages201`)
 * and answers the gateway's commands with whatever the test tells it to.
 */
export class SimulatedCharger {
  static readonly DEFAULT_PROTOCOLS = ['ocpp1.6'];
  static readonly DEFAULT_REPLY_TIMEOUT_MS = 5_000;
  /** Generous, because test machines run the gateway, the API tests and builds at once. */
  static readonly HANDSHAKE_TIMEOUT_MS = 15_000;

  private socket: WebSocket | null = null;
  private readonly waiting = new Map<string, (reply: SimReply) => void>();
  private readonly handlers = new Map<string, CallHandler>();
  private readonly callQueue: IncomingCall[] = [];
  private callWaiters: ((call: IncomingCall) => void)[] = [];

  constructor(readonly options: ChargerOptions) {}

  get isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  /** The subprotocol the gateway answered the handshake with: which OCPP version it will speak. */
  get protocol(): string | null {
    return this.socket?.protocol || null;
  }

  /** Opens the socket. Rejects with ConnectRefused when the gateway answers with an HTTP status. */
  connect(): Promise<void> {
    const url = `${this.options.url.replace(/\/$/, '')}/${encodeURIComponent(this.options.identity)}`;
    const socket = new WebSocket(
      url,
      this.options.protocols ?? SimulatedCharger.DEFAULT_PROTOCOLS,
      this.clientOptions(),
    );
    this.socket = socket;
    socket.on('message', (data) => void this.receive(data.toString()));
    return new Promise((resolve, reject) => {
      socket.once('open', () => resolve());
      socket.once('unexpected-response', (_request, response) => {
        let body = '';
        response.on('data', (chunk: Buffer) => (body += chunk.toString()));
        response.on('end', () =>
          reject(new ConnectRefused(response.statusCode ?? 0, SimulatedCharger.reasonOf(body))),
        );
      });
      socket.once('error', (error) => reject(error));
    });
  }

  /** Closes the socket and resolves once the server has acknowledged the close. */
  close(code = 1000, reason = 'Simulator closing'): Promise<void> {
    const socket = this.socket;
    if (!socket || socket.readyState === WebSocket.CLOSED) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      socket.once('close', () => resolve());
      socket.close(code, reason);
    });
  }

  /** Waits for the server to close the socket; resolves with the close code. */
  closed(timeoutMs = 10_000): Promise<number> {
    const socket = this.socket;
    if (!socket || socket.readyState === WebSocket.CLOSED) {
      return Promise.resolve(socket ? 1000 : 1006);
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('The socket stayed open.')), timeoutMs);
      socket.once('close', (code) => {
        clearTimeout(timer);
        resolve(code);
      });
    });
  }

  /** Answers every CALL of this action from the server with the handler's result. */
  on(action: string, handler: CallHandler): this {
    this.handlers.set(action, handler);
    return this;
  }

  /** The next CALL the server sends that no handler answered (tests inspect it and reply themselves). */
  nextCall(timeoutMs = 5_000): Promise<IncomingCall> {
    const queued = this.callQueue.shift();
    if (queued) {
      return Promise.resolve(queued);
    }
    return new Promise((resolve, reject) => {
      const waiter = (call: IncomingCall) => {
        clearTimeout(timer);
        resolve(call);
      };
      const timer = setTimeout(() => {
        this.callWaiters = this.callWaiters.filter((other) => other !== waiter);
        reject(new Error(`No CALL from the server within ${timeoutMs} ms.`));
      }, timeoutMs);
      this.callWaiters.push(waiter);
    });
  }

  /** Replies to a CALL taken with nextCall. */
  reply(call: IncomingCall, payload: unknown): void {
    this.sendRaw(SimFrames.result(call.id, payload));
  }

  /** Sends a CALL and waits for the gateway's reply. */
  call(action: string, payload: unknown): Promise<SimReply> {
    const id = randomUUID();
    const timeoutMs = this.options.replyTimeoutMs ?? SimulatedCharger.DEFAULT_REPLY_TIMEOUT_MS;
    const reply = new Promise<SimReply>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiting.delete(id);
        reject(new Error(`No reply to ${action} within ${timeoutMs} ms.`));
      }, timeoutMs);
      this.waiting.set(id, (answer) => {
        clearTimeout(timer);
        resolve(answer);
      });
    });
    this.sendRaw(SimFrames.call(id, action, payload));
    return reply;
  }

  /** Sends a CALL and returns the CALLRESULT payload; throws on a CALLERROR. */
  async callForResult<T = Record<string, unknown>>(action: string, payload: unknown): Promise<T> {
    const reply = await this.call(action, payload);
    if (reply.kind === 'error') {
      throw new Error(`${action} answered ${reply.code}: ${reply.description}`);
    }
    return reply.payload as T;
  }

  /** A frame written by hand, with the id to expect the gateway's answer under: for tests of bad frames. */
  sendRawForReply(id: string, text: string): Promise<SimReply> {
    const timeoutMs = this.options.replyTimeoutMs ?? SimulatedCharger.DEFAULT_REPLY_TIMEOUT_MS;
    const reply = new Promise<SimReply>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiting.delete(id);
        reject(new Error(`No reply to frame ${id} within ${timeoutMs} ms.`));
      }, timeoutMs);
      this.waiting.set(id, (answer) => {
        clearTimeout(timer);
        resolve(answer);
      });
    });
    this.sendRaw(text);
    return reply;
  }

  /** Anything at all, for tests of the gateway's handling of bad frames. */
  sendRaw(text: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('The simulated charger is not connected.');
    }
    this.socket.send(text);
  }

  private clientOptions(): ClientOptions | ClientRequestArgs {
    const credentials =
      this.options.password === undefined
        ? {}
        : { auth: `${this.options.identity}:${this.options.password}` };
    return { ...credentials, handshakeTimeout: SimulatedCharger.HANDSHAKE_TIMEOUT_MS };
  }

  private async receive(text: string): Promise<void> {
    const frame = SimFrames.decode(text);
    if (!frame) {
      return;
    }
    if (frame.reply) {
      this.waiting.get(frame.id)?.(frame.reply);
      this.waiting.delete(frame.id);
    } else if (frame.call) {
      await this.answer(frame.call);
    }
  }

  private async answer(call: IncomingCall): Promise<void> {
    const handler = this.handlers.get(call.action);
    if (!handler) {
      const waiter = this.callWaiters.shift();
      if (waiter) {
        waiter(call);
      } else {
        this.callQueue.push(call);
      }
      return;
    }
    try {
      this.sendRaw(SimFrames.result(call.id, await handler(call.payload)));
    } catch (error) {
      this.sendRaw(SimFrames.error(call.id, 'InternalError', (error as Error).message));
    }
  }

  private static reasonOf(body: string): string {
    try {
      return String((JSON.parse(body) as { error?: string }).error ?? body);
    } catch {
      return body;
    }
  }
}
