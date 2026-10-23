import { LimitPipe } from './limit.pipe';

describe('LimitPipe', () => {
  const pipe = new LimitPipe();

  it('shows the use against the limit, or "unlimited"', () => {
    expect(pipe.transform(7, 25)).toBe('7 / 25');
    expect(pipe.transform(3, null)).toBe('3 / unlimited');
  });
});
