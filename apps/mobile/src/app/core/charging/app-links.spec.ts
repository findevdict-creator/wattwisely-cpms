import { AppLinks } from './app-links';

describe('AppLinks', () => {
  it("opens a plug's QR code and an invitation in the app", () => {
    expect(AppLinks.route('https://charge.example.com/c/WW-7KQ4M2XR9T/1')).toEqual([
      '/plug',
      'WW-7KQ4M2XR9T',
      '1',
    ]);
    expect(AppLinks.route('https://charge.example.com/invitations/abc123?x=1')).toEqual([
      '/invitations',
      'abc123',
    ]);
  });

  it('leaves the sign-in links and other addresses alone', () => {
    expect(AppLinks.route('com.wattwisely.driver:/callback?code=1')).toBeNull();
    expect(AppLinks.route('https://charge.example.com/account')).toBeNull();
  });
});
