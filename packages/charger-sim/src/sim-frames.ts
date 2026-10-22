/** A CALL the server sent the simulated charger. */
export interface IncomingCall {
  id: string;
  action: string;
  payload: unknown;
}

/** What the server answered to a CALL the simulated charger sent. */
export type SimReply =
  | { kind: 'result'; payload: unknown }
  | { kind: 'error'; code: string; description: string; details: unknown };

/** The OCPP-J framing, as a charger sees it. Kept apart from the gateway's codec on purpose: a test double must not share code with the thing it tests. */
export class SimFrames {
  static readonly CALL = 2;
  static readonly CALL_RESULT = 3;
  static readonly CALL_ERROR = 4;

  static call(id: string, action: string, payload: unknown): string {
    return JSON.stringify([SimFrames.CALL, id, action, payload]);
  }

  static result(id: string, payload: unknown): string {
    return JSON.stringify([SimFrames.CALL_RESULT, id, payload]);
  }

  static error(id: string, code: string, description: string): string {
    return JSON.stringify([SimFrames.CALL_ERROR, id, code, description, {}]);
  }

  /** Decodes a frame from the server; null for anything that is not OCPP-J. */
  static decode(text: string): { id: string; call?: IncomingCall; reply?: SimReply } | null {
    let fields: unknown[];
    try {
      fields = JSON.parse(text) as unknown[];
    } catch {
      return null;
    }
    if (!Array.isArray(fields) || typeof fields[1] !== 'string') {
      return null;
    }
    const id = fields[1];
    switch (fields[0]) {
      case SimFrames.CALL:
        return { id, call: { id, action: String(fields[2]), payload: fields[3] } };
      case SimFrames.CALL_RESULT:
        return { id, reply: { kind: 'result', payload: fields[2] } };
      case SimFrames.CALL_ERROR:
        return {
          id,
          reply: {
            kind: 'error',
            code: String(fields[2]),
            description: String(fields[3] ?? ''),
            details: fields[4],
          },
        };
      default:
        return null;
    }
  }
}
