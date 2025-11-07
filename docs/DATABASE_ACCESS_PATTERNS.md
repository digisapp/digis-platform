# Database Access Patterns

This document defines when to use Drizzle ORM vs Supabase JS for database operations.

## TL;DR

- **Supabase JS (REST)**: Simple CRUD, RLS-enforced user operations
- **Drizzle ORM**: Complex queries, joins, transactions, analytics, money operations

## The Rules

### ✅ Use Supabase JS (`@/lib/data/user.ts`) when:

1. **Simple CRUD** on a single table (or one FK hop)
2. **RLS enforcement** needed using the user's JWT
3. **Client-initiated user ops**: profile edit, follow/unfollow, send message
4. **Simple admin ops**: filter/paginate with service role (server-only)

**Examples:**
- User profile lookups
- Following/unfollowing
- Simple message operations
- Admin user management with filters

### ✅ Use Drizzle ORM (`@/lib/data/system.ts`) when:

1. **Joins, aggregations, analytics**, complex WHERE logic
2. **Transactions / row locks / idempotency** (wallet, gifts, call billing)
3. **Materialized views, CTEs**, or performance tuning with indexes
4. **Deterministic SQL** for money or auditing
5. **Money paths** - MUST be Drizzle + SQL tx + idempotency + unique constraints

**Examples:**
- Creator analytics dashboard
- Stream gifting (wallet transactions)
- Video call billing
- Ticketed show purchases
- Financial reporting

## Required Configuration

### For Drizzle Routes (Node Runtime Required)

**Every route/API handler using Drizzle MUST include:**

```typescript
// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
```

**Never import Drizzle in:**
- ❌ Client components (`'use client'`)
- ❌ Edge runtime routes
- ❌ Browser-side code

### Database URLs

```bash
# Transaction Pooler (port 6543) - Use for Drizzle
DATABASE_URL=postgres://...@db.xxx.supabase.co:6543/postgres

# Direct Connection (port 5432) - Only for migrations/backfills
DIRECT_DATABASE_URL=postgresql://...@db.xxx.supabase.co:5432/postgres
```

### Connection Pooling

The Drizzle singleton pool in `src/db/index.ts` is configured with:
```typescript
{
  prepare: false,        // Required for transaction pooler
  max: 3,               // Max 3 connections per serverless instance
  idle_timeout: 20,     // Close idle connections after 20s
  connect_timeout: 10,  // 10s connection timeout
  ssl: 'require'        // Require SSL for Supabase
}
```

## Current Implementation Status

### Using Supabase JS (REST) ✓
- `/api/user/profile` - Simple user lookup
- `/api/user/me` - Auth user scoped by JWT
- `AdminService` - Admin operations with service role
- `/api/auth/signup` - Supabase Auth domain
- Username check endpoints - Simple uniqueness checks

### Using Drizzle ORM (Node Runtime) ✓
- `/api/creator/analytics` - Complex aggregations
- `StreamService` - Joins, viewer counts, real-time data
- `/api/streams/**` - All streaming operations (25+ routes)
- `WalletService` - Financial transactions
- `CallService` - Call billing and tracking
- `ShowService` - Ticketed show purchases
- `/api/profile/[username]/**` - Profile with follows/followers
- `/api/explore` - Complex user discovery queries
- `/api/calls/**` - Call management
- `/api/shows/**` - Show management

## When to Migrate a REST Endpoint to Drizzle

Ask three questions:

1. **Do we need a transaction or row lock?**
2. **Do we need multi-table joins/aggregations for performance?**
3. **Do we need a custom index/plan that's easier to express in SQL?**

If **YES** to any → Migrate to Drizzle (with Node runtime)

## Code Organization

```
src/lib/data/
├── user.ts      # Supabase JS client (RLS-enabled, user operations)
└── system.ts    # Drizzle ORM (complex queries, transactions)
```

### Import Examples

```typescript
// User-scoped operation with RLS
import { userClient } from '@/lib/data/user';
const supabase = await userClient();
const { data } = await supabase.from('follows').insert({ ... });
```

```typescript
// System operation with Drizzle (requires Node runtime)
import { db, users, streams } from '@/lib/data/system';
const analytics = await db
  .select({ totalViews: sql`sum(views)` })
  .from(streams)
  .where(eq(streams.creatorId, userId));
```

## Money Operations - Special Rules

**ALL financial operations MUST:**

1. ✅ Use Drizzle with Node runtime
2. ✅ Use SQL transactions
3. ✅ Include idempotency keys
4. ✅ Have `UNIQUE` constraints on idempotency columns
5. ✅ Include proper error handling and rollback
6. ❌ NEVER use Supabase REST for money operations

**Example:**
```typescript
await db.transaction(async (tx) => {
  // Debit sender
  await tx.update(wallets)
    .set({ balance: sql`balance - ${amount}` })
    .where(eq(wallets.userId, senderId));

  // Credit recipient
  await tx.update(wallets)
    .set({ balance: sql`balance + ${amount}` })
    .where(eq(wallets.userId, recipientId));

  // Record transaction with idempotency key
  await tx.insert(walletTransactions).values({
    idempotencyKey: uniqueKey,
    amount,
    // ... other fields
  });
});
```

## Anti-Patterns to Avoid

❌ **Don't**: Convert complex queries to REST to "standardize"
❌ **Don't**: Use Drizzle in client components
❌ **Don't**: Mix REST and Drizzle for the same money operation
❌ **Don't**: Use direct DB URL (5432) in production routes
❌ **Don't**: Forget `runtime = 'nodejs'` on Drizzle routes

✅ **Do**: Use the right tool for the job
✅ **Do**: Keep simple CRUD on REST
✅ **Do**: Use Drizzle for complex/money operations
✅ **Do**: Use transaction pooler (6543) for all Drizzle
✅ **Do**: Document which pattern each new endpoint uses

## Testing Checklist

Before deploying a new endpoint:

- [ ] Does it import from `@/db` or `@/lib/data/system`?
  - [ ] If yes: Has `export const runtime = 'nodejs'`
  - [ ] If yes: Uses DATABASE_URL with port 6543
  - [ ] If yes: Not used in client components
- [ ] Does it handle money?
  - [ ] Uses Drizzle transactions
  - [ ] Has idempotency key
  - [ ] Has proper error handling
- [ ] Does it use Supabase JS?
  - [ ] Simple CRUD or RLS enforcement
  - [ ] Not handling complex joins or money

## Future Improvements

- [ ] Add CI test that fails if Drizzle imports are in Edge/client code
- [ ] Add database indexes based on query patterns
- [ ] Consider materialized views for complex analytics
- [ ] Add query performance monitoring
- [ ] Document RLS policies for user-scoped tables
