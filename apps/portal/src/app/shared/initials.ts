/** Two letters for an avatar, and for a company a color that stays the same each time. */
export class Initials {
  /** Backgrounds for a company's square, from theme.json; the text on each is white. */
  static readonly TONES = [
    'var(--ww-ink)',
    'var(--ww-info)',
    'var(--ww-warning)',
    'var(--ww-brand-dark)',
  ];

  /** "Acme Charging" as AC, "VoltHub" as VH, "Maya" as MA. */
  static of(name: string): string {
    const capitals = [...name.matchAll(/(?:^|\s)(\p{L})|(\p{Lu})/gu)].map(
      (match) => match[1] ?? match[2],
    );
    const letters = capitals.length >= 2 ? capitals.join('') : name.replace(/\s/g, '');
    return letters.slice(0, 2).toUpperCase();
  }

  /** The same color for the same company, wherever it is shown. */
  static toneOf(id: string): string {
    const sum = [...id].reduce((total, char) => total + char.charCodeAt(0), 0);
    return Initials.TONES[sum % Initials.TONES.length];
  }
}
