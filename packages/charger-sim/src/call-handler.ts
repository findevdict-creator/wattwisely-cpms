/** Answers a CALL from the server: return the CALLRESULT payload, or throw to send a CALLERROR. */
export type CallHandler = (payload: unknown) => unknown | Promise<unknown>;
