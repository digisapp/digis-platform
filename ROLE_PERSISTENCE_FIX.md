# Role Persistence Fix - Complete Implementation

This document summarizes the comprehensive fix for the role switching issue where creators were randomly being downgraded to fan view.

## Problem

Users reported: "I keep losing the auth connection, I'm logged in as creator miriam and randomly it converts to a fan page and then a couple minutes later it goes back to miriam's creator page."

**Root Cause**: During database timeouts or connection issues, the API would fail to return user data, causing the frontend to fall back to the default "fan" role.

## Solution Architecture

The fix implements a multi-layered approach to ensure role persistence:

1. **JWT as Source of Truth**: Store role in `app_metadata` (embedded in JWT token)
2. **Never-Downgrade Client Logic**: Client only accepts role upgrades, never downgrades
3. **localStorage Persistence**: Seed role from localStorage to prevent flash
4. **Token Refresh Handling**: Update role when JWT refreshes
5. **Graceful Degradation**: API returns JWT role even when DB fails
6. **Production Hardening**: Full cache control, proxy protection, admin client

## Files Modified

### 1. `/src/lib/supabase/admin.ts` (NEW)
**Purpose**: Dedicated Supabase admin client with service role permissions

**Key Changes**:
- Created singleton admin client using `SUPABASE_SERVICE_ROLE_KEY`
- Server-only (never imported in browser)
- Used for all auth metadata updates

```typescript
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
```

### 2. `/src/lib/admin/admin-service.ts`
**Purpose**: Admin operations for managing users and creator applications

**Key Changes**:
- Import `supabaseAdmin` instead of `createClient`
- Update `approveApplication()` to set `app_metadata.role = 'creator'`
- Update `updateUserRole()` to set `app_metadata.role` when admin changes roles

**Lines Modified**:
- Line 4: Import admin client
- Lines 113-134: Set app_metadata in `approveApplication()`
- Lines 237-254: Set app_metadata in `updateUserRole()`

### 3. `/src/app/api/user/profile/route.ts`
**Purpose**: API endpoint that returns user profile data

**Key Changes**:
- Added `export const revalidate = 0;` for full cache disable
- JWT `app_metadata.role` is now the authoritative source
- DB enriches other fields but never overrides JWT role
- Added `Vary: Cookie` header to prevent proxy mixing users

**Lines Modified**:
- Lines 8-11: Added runtime/dynamic/revalidate flags
- Lines 21-24: Read JWT role first (source of truth)
- Line 51: Never override JWT role with fallback
- Line 69: Added `Vary: Cookie` header

### 4. `/src/app/api/auth/heartbeat/route.ts`
**Purpose**: Keep sessions alive and prevent unexpected logouts

**Key Changes**:
- Added `export const revalidate = 0;` for full cache disable
- Enhanced cache control headers
- Added `Vary: Cookie` header

**Lines Modified**:
- Lines 4-7: Added runtime/dynamic/revalidate flags
- Lines 20-23: Enhanced cache control headers

### 5. `/src/components/layout/Navigation.tsx`
**Purpose**: Main navigation component with user role state

**Key Changes**:
- Initialize role from localStorage to prevent flash
- Never-downgrade logic: only accept role upgrades (unless forced)
- Force option for authoritative role changes (e.g., admin changed role)
- Handle TOKEN_REFRESHED event to update role
- Clear localStorage on SIGNED_OUT

**Lines Modified**:
- Lines 37-43: Initialize from localStorage
- Lines 56-84: Safe role setter with never-downgrade logic + force option
- Lines 92-98: Clear localStorage on SIGNED_OUT (already implemented)
- Lines 104-108: Update role on TOKEN_REFRESHED
- Line 219: Force update role from profile API (JWT is authoritative)

## Utilities Created

### 1. `/src/lib/auth/refresh-session.ts` (NEW)
**Purpose**: Utilities for manually refreshing user sessions

**Functions**:
- `refreshSession()`: Manually refresh JWT to get updated role
- `getRoleFromJWT()`: Get current role from JWT without API call
- `refreshAndGetRole()`: Combines both for convenience

**Usage**:
```typescript
import { refreshSession, getRoleFromJWT } from '@/lib/auth/refresh-session';

// Refresh session after admin changes role
await refreshSession();

// Check current role in JWT
const role = await getRoleFromJWT();
```

### 2. `/src/components/auth/RefreshSessionButton.tsx` (NEW)
**Purpose**: UI component for users to manually refresh their session

**Variants**:
- `button`: Full button with icon and text
- `text`: Text-only link
- `icon`: Icon-only button

**Usage**:
```tsx
import { RefreshSessionButton } from '@/components/auth/RefreshSessionButton';

// In settings page or after role change notification
<RefreshSessionButton onRefresh={() => window.location.reload()} />
```

## Scripts Created

### 1. `/scripts/check-env.ts` (NEW)
**Purpose**: Verify environment configuration

**Features**:
- Checks all required environment variables
- Validates service role key format
- Tests database connection (transaction pooler check)
- Tests admin client connectivity

**Usage**:
```bash
npx tsx scripts/check-env.ts
```

### 2. `/scripts/backfill-user-roles.ts` (NEW)
**Purpose**: Update all existing creators/admins with JWT role

**Features**:
- Verifies JWT roles before/after backfill
- Skips users who already have correct role
- Progress tracking with [n/total] indicators
- Rate limiting to avoid API limits (100ms delay)
- Comprehensive error handling

**Usage**:
```bash
npx tsx scripts/backfill-user-roles.ts
```

### 3. `/scripts/backfill-user-roles.sql` (NEW)
**Purpose**: SQL version of backfill for those who prefer SQL

**Features**:
- Step-by-step verification queries
- Backfill creators and admins separately
- Mismatch detection
- Safe EXISTS checks to avoid orphan rows

**Usage**: Run in Supabase SQL Editor

### 4. `/scripts/README.md` (UPDATED)
**Purpose**: Comprehensive documentation for all scripts

**Sections**:
- Environment check instructions
- Backfill instructions (TypeScript & SQL)
- Operational checklist
- Troubleshooting guide
- Service Worker bypass (if applicable)

## Production Hardening

### API Route Configuration
All auth-related API routes now have:
```typescript
export const runtime = 'nodejs';      // Force Node.js runtime
export const dynamic = 'force-dynamic'; // Disable static optimization
export const revalidate = 0;          // Disable revalidation cache
```

### Response Headers
All auth-related API responses include:
```typescript
response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
response.headers.set('Pragma', 'no-cache');
response.headers.set('Expires', '0');
response.headers.set('Vary', 'Cookie'); // Prevent proxy mixing users
```

### Role Hierarchy & Downgrade Protection
Never-downgrade logic enforces this hierarchy:
```
fan (0) < creator (1) < admin (2)
```

**Normal behavior**: Only same-level or upgrades are accepted. This prevents transient errors from downgrading roles.

**Force option**: When `{ force: true }` is passed, downgrades are allowed. This is used when:
- Profile API returns role from JWT (authoritative source)
- Admin explicitly changes a user's role
- Any intentional role change that should override the protection

**Example**:
```typescript
// Protects against accidental downgrades
setRoleSafely('fan'); // Ignored if current role is 'creator'

// Allows intentional downgrades
setRoleSafely('fan', { force: true }); // Applied even if current role is 'creator'
```

## Deployment Checklist

### 1. Pre-Deployment
- [ ] Run: `npx tsx scripts/check-env.ts`
- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` is set (server-only)
- [ ] Verify `DATABASE_URL` uses transaction pooler (port 6543)

### 2. Deploy Code
```bash
git add .
git commit -m "Fix role persistence for all creators - prevent role switching"
git push
```

### 3. Configure Vercel (if applicable)
- [ ] Add `DATABASE_URL` to Vercel environment variables
  ```
  postgresql://postgres.xxx:password@host:6543/postgres
  ```
- [ ] Ensure `SUPABASE_SERVICE_ROLE_KEY` is set
- [ ] Redeploy

### 4. Run Backfill
Choose ONE:
- **TypeScript**: `npx tsx scripts/backfill-user-roles.ts`
- **SQL**: Run `backfill-user-roles.sql` in Supabase SQL Editor

### 5. Verify
- [ ] Pick a creator and sign in
- [ ] Decode JWT at https://jwt.io
- [ ] Verify `app_metadata.role = "creator"`
- [ ] Test role persistence during simulated DB outage

**Tip**: After backfill, users can refresh their JWT by:
- Signing out and back in (gets new JWT immediately)
- Waiting ~1 hour for automatic refresh
- Using the RefreshSessionButton component
- Calling `refreshSession()` utility

### 6. Monitor
- [ ] Check Vercel logs
- [ ] Monitor for role switching reports
- [ ] Verify session stability

## How It Works

### On Creator Approval
1. Admin approves creator application
2. `AdminService.approveApplication()` is called
3. Updates `users.role = 'creator'` in database
4. Updates `app_metadata.role = 'creator'` in Supabase auth (JWT)
5. Creator signs in → JWT contains role immediately

### On Role Change by Admin
1. Admin changes user role
2. `AdminService.updateUserRole()` is called
3. Updates `users.role` in database
4. Updates `app_metadata.role` in Supabase auth (JWT)
5. User's next session will have new role in JWT

### On User Sign-In
1. User signs in
2. Supabase returns JWT with `app_metadata.role`
3. Client reads JWT role (source of truth)
4. Seeds `localStorage.digis_user_role`
5. Never downgrades even if API fails

### During Database Outage
1. API `/api/user/profile` times out
2. JWT still contains `app_metadata.role`
3. API returns JWT role even without DB data
4. Client persists role in localStorage
5. Never-downgrade logic prevents fan fallback

### On Token Refresh
1. Supabase automatically refreshes JWT (~1 hour)
2. `TOKEN_REFRESHED` event fires
3. Client extracts role from new JWT
4. Updates localStorage with new role
5. UI stays in sync

## Benefits

✅ **Bulletproof Role Persistence**: Role survives DB outages, network issues, cache problems

✅ **Production-Safe**: Full cache control, proxy protection, admin permissions

✅ **Scalable**: Works for all creators automatically via backfill + future approvals

✅ **Graceful Degradation**: Falls back to JWT when DB unavailable

✅ **Smart Downgrade Protection**: Blocks accidental downgrades but allows intentional changes

✅ **Future-Proof**: All future creator approvals set JWT role automatically

✅ **Observable**: Comprehensive logging and verification scripts

✅ **User-Friendly**: Refresh session utility for immediate JWT updates

## Environment Variables Required

### Server-Only (NEVER in browser)
```bash
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...  # From Supabase Dashboard → Settings → API
```

### Both Server and Client
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
DATABASE_URL=postgresql://postgres.xxx:password@host:6543/postgres
```

## Testing

### Manual Test: Role Persistence
1. Sign in as creator
2. Disconnect internet
3. Verify UI doesn't switch to fan view
4. Reconnect internet
5. Verify role persists as creator

### Manual Test: JWT Role
1. Sign in as creator
2. Open DevTools → Application → Cookies
3. Find `sb-xxx-auth-token` cookie
4. Copy value and decode at https://jwt.io
5. Verify `app_metadata.role = "creator"`

### Automated Test: Environment
```bash
npx tsx scripts/check-env.ts
```

### Automated Test: Backfill
```bash
npx tsx scripts/backfill-user-roles.ts
```

## Rollback Plan

If issues occur:

1. **Immediate**: Users can refresh session by signing out/in
2. **Short-term**: Revert git commit and redeploy
3. **Data**: No data changes needed (backfill is safe to re-run)

## Support

For issues:
- Check logs: Vercel Dashboard → Logs
- Check auth: Supabase Dashboard → Authentication → Users
- Run env check: `npx tsx scripts/check-env.ts`
- Review this doc: `ROLE_PERSISTENCE_FIX.md`

---

**Status**: ✅ Ready for Production
**Last Updated**: 2025-11-12
**Version**: 1.0
