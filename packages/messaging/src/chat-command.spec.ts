import { ChatCommandParser } from './chat-command';

describe('ChatCommandParser', () => {
  it('reads the text a sticker link fills in', () => {
    expect(ChatCommandParser.parse(ChatCommandParser.plugText('WW-7KQ4M2XR9T', 1))).toEqual({
      kind: 'plug',
      identity: 'WW-7KQ4M2XR9T',
      ocppConnectorId: 1,
    });
  });

  it.each([
    ['WW-7KQ4M2XR9T 2', 'WW-7KQ4M2XR9T', 2],
    ['Charge acme-1/1', 'acme-1', 1],
    ['plug ACME_7-3', 'ACME_7', 3],
    ['  start CP001 12 ', 'CP001', 12],
  ])('reads "%s" as a plug', (text, identity, ocppConnectorId) => {
    expect(ChatCommandParser.parse(text)).toEqual({ kind: 'plug', identity, ocppConnectorId });
  });

  it.each(['stop', 'STOP', 'Stop please', 'end'])('reads "%s" as stop', (text) => {
    expect(ChatCommandParser.parse(text)).toEqual({ kind: 'stop' });
  });

  it.each(['status', 'Status?', 'how is it going'])('reads "%s" as status', (text) => {
    expect(ChatCommandParser.parse(text)).toEqual({ kind: 'status' });
  });

  it.each(['hello', 'charge', 'WW-7KQ4M2XR9T', '1234'])('answers "%s" with help', (text) => {
    expect(ChatCommandParser.parse(text)).toEqual({ kind: 'help' });
  });
});
