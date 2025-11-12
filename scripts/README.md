# Admin Scripts

This directory contains administrative scripts for managing the Digis platform.

## Table of Contents

1. [Environment Check](#environment-check)
2. [Backfill User Roles (TypeScript)](#backfill-user-roles-typescript)
3. [Backfill User Roles (SQL)](#backfill-user-roles-sql)
4. [Operational Checklist](#operational-checklist)

---

## Environment Check

**File**: `check-env.ts`

Verifies that all required environment variables are properly configured for the role persistence system.

### Usage

```bash
npx tsx scripts/check-env.ts
```

### What It Checks

1. ✅ `NEXT_PUBLIC_SUPABASE_URL` is set
2. ✅ `SUPABASE_SERVICE_ROLE_KEY` is set and formatted correctly
3. ✅ `DATABASE_URL` is set and using recommended pooler settings
4. ✅ Supabase Admin Client can connect successfully

### Expected Output

```
🔍 Checking environment configuration...

1️⃣  Checking NEXT_PUBLIC_SUPABASE_URL...
   ✅ Found: https://xxx.supabase.co

2️⃣  Checking SUPABASE_SERVICE_ROLE_KEY...
   ✅ Found: eyJ...
   ✅ Format looks correct (JWT)

3️⃣  Checking DATABASE_URL...
   ✅ Found
   ✅ Using transaction pooler (port 6543) - recommended for Vercel

4️⃣  Testing Supabase Admin Client...
   ✅ Admin client working correctly

📊 Environment Check Summary
✅ Passed:   4
⚠️  Warnings: 0
❌ Failed:   0

🎉 All environment checks passed!
```

---

## Backfill User Roles (TypeScript)

**File**: `backfill-user-roles.ts`

Updates all existing creators and admins to have their role stored in Supabase auth `app_metadata`. This ensures the role is embedded in the JWT token, preventing role switching issues.

### Prerequisites

1. **Environment Variables**: Ensure these are set in your `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJxxx...  # ⚠️ Server-only! Never in browser
   DATABASE_URL=postgresql://postgres.xxx:password@host:6543/postgres
   ```

2. **Dependencies**: Install required packages:
   ```bash
   npm install
   ```

3. **Verify Environment**: Run the environment check first:
   ```bash
   npx tsx scripts/check-env.ts
   ```

### Running the Backfill

**⚠️ IMPORTANT**: This script uses the Supabase Admin API and will modify user authentication metadata. Run it carefully.

```bash
npx tsx scripts/backfill-user-roles.ts
```

### What It Does

1. Verifies JWT roles BEFORE backfill (samples first 5 users)
2. Queries the database for all users with `role = 'creator'` or `role = 'admin'`
3. Checks each user's current JWT role and skips if already correct
4. Updates each user's Supabase auth record to include:
   - `app_metadata.role` - The user's role (stored in JWT)
   - `user_metadata.is_creator_verified` - Creator verification status
   - `user_metadata.display_name` - Display name
5. Verifies JWT roles AFTER backfill (samples first 5 users)
6. Outputs progress and summary statistics

### Expected Output

```
🚀 Starting user role backfill...

📊 Found 15 users to update:

   - 12 creators
   - 3 admins

🔍 Checking JWT roles before backfill (sampling first 5 users)...
   2/5 sampled users already have JWT role

✅ [1/15] Updated miriam@example.com → creator
⏭️  [2/15] Skipped john@example.com (already has creator in JWT)
✅ [3/15] Updated jane@example.com → creator
...

📈 Backfill Summary:
   ✅ Updated: 13
   ⏭️  Skipped: 2 (already correct)
   ❌ Errors: 0
   📊 Total: 15

🔍 Verifying JWT roles after backfill (sampling first 5 users)...
   5/5 sampled users now have JWT role

🎉 All users successfully updated!
💡 Users will need to refresh their session to get updated JWT.
💡 Existing sessions will get new role on next token refresh (auto).

✨ Backfill complete!
```

### After Running

- ✅ **Existing sessions**: Will get updated role on next automatic token refresh (~1 hour)
- ✅ **New sessions**: Will immediately have role in JWT
- ✅ **Future creator approvals**: Will automatically set JWT role (via `admin-service.ts`)

---

## Backfill User Roles (SQL)

**File**: `backfill-user-roles.sql`

SQL version of the backfill script. Run this directly in the Supabase SQL Editor if you prefer SQL over TypeScript.

### Usage

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `backfill-user-roles.sql`
3. Run each section step-by-step (recommended) or all at once

### What It Does

1. **STEP 1**: Check current state BEFORE backfill
2. **STEP 2**: Backfill creators → JWT role
3. **STEP 3**: Backfill admins → JWT role
4. **STEP 4**: Verify AFTER backfill
5. **STEP 5**: Show detailed mismatches (if any)

### Expected Output (STEP 1 - Before)

```
total_users | db_creators | db_admins | db_fans | jwt_creators_before | jwt_admins_before
     100    |     12      |     3     |   85    |          0          |         0
```

### Expected Output (STEP 4 - After)

```
total_users | db_creators | db_admins | db_fans | jwt_creators_after | jwt_admins_after
     100    |     12      |     3     |   85    |         12         |        3
```

### Expected Output (STEP 5 - Mismatches)

```
(Empty result set)
```

If there are mismatches, they will be listed with details.

---

## Operational Checklist

Follow this checklist to ensure the role persistence system is fully deployed and working:

### 1. Pre-Deployment

- [ ] Run environment check: `npx tsx scripts/check-env.ts`
- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` is set (server-only)
- [ ] Verify `DATABASE_URL` uses transaction pooler (port 6543)
- [ ] Review code changes in `admin-service.ts`, `route.ts`, `Navigation.tsx`

### 2. Deploy Code

```bash
git add .
git commit -m "Fix role persistence for all creators - prevent role switching"
git push
```

### 3. Configure Vercel Environment (if using Vercel)

- [ ] Add `DATABASE_URL` to Vercel environment variables
  ```
  postgresql://postgres.xxx:password@host:6543/postgres
  ```
- [ ] Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel
- [ ] Redeploy after adding environment variables

### 4. Run Backfill

**Choose ONE method:**

#### Option A: TypeScript (Recommended)
```bash
npx tsx scripts/backfill-user-roles.ts
```

#### Option B: SQL
- Run `backfill-user-roles.sql` in Supabase SQL Editor

### 5. Verify a Specific User

Pick a creator (e.g., Miriam) and verify:

1. **Check JWT role**:
   - Sign out and sign back in
   - Check browser DevTools → Application → Cookies
   - Decode the JWT token at https://jwt.io
   - Verify `app_metadata.role = "creator"`

2. **Test role persistence**:
   - Sign in as creator
   - Simulate DB outage (disconnect internet briefly)
   - Verify UI doesn't switch to fan view
   - Reconnect and verify role persists

### 6. Test New Creator Approval

- [ ] Create a new creator application
- [ ] Approve it via admin dashboard
- [ ] Sign in as the new creator
- [ ] Decode JWT and verify `app_metadata.role = "creator"`

### 7. Monitor Production

- [ ] Check Vercel logs for any auth errors
- [ ] Monitor for role switching reports
- [ ] Verify no degradation in session stability

---

## Troubleshooting

### "Missing environment variables"

**Solution**: Check your `.env.local` file has all required variables:

```bash
npx tsx scripts/check-env.ts
```

### "Failed to update auth metadata"

**Possible causes**:
- `SUPABASE_SERVICE_ROLE_KEY` is incorrect or missing
- Service role key doesn't have admin permissions
- User doesn't exist in auth.users table

**Solution**: Verify service role key from Supabase Dashboard → Settings → API

### Rate Limit Errors

**Solution**: The script has a 100ms delay between requests. If you have many users (100+), increase the delay:

```typescript
// In backfill-user-roles.ts, line ~124
await new Promise(resolve => setTimeout(resolve, 200)); // Increase to 200ms
```

### Database Connection Issues

**Solution**: Ensure `DATABASE_URL` uses transaction pooler:

```
postgresql://postgres.xxx:password@host:6543/postgres
                                            ^^^^ Must be 6543, not 5432
```

### JWT Role Not Updating

**Solution**: Users need to refresh their session. Either:
- Sign out and sign back in
- Wait for automatic token refresh (~1 hour)
- Call `await supabase.auth.refreshSession()` in code

---

## Advanced: Service Worker Bypass

If your app uses a Service Worker, ensure it bypasses auth endpoints:

```javascript
// In your service-worker.js
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass auth and user profile endpoints
  if (
    url.pathname.startsWith('/api/auth/') ||
    url.pathname === '/api/user/profile'
  ) {
    return; // Don't cache these
  }

  // Your normal caching logic here
});
```

---

## Support

For issues or questions:
- Check Vercel logs for errors
- Check Supabase logs in Dashboard → Logs
- Review the code changes in `admin-service.ts`, `route.ts`, `Navigation.tsx`
- Run environment check: `npx tsx scripts/check-env.ts`
