import { IsTimeZoneConstraint } from './is-time-zone.constraint';

describe('IsTimeZoneConstraint', () => {
  const constraint = new IsTimeZoneConstraint();

  it('accepts IANA zone names and UTC', () => {
    expect(constraint.validate('Europe/London')).toBe(true);
    expect(constraint.validate('America/Sao_Paulo')).toBe(true);
    expect(constraint.validate('UTC')).toBe(true);
  });

  it('refuses anything else', () => {
    expect(constraint.validate('GMT+1')).toBe(false);
    expect(constraint.validate('London')).toBe(false);
    expect(constraint.validate(3)).toBe(false);
  });
});
