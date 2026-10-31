/** theme.json: named colors, the roles that use them and the colors of each status chip. */
export interface ThemeDefinition {
  name: string;
  version: number;
  fontFamily: string;
  palette: Record<string, string>;
  roles: Record<string, string>;
  status: Record<string, StatusColours>;
}

/** A status chip's colors, each a palette name or a hex value. */
export interface StatusColours {
  background: string;
  text: string;
  dot?: string;
}
