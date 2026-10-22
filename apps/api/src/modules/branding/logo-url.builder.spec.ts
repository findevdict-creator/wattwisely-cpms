import { ApiConfig } from '../../config/api.config';
import { LogoUrlBuilder } from './logo-url.builder';

describe('LogoUrlBuilder', () => {
  it('points at the public logo endpoint with the fingerprint as the cache key', () => {
    const builder = new LogoUrlBuilder({ apiUrl: 'https://api.example.com/' } as ApiConfig);

    expect(builder.for('acme-charging', '0123456789abcdef')).toBe(
      'https://api.example.com/v1/public/branding/acme-charging/logo?v=0123456789abcdef',
    );
  });
});
