import { ChargerConnection } from '../connection/charger-connection';

/** What a handler gives back: the CALLRESULT payload, and work to do once it has been sent. */
export interface HandlerResult {
  reply: unknown;
  after?: () => Promise<void> | void;
}

/** One class per OCPP action the charger may send: validate is done before, this maps and stores. */
export interface ActionHandler {
  readonly action: string;
  handle(connection: ChargerConnection, payload: unknown): Promise<HandlerResult>;
}
