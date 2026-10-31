import { ChargeSteps } from './charge-steps';

describe('ChargeSteps', () => {
  it('marks the steps behind, at and ahead of the phase', () => {
    expect(ChargeSteps.of('charging').map((step) => step.state)).toEqual([
      'done',
      'done',
      'now',
      'todo',
    ]);
    expect(ChargeSteps.of('card')[0]).toEqual({ label: 'Paid', state: 'now' });
    expect(ChargeSteps.of('finishing')[3].state).toBe('now');
  });

  it('shows the bar only while the charge is under way', () => {
    expect(ChargeSteps.isShown('starting')).toBe(true);
    expect(ChargeSteps.isShown('done')).toBe(false);
    expect(ChargeSteps.isShown('failed')).toBe(false);
  });
});
