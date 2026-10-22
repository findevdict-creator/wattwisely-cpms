/** Default connector labels: A, B, C… the first letter no connector on the charger uses yet. */
export class ConnectorLabel {
  static readonly LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  static next(taken: string[]): string {
    const used = new Set(taken.map((label) => label.toUpperCase()));
    for (const letter of ConnectorLabel.LETTERS) {
      if (!used.has(letter)) {
        return letter;
      }
    }
    return `${ConnectorLabel.LETTERS.length + 1 + taken.length}`;
  }
}
