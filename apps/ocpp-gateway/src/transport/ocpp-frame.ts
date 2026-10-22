import { OcppErrorCode } from './ocpp-call-error';

/** A CALL from the other side: `[2, id, action, payload]`. */
export interface CallFrame {
  type: 'call';
  id: string;
  action: string;
  payload: unknown;
}

/** A CALLRESULT: `[3, id, payload]`. */
export interface CallResultFrame {
  type: 'call_result';
  id: string;
  payload: unknown;
}

/** A CALLERROR: `[4, id, code, description, details]`. */
export interface CallErrorFrame {
  type: 'call_error';
  id: string;
  code: OcppErrorCode;
  description: string;
  details: unknown;
}

export type OcppFrame = CallFrame | CallResultFrame | CallErrorFrame;
