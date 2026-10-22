/** One server-sent event, as the stream carries it. */
export interface SseMessage {
  event: string;
  data: string;
}

/**
 * Turns the text of a server-sent event stream into messages, however the chunks are
 * cut. Browsers' EventSource cannot send our headers, so the portal reads the stream
 * with fetch and parses it here (the format is the WHATWG one: "event:", "data:", blank line).
 */
export class SseParser {
  private buffer = '';
  private event = '';
  private data: string[] = [];

  /** The messages completed by this chunk. */
  push(chunk: string): SseMessage[] {
    this.buffer += chunk;
    const messages: SseMessage[] = [];
    let newline = this.buffer.indexOf('\n');
    while (newline >= 0) {
      const line = this.buffer.slice(0, newline).replace(/\r$/, '');
      this.buffer = this.buffer.slice(newline + 1);
      const message = this.takeLine(line);
      if (message) {
        messages.push(message);
      }
      newline = this.buffer.indexOf('\n');
    }
    return messages;
  }

  /** A blank line ends a message; comments (": ...") and unknown fields are ignored. */
  private takeLine(line: string): SseMessage | null {
    if (line === '') {
      return this.flush();
    }
    if (line.startsWith(':')) {
      return null;
    }
    const colon = line.indexOf(':');
    const field = colon < 0 ? line : line.slice(0, colon);
    const value = colon < 0 ? '' : line.slice(colon + 1).replace(/^ /, '');
    if (field === 'event') {
      this.event = value;
    } else if (field === 'data') {
      this.data.push(value);
    }
    return null;
  }

  private flush(): SseMessage | null {
    if (this.data.length === 0 && this.event === '') {
      return null;
    }
    const message = { event: this.event || 'message', data: this.data.join('\n') };
    this.event = '';
    this.data = [];
    return message;
  }
}
