# Smoke Test Checklist - Role Persistence System

Quick validation tests to ensure the role persistence system is working correctly before deploying to production.

**Estimated Time**: 5-10 minutes

---

## Pre-Flight Checks

### ✅ Environment Configuration
```bash
npx tsx scripts/check-env.ts
```

**Expected Output**:
```
🎉 All environment checks passed!
```

**If Failed**: Fix environment variables before proceeding.

---

## Test 1: Creator Role Persistence (No Flash)

**Objective**: Verify creator role persists across page refreshes without flashing to fan view.

### Steps:
1. Sign in as a creator account (e.g., Miriam)
2. Verify you see creator dashboard/navigation
3. Refresh the page 5-10 times rapidly (Cmd/Ctrl + R)
4. Check browser console for logs

**Expected Results**:
- ✅ No flash of fan view
- ✅ Creator navigation stays visible
- ✅ Console shows: `[Navigation] Seeding role from JWT: creator` (first load)
- ✅ Console shows: `[Navigation] User profile fetched: { role: 'creator' }`

**If Failed**:
- Check localStorage has `digis_user_role = 'creator'`
- Check browser DevTools → Network → `/api/user/profile` returns `role: 'creator'`
- Check console for error messages

---

## Test 2: Role Persistence During DB Outage

**Objective**: Verify role persists even when database is unavailable.

### Steps:
1. Sign in as a creator
2. Open browser DevTools → Network tab
3. Add a network throttle rule to block `/api/user/profile` (or disconnect internet)
4. Refresh the page
5. Reconnect and refresh again

**Expected Results**:
- ✅ Creator navigation stays visible during "outage"
- ✅ Console shows: `[Navigation] Error fetching profile - preserving current role`
- ✅ No switch to fan view
- ✅ After reconnect, creator view persists

**If Failed**:
- Check localStorage persists through refresh
- Check never-downgrade logic in console logs
- Verify `setRoleSafely` is not accepting downgrades

---

## Test 3: Admin Role Change (Intentional Downgrade)

**Objective**: Verify admin can intentionally change a creator's role to fan.

### Steps:
1. Sign in as admin
2. Navigate to admin dashboard → Users
3. Find a creator account
4. Change their role from `creator` to `fan`
5. Sign in as that creator (or have them refresh if already signed in)

**Expected Results**:
- ✅ Admin action succeeds
- ✅ User sees fan view after sign-in/refresh
- ✅ Console shows: `[Navigation] Force updating role: creator -> fan`
- ✅ localStorage updated to `digis_user_role = 'fan'`

**If Failed**:
- Check admin-service.ts is using `supabaseAdmin`
- Check profile API uses `{ force: true }` when returning role
- Verify JWT contains new role (decode at https://jwt.io)

---

## Test 4: JWT Role Verification

**Objective**: Verify role is stored in JWT `app_metadata`.

### Steps:
1. Sign in as a creator
2. Open browser DevTools → Application → Cookies
3. Find cookie starting with `sb-` and containing `auth-token`
4. Copy the JWT value (it's a long string)
5. Go to https://jwt.io and paste the token
6. Look at the decoded payload

**Expected Results**:
- ✅ Payload contains `"app_metadata": { "role": "creator" }`
- ✅ If recently backfilled, also has `"user_metadata": { "is_creator_verified": true }`

**If Failed**:
- Run backfill script: `npx tsx scripts/backfill-user-roles.ts`
- Have user sign out and back in to get fresh JWT
- Check Supabase Dashboard → Authentication → Users → Select user → Raw user meta data

---

## Test 5: New Creator Approval

**Objective**: Verify newly approved creators get JWT role immediately.

### Steps:
1. Create a new creator application (as a fan)
2. Sign in as admin
3. Approve the application
4. Sign in as the new creator
5. Decode JWT at https://jwt.io

**Expected Results**:
- ✅ Approval succeeds
- ✅ New creator sees creator dashboard immediately
- ✅ JWT contains `"app_metadata": { "role": "creator" }`
- ✅ Console shows: `[Navigation] User profile fetched: { role: 'creator' }`

**If Failed**:
- Check `AdminService.approveApplication()` calls `supabaseAdmin.auth.admin.updateUserById()`
- Check Supabase logs for errors
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly

---

## Test 6: Session Refresh

**Objective**: Verify users can manually refresh their session to get updated JWT.

### Steps:
1. (Optional) Add RefreshSessionButton to settings page
2. As a creator, click the refresh button
3. Observe console logs and UI behavior

**Alternative** (using browser console):
```javascript
import { refreshSession } from '@/lib/auth/refresh-session';
await refreshSession();
window.location.reload();
```

**Expected Results**:
- ✅ Session refreshes without signing out
- ✅ Console shows: `[RefreshSession] Session refreshed successfully`
- ✅ Role persists after refresh

**If Failed**:
- Check Supabase client is properly configured
- Verify user has an active session
- Check network tab for auth errors

---

## Test 7: Backfill Verification

**Objective**: Verify all existing creators have JWT roles after backfill.

### Steps:
```bash
npx tsx scripts/backfill-user-roles.ts
```

**Expected Output**:
```
🚀 Starting user role backfill...

📊 Found 15 users to update:
   - 12 creators
   - 3 admins

🔍 Checking JWT roles before backfill...
   2/5 sampled users already have JWT role

✅ [1/15] Updated miriam@example.com → creator
⏭️  [2/15] Skipped john@example.com (already has creator in JWT)
...

📈 Backfill Summary:
   ✅ Updated: 13
   ⏭️  Skipped: 2 (already correct)
   ❌ Errors: 0
   📊 Total: 15

🎉 All users successfully updated!
```

**If Failed**:
- Check `SUPABASE_SERVICE_ROLE_KEY` is set
- Check database connection
- Review error messages in output
- Try SQL version: `scripts/backfill-user-roles.sql`

---

## Test 8: Type Safety

**Objective**: Verify type safety prevents invalid roles.

### Steps (in browser console):
```javascript
// Should be rejected
localStorage.setItem('digis_user_role', 'invalid_role');
window.location.reload();
```

**Expected Results**:
- ✅ Console shows warning: `[Navigation] Invalid role provided: invalid_role`
- ✅ Role defaults to `'fan'`
- ✅ No crashes or errors

**If Failed**:
- Check `isValidRole()` guard is in place
- Verify `parseRole()` uses fallback

---

## Final Verification

### ✅ All Tests Passed?
- [ ] Test 1: Creator role persistence (no flash) ✅
- [ ] Test 2: Role persistence during DB outage ✅
- [ ] Test 3: Admin role change (intentional downgrade) ✅
- [ ] Test 4: JWT role verification ✅
- [ ] Test 5: New creator approval ✅
- [ ] Test 6: Session refresh ✅
- [ ] Test 7: Backfill verification ✅
- [ ] Test 8: Type safety ✅

### Production Readiness
If all tests pass:
```bash
git add .
git commit -m "Production-ready role persistence system

All smoke tests passing:
✅ Creator role persistence (no flash)
✅ Role persistence during DB outage
✅ Admin role changes work correctly
✅ JWT contains role in app_metadata
✅ New creator approvals automatic
✅ Session refresh without sign-out
✅ All existing creators backfilled
✅ Type safety enforced

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git push
```

---

## Quick Reference

### Check Environment
```bash
npx tsx scripts/check-env.ts
```

### Run Backfill
```bash
npx tsx scripts/backfill-user-roles.ts
```

### Decode JWT
1. DevTools → Application → Cookies
2. Copy `sb-xxx-auth-token` value
3. Paste at https://jwt.io
4. Check `app_metadata.role`

### Check Role in Console
```javascript
localStorage.getItem('digis_user_role')
```

### Force Refresh Session
```javascript
import { refreshSession } from '@/lib/auth/refresh-session';
await refreshSession();
```

---

## Troubleshooting

### Issue: Role flashes to fan on load
**Solution**: Check localStorage is populated, verify JWT seeding logic

### Issue: Role doesn't update after admin change
**Solution**: User needs to refresh session or sign out/in

### Issue: Backfill fails with auth errors
**Solution**: Verify `SUPABASE_SERVICE_ROLE_KEY` is correct and server-only

### Issue: JWT doesn't contain role
**Solution**: Run backfill, or sign out/in to get fresh JWT

---

**Status**: Ready for smoke testing
**Last Updated**: 2025-11-12
