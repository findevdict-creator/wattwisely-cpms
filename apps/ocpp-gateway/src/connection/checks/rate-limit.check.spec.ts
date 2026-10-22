import { GatewayConfig } from '../../config/gateway.config';
import { UpgradeRequest } from '../upgrade-request';
import { RateLimitCheck } from './rate-limit.check';

describe('RateLimitCheck', () => {
  const request = (identity: string, ip: string) =>
    new UpgradeRequest({
      identity,
      ip,
      isSecure: true,
      protocols: ['ocpp1.6'],
      authorization: null,
    });
  const check = new RateLimitCheck(
    Object.assign(new GatewayConfig(), { rateLimitPerCharger: 2, rateLimitPerIp: 3 }),
  );

  it('allows the configured attempts per charger identity and per address, then answers 429', () => {
    check.check(request('WW-1', '10.0.0.1'));
    check.check(request('ww-1', '10.0.0.2'));
    expect(() => check.check(request('WW-1', '10.0.0.3'))).toThrow(/too_many_attempts/);

    check.check(request('WW-2', '10.0.0.9'));
    check.check(request('WW-3', '10.0.0.9'));
    check.check(request('WW-4', '10.0.0.9'));
    expect(() => check.check(request('WW-5', '10.0.0.9'))).toThrow(/too_many_attempts/);
  });
});
