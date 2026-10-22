import { ApiConfig } from '../../../config/api.config';
import { ChargeUrlBuilder } from './charge-url.builder';

describe('ChargeUrlBuilder', () => {
  const builder = new ChargeUrlBuilder({ driverUrl: 'https://charge.example.com/' } as ApiConfig);

  it('points at the driver app’s page for the charger and plug', () => {
    expect(builder.forConnector('WW-7KQ4M2XR9T', 2)).toBe(
      'https://charge.example.com/c/WW-7KQ4M2XR9T/2',
    );
  });

  it('keeps an odd identity inside one path segment', () => {
    expect(builder.forConnector('CP 1/A', 1)).toBe('https://charge.example.com/c/CP%201%2FA/1');
  });
});
