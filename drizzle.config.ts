import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/*',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // Use direct connection for migrations (not transaction pooler)
    url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL!,
  },
});
