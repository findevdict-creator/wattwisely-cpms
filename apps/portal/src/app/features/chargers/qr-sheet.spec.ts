import { QrSheet } from './qr-sheet';

describe('QrSheet', () => {
  const code = {
    connector_id: 'c1',
    ocpp_connector_id: 1,
    label: 'A',
    url: 'https://charge.example.com/c/WW-7KQ4M2XR9T/1',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"></svg>',
  };

  it('puts one sticker per plug on the sheet, with the drawing as it came', () => {
    const html = QrSheet.html({ chargerIdentity: 'WW-7KQ4M2XR9T', siteName: 'Riverside' }, [
      code,
      { ...code, label: 'B', url: 'https://charge.example.com/c/WW-7KQ4M2XR9T/2' },
    ]);

    expect(html).toContain('<title>QR codes for WW-7KQ4M2XR9T</title>');
    expect(html).toContain('<h2>Plug A</h2>');
    expect(html).toContain('<h2>Plug B</h2>');
    expect(html).toContain(code.svg);
    expect(html).toContain('https://charge.example.com/c/WW-7KQ4M2XR9T/2');
    expect(html).toContain('window.print()');
  });

  it('escapes the words that come from people', () => {
    const html = QrSheet.html({ chargerIdentity: 'A<B', siteName: 'Tom & Jerry' }, [
      { ...code, label: '"Left"' },
    ]);

    expect(html).toContain('QR codes for A&lt;B');
    expect(html).toContain('Tom &amp; Jerry');
    expect(html).toContain('Plug &quot;Left&quot;');
  });
});
