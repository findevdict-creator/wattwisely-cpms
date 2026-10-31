import { AppIconPngs } from '../lib/app-icon-pngs';
import { ThemeFiles } from '../lib/theme-files';

// Draws the mobile app's icons and splash screen as PNG. Run from the workspace root after a
// change to the logo or its color: npx nx run theme:icons
const root = process.cwd();
new AppIconPngs(root)
  .write(new ThemeFiles(root).theme())
  .then((paths) => paths.forEach((path) => console.log(`wrote ${path}`)));
