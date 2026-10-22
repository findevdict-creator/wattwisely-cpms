/** The OCPP 1.6J error codes a CALLERROR may carry (OCPP-J 1.6, section 4.2.3). */
export type OcppErrorCode =
  | 'NotImplemented'
  | 'NotSupported'
  | 'InternalError'
  | 'ProtocolError'
  | 'SecurityError'
  | 'FormationViolation'
  | 'PropertyConstraintViolation'
  | 'OccurenceConstraintViolation'
  | 'TypeConstraintViolation'
  | 'GenericError';

/** Thrown anywhere in the pipeline to answer the charger with a CALLERROR instead of a result. */
export class OcppCallError extends Error {
  constructor(
    readonly code: OcppErrorCode,
    readonly description: string,
    readonly details: object = {},
  ) {
    super(`${code}: ${description}`);
  }
}
