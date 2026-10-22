/** How the simulated charger presents itself. */
export interface ChargerOptions {
  /** The gateway's OCPP base URL, e.g. ws://localhost:3100/ocpp. */
  url: string;
  identity: string;
  password?: string;
  /** The subprotocols to offer; the default is OCPP 1.6J's. */
  protocols?: string[];
  vendor?: string;
  model?: string;
  serial?: string;
  firmwareVersion?: string;
  /** How long to wait for the gateway's reply to a call. */
  replyTimeoutMs?: number;
}
