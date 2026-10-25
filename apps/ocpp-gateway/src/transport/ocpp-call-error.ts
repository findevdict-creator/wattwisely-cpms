import { OcppVersion } from '@wattwisely/ocpp-contracts';

/**
 * The error codes a CALLERROR may carry (OCPP-J 1.6 section 4.2.3; OCPP 2.0.1 part 4
 * section 4.3). Two of them are spelt differently in 2.0.1: the gateway thinks in the
 * 1.6 words and `OcppCallError.codeFor` writes them the way the charger's version does.
 */
export type OcppErrorCode =
  | 'NotImplemented'
  | 'NotSupported'
  | 'InternalError'
  | 'ProtocolError'
  | 'SecurityError'
  | 'FormationViolation'
  | 'FormatViolation'
  | 'PropertyConstraintViolation'
  | 'OccurenceConstraintViolation'
  | 'OccurrenceConstraintViolation'
  | 'TypeConstraintViolation'
  | 'MessageTypeNotSupported'
  | 'RpcFrameworkError'
  | 'GenericError';

/** Thrown anywhere in the pipeline to answer the charger with a CALLERROR instead of a result. */
export class OcppCallError extends Error {
  /** The 1.6 spellings and their 2.0.1 counterparts. */
  static readonly OCPP201_SPELLING: Partial<Record<OcppErrorCode, OcppErrorCode>> = {
    FormationViolation: 'FormatViolation',
    OccurenceConstraintViolation: 'OccurrenceConstraintViolation',
  };

  constructor(
    readonly code: OcppErrorCode,
    readonly description: string,
    readonly details: object = {},
  ) {
    super(`${code}: ${description}`);
  }

  /** The code as the charger's OCPP version spells it. */
  codeFor(version: OcppVersion): OcppErrorCode {
    return version === '2.0.1'
      ? (OcppCallError.OCPP201_SPELLING[this.code] ?? this.code)
      : this.code;
  }
}
