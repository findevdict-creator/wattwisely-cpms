import { createServer, IncomingMessage, Server } from 'node:http';
import { AddressInfo } from 'node:net';

/** A request the receiver saw. */
export interface ReceivedWebhook {
  path: string;
  headers: IncomingMessage['headers'];
  body: string;
}

/** A webhook receiver on 127.0.0.1 for worker tests: answers 500 on /fail and 200 elsewhere, and keeps every request. */
export class TestWebhookReceiver {
  readonly received: ReceivedWebhook[] = [];
  baseUrl = '';
  private server: Server | null = null;

  async start(): Promise<void> {
    const server = createServer((request, response) => {
      let body = '';
      request.on('data', (chunk) => (body += chunk));
      request.on('end', () => {
        this.received.push({ path: request.url ?? '', headers: request.headers, body });
        response.statusCode = request.url === '/fail' ? 500 : 200;
        response.end();
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    this.server = server;
    this.baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  }

  async stop(): Promise<void> {
    const server = this.server;
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }

  at(path: string): ReceivedWebhook[] {
    return this.received.filter((request) => request.path === path);
  }

  /** The first request carrying this event type, or none. */
  ofEvent(eventType: string): ReceivedWebhook | undefined {
    return this.received.find((request) => request.headers['wattwisely-event'] === eventType);
  }

  /** The parsed body of the first request carrying this event type; empty when none came. */
  bodyOf(eventType: string): Record<string, unknown> {
    return JSON.parse(this.ofEvent(eventType)?.body ?? '{}');
  }
}
