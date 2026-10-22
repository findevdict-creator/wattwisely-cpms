import { ChargeKey, ParsedChargeKey } from './charge-key';

describe('ChargeKey', () => {
  const tenantId = '01a16471-0709-747d-8150-b9f59d050178';
  const paymentId = '01a16471-09cc-7363-a9ae-61b0de33b182';

  it('names the tenant and the payment, and proves itself with the secret', () => {
    const { key, hash } = ChargeKey.issue(tenantId, paymentId);

    expect(key).toHaveLength(75);
    const parsed = ChargeKey.parse(key) as ParsedChargeKey;
    expect(parsed).toMatchObject({ tenantId, paymentId });
    expect(ChargeKey.isValid(parsed, hash)).toBe(true);
  });

  it('refuses a key of the wrong shape or with another secret', () => {
    const { key, hash } = ChargeKey.issue(tenantId, paymentId);
    const other = ChargeKey.issue(tenantId, paymentId);

    expect(ChargeKey.parse('not-a-key')).toBeNull();
    expect(ChargeKey.parse(key.slice(1))).toBeNull();
    expect(ChargeKey.isValid(ChargeKey.parse(other.key) as ParsedChargeKey, hash)).toBe(false);
  });
});
