import { FastifyRequest } from 'fastify';

/** The fields of an upgrade request, as read from the HTTP request. */
export interface UpgradeFields {
  /** The charge point identity from the URL, /ocpp/<identity>. */
  identity: string;
  ip: string;
  /** True for wss:// (or https behind the proxy, when the proxy is trusted). */
  isSecure: boolean;
  /** The subprotocols the charger offered in Sec-WebSocket-Protocol. */
  protocols: string[];
  authorization: string | null;
}

/** What the six upgrade checks look at, read once from the HTTP upgrade request. */
export class UpgradeRequest implements UpgradeFields {
  readonly identity: string;
  readonly ip: string;
  readonly isSecure: boolean;
  readonly protocols: string[];
  readonly authorization: string | null;

  constructor(fields: UpgradeFields) {
    this.identity = fields.identity;
    this.ip = fields.ip;
    this.isSecure = fields.isSecure;
    this.protocols = fields.protocols;
    this.authorization = fields.authorization;
  }

  static from(request: FastifyRequest): UpgradeRequest {
    const { identity } = request.params as { identity: string };
    const offered = String(request.headers['sec-websocket-protocol'] ?? '');
    return new UpgradeRequest({
      identity: decodeURIComponent(identity ?? ''),
      ip: request.ip,
      isSecure: request.protocol === 'https',
      protocols: offered
        .split(',')
        .map((protocol) => protocol.trim())
        .filter((protocol) => protocol.length > 0),
      authorization: request.headers.authorization ?? null,
    });
  }
}
