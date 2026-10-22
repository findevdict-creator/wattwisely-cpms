import { ConnectorLabel } from './connector-label';

describe('ConnectorLabel', () => {
  it('hands out the first free letter', () => {
    expect(ConnectorLabel.next([])).toBe('A');
    expect(ConnectorLabel.next(['A'])).toBe('B');
    expect(ConnectorLabel.next(['b', 'A', 'Left'])).toBe('C');
    expect(ConnectorLabel.next(['A', 'C'])).toBe('B');
  });

  it('falls back to numbers once the alphabet is used up', () => {
    expect(ConnectorLabel.next([...ConnectorLabel.LETTERS])).toBe('53');
  });
});
