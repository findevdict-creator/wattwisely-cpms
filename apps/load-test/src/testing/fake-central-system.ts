import { once } from 'node:events';
import { AddressInfo } from 'node:net';
import { WebSocket, WebSocketServer } from 'ws';

/**
 * A minimal OCPP 1.6J server for the load test's own tests: it answers every CALL at once,
 * refuses the identities in `refused` with a 404, and counts what it received by action.
 */
export class FakeCentralSystem {
  readonly refused = new Set<string>();
  readonly received = new Map<string, number>();
  private server: WebSocketServer | null = null;
  private transactionId = 0;

  /** Starts on a free port; returns the base URL to give the load test. */
  async start(): Promise<string> {
    const server = new WebSocketServer({
      host: '127.0.0.1',
      port: 0,
      handleProtocols: (protocols) => (protocols.has('ocpp1.6') ? 'ocpp1.6' : false),
      verifyClient: (info, done) => {
        const identity = decodeURIComponent(info.req.url?.split('/').pop() ?? '');
        done(!this.refused.has(identity), 404, 'unknown_charger');
      },
    });
    this.server = server;
    server.on('connection', (socket) =>
      socket.on('message', (data) => this.answer(socket, data.toString())),
    );
    await once(server, 'listening');
    return `ws://127.0.0.1:${(server.address() as AddressInfo).port}/ocpp`;
  }

  async stop(): Promise<void> {
    const server = this.server;
    if (!server) {
      return;
    }
    server.clients.forEach((client) => client.terminate());
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  /** Closes every charger's socket, as a gateway restart would. */
  dropAll(): void {
    this.server?.clients.forEach((client) => client.close(1012, 'Service restart'));
  }

  count(action: string): number {
    return this.received.get(action) ?? 0;
  }

  private answer(socket: WebSocket, text: string): void {
    const [type, id, action] = JSON.parse(text) as [number, string, string];
    if (type !== 2) {
      return;
    }
    this.received.set(action, this.count(action) + 1);
    socket.send(JSON.stringify([3, id, this.result(action)]));
  }

  private result(action: string): unknown {
    const now = new Date().toISOString();
    switch (action) {
      case 'BootNotification':
        return { status: 'Accepted', interval: 60, currentTime: now };
      case 'Heartbeat':
        return { currentTime: now };
      case 'StartTransaction':
        this.transactionId += 1;
        return { transactionId: this.transactionId, idTagInfo: { status: 'Accepted' } };
      case 'Authorize':
      case 'StopTransaction':
        return { idTagInfo: { status: 'Accepted' } };
      default:
        return {};
    }
  }
}
