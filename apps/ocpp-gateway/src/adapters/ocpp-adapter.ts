import { OcppVersion } from '@wattwisely/ocpp-contracts';
import { ActionHandler } from './action-handler';

/**
 * The inbound half of one OCPP version as the gateway speaks it: which messages from the
 * charger it handles and how their payloads must look. The outbound half (commands) is
 * the version's CommandTranslator. Everything else in the gateway (sockets, leases,
 * sessions, the command queue, the message log) is the same for every version.
 */
export interface OcppAdapter {
  readonly version: OcppVersion;
  /** The handler for an action the charger sent; throws NotImplemented for one it does not know. */
  handlerFor(action: string): ActionHandler;
  /** Throws the right OcppCallError when a payload does not match the version's schema. */
  validate(action: string, payload: unknown): void;
}
