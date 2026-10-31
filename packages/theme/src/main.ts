import { ThemeFiles } from './lib/theme-files';

// Writes the files generated from theme.json. Run from the workspace root: npx nx run theme:generate
for (const path of new ThemeFiles(process.cwd()).write()) {
  console.log(`wrote ${path}`);
}
