import { OcppErrorCode } from './ocpp-call-error';

/** What came back for a CALL the gateway sent: a result, an error, nothing in time, or the socket closed. */
export type CallReply =
  | { kind: 'result'; payload: unknown }
  | { kind: 'error'; code: OcppErrorCode; description: string; details: unknown }
  | { kind: 'timeout' }
  | { kind: 'closed' };
