/** What a driver asked for in a message (module 17). */
export type ChatCommand =
  | { kind: 'plug'; identity: string; ocppConnectorId: number }
  | { kind: 'stop' }
  | { kind: 'status' }
  | { kind: 'help' };

/**
 * Reads a driver's words, or a tapped button, as one of the few things the chat does: name a
 * plug ("charge WW-7KQ4M2XR9T/1", the text the sticker's link fills in), stop, ask for the
 * status, or anything else, which gets the help text. Pure.
 */
export class ChatCommandParser {
  static readonly BUTTON_STOP = 'stop';
  static readonly BUTTON_STATUS = 'status';
  static readonly STOP_WORDS = ['stop', 'end', 'finish', 'parar', 'stopp', 'arrêter', 'detener'];
  static readonly STATUS_WORDS = ['status', 'state', 'how', 'estado', 'progress', 'update'];
  /** "charge WW-7KQ4M2XR9T/1", "WW-7KQ4M2XR9T 1", "plug WW-7KQ4M2XR9T-1": an identity, a separator, a plug number. */
  private static readonly PLUG =
    /^(?:charge|start|plug|charger|load)?\s*([A-Za-z0-9][A-Za-z0-9_.-]*?)[\s/-]+(\d{1,3})\s*$/i;

  /** The text a plug's sticker link fills into the chat. */
  static plugText(identity: string, ocppConnectorId: number): string {
    return `charge ${identity}/${ocppConnectorId}`;
  }

  static parse(text: string): ChatCommand {
    const words = text.trim();
    const lower = words.toLowerCase();
    if (
      lower === ChatCommandParser.BUTTON_STOP ||
      ChatCommandParser.isOneOf(lower, ChatCommandParser.STOP_WORDS)
    ) {
      return { kind: 'stop' };
    }
    if (
      lower === ChatCommandParser.BUTTON_STATUS ||
      ChatCommandParser.isOneOf(lower, ChatCommandParser.STATUS_WORDS)
    ) {
      return { kind: 'status' };
    }
    const plug = ChatCommandParser.PLUG.exec(words);
    if (plug) {
      return { kind: 'plug', identity: plug[1], ocppConnectorId: Number(plug[2]) };
    }
    return { kind: 'help' };
  }

  /** The first word of the message is one of these. */
  private static isOneOf(lower: string, words: string[]): boolean {
    const first = lower.split(/[\s,.!?]+/)[0] ?? '';
    return words.includes(first);
  }
}
