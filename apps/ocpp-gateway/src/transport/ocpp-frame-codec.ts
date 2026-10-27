import { OcppVersion } from '@wattwisely/ocpp-contracts';
import { OcppCallError, OcppErrorCode } from './ocpp-call-error';
import { CallErrorFrame, CallResultFrame, OcppFrame } from './ocpp-frame';

/**
 * Reads and writes OCPP-J frames: `[2, id, action, payload]`, `[3, id, payload]` and
 * `[4, id, code, description, details]`. Anything else is a FormationViolation.
 */
export class OcppFrameCodec {
  static readonly CALL = 2;
  static readonly CALL_RESULT = 3;
  static readonly CALL_ERROR = 4;
  static readonly MAX_ID_LENGTH = 36;

  static decode(text: string): OcppFrame {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new OcppCallError('FormationViolation', 'The message is not valid JSON.');
    }
    if (!Array.isArray(parsed) || typeof parsed[1] !== 'string' || !parsed[1]) {
      throw new OcppCallError(
        'FormationViolation',
        'A message is an array starting with its type and id.',
      );
    }
    const frame = OcppFrameCodec.toFrame(parsed);
    if (!frame) {
      throw new OcppCallError(
        'FormationViolation',
        'Unknown message type or wrong number of fields.',
      );
    }
    return frame;
  }

  /** The message id of a frame that could not be decoded, if there is one to reply to. */
  static idOf(text: string): string | null {
    try {
      const parsed: unknown = JSON.parse(text);
      return Array.isArray(parsed) && typeof parsed[1] === 'string' ? parsed[1] : null;
    } catch {
      return null;
    }
  }

  static encodeCall(id: string, action: string, payload: unknown): string {
    return JSON.stringify([OcppFrameCodec.CALL, id, action, payload]);
  }

  static encodeResult(id: string, payload: unknown): string {
    return JSON.stringify([OcppFrameCodec.CALL_RESULT, id, payload]);
  }

  /** The error code is spelt the way the charger's version spells it (FormatViolation in 2.0.1). */
  static encodeError(id: string, error: OcppCallError, version: OcppVersion = '1.6'): string {
    return JSON.stringify([
      OcppFrameCodec.CALL_ERROR,
      id,
      error.codeFor(version),
      error.description,
      error.details,
    ]);
  }

  private static toFrame(fields: unknown[]): OcppFrame | null {
    const [type, id] = fields as [number, string];
    if (type === OcppFrameCodec.CALL && fields.length === 4 && typeof fields[2] === 'string') {
      return { type: 'call', id, action: fields[2], payload: fields[3] };
    }
    if (type === OcppFrameCodec.CALL_RESULT && fields.length === 3) {
      return { type: 'call_result', id, payload: fields[2] } as CallResultFrame;
    }
    if (
      type === OcppFrameCodec.CALL_ERROR &&
      fields.length === 5 &&
      typeof fields[2] === 'string'
    ) {
      return {
        type: 'call_error',
        id,
        code: fields[2] as OcppErrorCode,
        description: String(fields[3] ?? ''),
        details: fields[4],
      } as CallErrorFrame;
    }
    return null;
  }
}
