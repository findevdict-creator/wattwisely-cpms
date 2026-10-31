import { ChargeWords } from './charge-words';

describe('ChargeWords', () => {
  it('explains a failed charge, with the provider’s words when the card was refused', () => {
    expect(ChargeWords.failure('declined', 'Insufficient funds.')).toBe(
      'The card was refused: Insufficient funds.',
    );
    expect(ChargeWords.failure('declined', null)).toMatch(/refused or never confirmed/);
    expect(ChargeWords.failure('start_timeout', null)).toMatch(/did not start in time/);
    expect(ChargeWords.failure(null, null)).toBe('Nothing was taken.');
  });

  it('falls back to the API’s own word for anything it does not know', () => {
    expect(ChargeWords.session('charging')).toBe('Charging');
    expect(ChargeWords.session('new_state')).toBe('new_state');
    expect(ChargeWords.connectorType('type2')).toBe('Type 2');
    expect(ChargeWords.connectorType('unknown')).toBe('');
  });
});
