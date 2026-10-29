import { PushWords } from './push-words';

describe('PushWords', () => {
  it('says what this phone allows, then whether pushes are on', () => {
    expect(PushWords.phone('unavailable', true)).toBe('Only in the app on a phone');
    expect(PushWords.phone('denied', true)).toMatch(/phone’s settings/);
    expect(PushWords.phone('granted', false)).toBe('Off on all your phones');
    expect(PushWords.phone('granted', true)).toBe('On this phone');
    expect(PushWords.phone('prompt', true)).toBe('This phone asks you first');
  });
});
