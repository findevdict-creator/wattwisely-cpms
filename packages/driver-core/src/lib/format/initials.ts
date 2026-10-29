/** Two letters for an avatar: "Jordan Smith" as JS, "VoltHub" as VH, "maya@acme.test" as MA. */
export class Initials {
  static of(name: string): string {
    const capitals = [...name.matchAll(/(?:^|\s)(\p{L})|(\p{Lu})/gu)].map(
      (match) => match[1] ?? match[2],
    );
    const letters = capitals.length >= 2 ? capitals.join('') : name.replace(/[\s@.]/g, '');
    return letters.slice(0, 2).toUpperCase();
  }
}
