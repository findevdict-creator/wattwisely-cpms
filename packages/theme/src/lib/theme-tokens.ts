import { StatusColours, ThemeDefinition } from './theme-definition';

/**
 * theme.json as CSS custom properties. A palette color becomes `--ww-<name>`; a role becomes
 * Material's `--mat-sys-<role>` (or `--ww-<role>` for the platform's own roles, such as
 * `link`) pointing at the palette; a status chip becomes `--ww-status-<status>-<part>`.
 */
export class ThemeTokens {
  /** Roles that are the platform's own rather than Material system colors. */
  static readonly OWN_ROLES = ['link'];
  static readonly HEX = /^#[0-9a-fA-F]{6}$/;

  constructor(private readonly theme: ThemeDefinition) {}

  /** Every custom property in file order: fonts, palette, roles, status chips. */
  properties(): [string, string][] {
    return [
      ['--ww-font', this.fontStack()],
      ...this.paletteProperties(),
      ...this.roleProperties(),
      ...this.statusProperties(),
    ];
  }

  /** A palette name or a hex value, as the hex value it stands for. */
  hex(colour: string): string {
    const hex = this.theme.palette[colour] ?? colour;
    if (!ThemeTokens.HEX.test(hex)) {
      throw new Error(`theme.json: "${colour}" is neither a palette name nor a #rrggbb value`);
    }
    return hex;
  }

  /** "brandDark" as "brand-dark". */
  static kebab(name: string): string {
    return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  }

  /** The bundled variable font registers its family as "<name> Variable". */
  private fontStack(): string {
    const family = this.theme.fontFamily;
    return `'${family} Variable', '${family}', system-ui, sans-serif`;
  }

  private paletteProperties(): [string, string][] {
    return Object.keys(this.theme.palette).map((name) => [
      `--ww-${ThemeTokens.kebab(name)}`,
      this.hex(name),
    ]);
  }

  private roleProperties(): [string, string][] {
    return Object.entries(this.theme.roles).map(([role, colour]) => {
      const prefix = ThemeTokens.OWN_ROLES.includes(role) ? '--ww-' : '--mat-sys-';
      return [`${prefix}${ThemeTokens.kebab(role)}`, this.reference(colour)];
    });
  }

  private statusProperties(): [string, string][] {
    return Object.entries(this.theme.status).flatMap(([status, colours]) =>
      (Object.keys(colours) as (keyof StatusColours)[]).map((part): [string, string] => [
        `--ww-status-${ThemeTokens.kebab(status)}-${part}`,
        this.reference(colours[part] ?? ''),
      ]),
    );
  }

  /** A palette name as its variable, so a later palette override reaches the role too. */
  private reference(colour: string): string {
    const hex = this.hex(colour);
    return colour === hex ? hex : `var(--ww-${ThemeTokens.kebab(colour)})`;
  }
}
