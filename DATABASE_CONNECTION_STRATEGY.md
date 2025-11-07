# Database Connection Strategy

This project uses a **dual database connection** setup for optimal performance and reliability with Supabase + Next.js.

## Connection Types

### 1. Transaction Pooler (Port 6543) - PRIMARY ✅

**Environment Variable:** `DATABASE_URL`

**Use for:**
- ✅ All Next.js API routes (`/api/*`)
- ✅ Server Actions
- ✅ Server Components
- ✅ Runtime database queries
- ✅ All user-facing application traffic

**Why:**
- Optimized for serverless functions (short-lived connections)
- Handles thousands of concurrent requests
- Prevents "too many connections" errors
- Perfect for Vercel deployments
- Automatic connection pooling via PgBouncer

**Configuration:**
```env
DATABASE_URL=postgres://postgres:[PASSWORD]@db.[PROJECT].supabase.co:6543/postgres
```

---

### 2. Direct Connection (Port 5432) - ADMIN ONLY ⚙️

**Environment Variable:** `DIRECT_DATABASE_URL`

**Use for:**
- ⚙️ Database migrations (`drizzle-kit push`, `drizzle-kit migrate`)
- ⚙️ CLI tools and scripts
- ⚙️ Long-running ETL jobs
- ⚙️ Database backfills
- ⚙️ Heavy analytics queries

**Why:**
- Supports session-level features
- Required for certain migration operations
- Better for long-running queries
- Direct access without pooler overhead

**Configuration:**
```env
DIRECT_DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
```

---

## What Works Through Transaction Pooler?

✅ **Works fine:**
- Regular SELECT/INSERT/UPDATE/DELETE queries
- Short transactions
- Drizzle ORM operations
- Most SQL operations
- Transaction-scoped advisory locks (`pg_advisory_xact_lock()`)

❌ **Doesn't work (requires Direct Connection):**
- Session-level prepared statements
- Temporary tables lasting beyond a transaction
- `LISTEN/NOTIFY` (use Supabase Realtime instead)
- Session-scoped advisory locks
- Some `COPY`/streaming operations

---

## When Running Commands

### ✅ Use Transaction Pooler (default)
```bash
# App runs normally with DATABASE_URL
npm run dev
npm run build
vercel deploy
```

### ⚙️ Use Direct Connection
```bash
# Migrations and DB operations
npm run db:push    # Uses DIRECT_DATABASE_URL (via drizzle.config.ts)
npm run db:migrate # Uses DIRECT_DATABASE_URL
npx drizzle-kit studio # Uses DIRECT_DATABASE_URL

# Or override manually for scripts:
DATABASE_URL=$DIRECT_DATABASE_URL npm run your-script
```

---

## Configuration Files

### `drizzle.config.ts`
```typescript
dbCredentials: {
  // Migrations use DIRECT_DATABASE_URL
  url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL!,
}
```

### `src/db/index.ts`
```typescript
// Runtime queries use DATABASE_URL (transaction pooler)
export const db = drizzle(postgres(process.env.DATABASE_URL!), { schema });
```

---

## Benefits of This Approach

1. **Scalability**: Transaction pooler handles traffic spikes without connection exhaustion
2. **Reliability**: No "too many connections" errors in production
3. **Performance**: Optimal for serverless + Supabase combo
4. **Flexibility**: Direct connection available when needed for admin tasks
5. **Best Practice**: Recommended by Supabase for Next.js apps

---

## Troubleshooting

**Error: "getaddrinfo ENOTFOUND"**
- Make sure you're using port **6543** for `DATABASE_URL`
- Check that transaction pooler is enabled in Supabase dashboard

**Error: "too many connections"**
- Verify you're using transaction pooler (6543) for runtime queries
- Only use direct connection (5432) for migrations/scripts

**Migration fails**
- Make sure `DIRECT_DATABASE_URL` is set in your environment
- Check `drizzle.config.ts` is using `DIRECT_DATABASE_URL`

---

## References

- [Supabase Connection Pooling Docs](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Best Practices for Serverless](https://supabase.com/docs/guides/database/connecting-to-postgres#serverless-and-edge-functions)
