import { SseParser } from './sse-parser';

describe('SseParser', () => {
  it('reads events however the chunks are cut, and skips comments', () => {
    const parser = new SseParser();
    expect(parser.push(': keep-alive\n\nevent: connector.st')).toEqual([]);
    expect(parser.push('atus\ndata: {"a":1}\n')).toEqual([]);
    expect(parser.push('\ndata: one\ndata: two\n\n')).toEqual([
      { event: 'connector.status', data: '{"a":1}' },
      { event: 'message', data: 'one\ntwo' },
    ]);
  });

  it('accepts CRLF line ends and fields without a space after the colon', () => {
    const parser = new SseParser();
    expect(parser.push('event:x\r\ndata:y\r\n\r\n')).toEqual([{ event: 'x', data: 'y' }]);
  });
});
