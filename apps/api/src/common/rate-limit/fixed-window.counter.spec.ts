import { FixedWindowCounter } from './fixed-window.counter';

describe('FixedWindowCounter', () => {
  it('allows up to the limit in a minute, then says how long to wait', () => {
    const counter = new FixedWindowCounter();

    expect(counter.hit('ip:1', 2, 0).isAllowed).toBe(true);
    expect(counter.hit('ip:1', 2, 10_000).isAllowed).toBe(true);
    expect(counter.hit('ip:1', 2, 20_000)).toEqual({ isAllowed: false, retryAfterSeconds: 40 });
    expect(counter.hit('ip:2', 2, 20_000).isAllowed).toBe(true);
  });

  it('starts over when the minute is up', () => {
    const counter = new FixedWindowCounter();
    counter.hit('ip:1', 1, 0);

    expect(counter.hit('ip:1', 1, 59_999).isAllowed).toBe(false);
    expect(counter.hit('ip:1', 1, 60_000).isAllowed).toBe(true);
  });

  it('forgets finished windows so memory stays flat', () => {
    const counter = new FixedWindowCounter();
    for (let index = 0; index < FixedWindowCounter.SWEEP_EVERY - 1; index += 1) {
      counter.hit(`ip:${index}`, 10, 0);
    }
    expect(counter.size).toBe(FixedWindowCounter.SWEEP_EVERY - 1);

    counter.hit('ip:late', 10, 61_000);

    expect(counter.size).toBe(1);
  });
});
