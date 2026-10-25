import { StartSourceWords } from './start-source-words';

describe('StartSourceWords', () => {
  it('names each way a session can start', () => {
    expect(StartSourceWords.of('rfid_card')).toBe('RFID card');
    expect(StartSourceWords.of('account')).toBe('Driver app');
    expect(StartSourceWords.of(null)).toBe('');
    expect(StartSourceWords.of('something_new')).toBe('something_new');
  });
});
