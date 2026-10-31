import { PlugCode } from './plug-code';

describe('PlugCode', () => {
  it("reads the plug from the QR code's address", () => {
    expect(PlugCode.parse('https://charge.example.com/c/WW-7KQ4M2XR9T/1')).toEqual({
      identity: 'WW-7KQ4M2XR9T',
      connector: '1',
    });
    expect(PlugCode.parse('http://charge.localhost/c/CP%2F7/02?utm=sticker')).toEqual({
      identity: 'CP/7',
      connector: '2',
    });
  });

  it('reads a code typed by hand, with a slash or a space', () => {
    expect(PlugCode.parse(' WW-7KQ4M2XR9T/3 ')).toEqual({
      identity: 'WW-7KQ4M2XR9T',
      connector: '3',
    });
    expect(PlugCode.parse('SIM-001 1')).toEqual({ identity: 'SIM-001', connector: '1' });
  });

  it('turns anything else away', () => {
    expect(PlugCode.parse('https://example.com/menu')).toBeNull();
    expect(PlugCode.parse('WW-7KQ4M2XR9T')).toBeNull();
    expect(PlugCode.parse('https://charge.example.com/c/%E0%A4%A/1')).toBeNull();
  });

  it("names the app's page for the plug", () => {
    expect(PlugCode.route({ identity: 'SIM-001', connector: '1' })).toEqual([
      '/plug',
      'SIM-001',
      '1',
    ]);
  });
});
