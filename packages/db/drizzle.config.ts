import { defineConfig } from 'drizzle-kit';

// Used only by "npx nx run db:generate-migration", which compares the schema
// with the last migration and writes the SQL for what changed. No database needed.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './migrations',
});
