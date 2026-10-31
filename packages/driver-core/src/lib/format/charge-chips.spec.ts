import { ChargeChips } from './charge-chips';

describe('ChargeChips', () => {
  it('gives a charge in progress the live chip and a finished one a plain one', () => {
    expect(ChargeChips.session('charging')).toEqual({ tone: 'live', label: 'Charging' });
    expect(ChargeChips.session('completed')).toEqual({ tone: 'neutral', label: 'Done' });
    expect(ChargeChips.session('not_started').tone).toBe('danger');
    expect(ChargeChips.session('new_state')).toEqual({ tone: 'neutral', label: 'new_state' });
  });

  it('colours a plug by whether it can be used', () => {
    expect(ChargeChips.availability('available')).toEqual({
      tone: 'live',
      label: 'Available',
    });
    expect(ChargeChips.availability('busy').tone).toBe('warn');
    expect(ChargeChips.availability('faulted').tone).toBe('danger');
  });

  it('knows which charges may still be charging', () => {
    expect(ChargeChips.isUnderWay('idle')).toBe(true);
    expect(ChargeChips.isUnderWay('completed')).toBe(false);
  });
});
