# Test Matrix - Role Persistence System

Comprehensive test scenarios to validate the role persistence system works correctly under all conditions.

**Run these tests before deploying to production.**

---

## ✅ Test 1: Cold Load (Incognito as Creator)

**Objective**: Verify no fan flash on first load for creators

### Setup
1. Open incognito/private browser window
2. Navigate to https://www.digis.cc
3. Sign in as a creator (e.g., Miriam)

### Expected Results
- ✅ No flash of fan view during load
- ✅ Creator dashboard appears immediately
- ✅ Console shows: `[Navigation] Asserting role immediately: creator`
- ✅ Source shows either "JWT session" or "localStorage fallback"

### What to Check
```javascript
// In browser console
localStorage.getItem('digis_user_role')  // Should be 'creator'
```

### If Failed
- Check if JWT has `app_metadata.role` (decode at https://jwt.io)
- Check console for "No role found in JWT or localStorage"
- Run backfill if JWT role is missing

---

## ✅ Test 2: Simulated 401 (Profile API Blocked)

**Objective**: Verify UI stays creator even when profile API fails

### Setup
1. Sign in as creator
2. Open DevTools → Network tab
3. Right-click → "Block request URL" → `/api/user/profile`
4. Refresh the page

### Expected Results
- ✅ Creator dashboard still visible
- ✅ Console shows: `[Navigation] Profile API error: (blocked)`
- ✅ Console shows: `[Navigation] Asserting role immediately: creator`
- ✅ Role preserved from JWT/localStorage

### What to Check
```javascript
// Role should persist despite API failure
console.log('[Navigation] Error fetching profile - preserving current role')
```

### If Failed
- Check if JWT decode fallback is working
- Verify `getRoleWithFallback()` is being called
- Check localStorage has `digis_user_role`

---

## ✅ Test 3: DB Outage (Query Timeout)

**Objective**: Verify role persists when database times out

### Setup
This requires temporarily breaking the DB connection. You can:
- Option A: Set invalid `DATABASE_URL` in Vercel
- Option B: Add artificial timeout in profile API (for testing only)

### Temporary Code (for testing):
```typescript
// In /api/user/profile/route.ts (REMOVE AFTER TEST)
// Add before DB query:
await new Promise(resolve => setTimeout(resolve, 5000)); // Force timeout
```

### Expected Results
- ✅ Creator dashboard stays visible
- ✅ Console shows: `[Navigation] Asserting role immediately: creator`
- ✅ API logs show: `Database timeout fetching user profile - using auth fallback`
- ✅ API returns: `{ user: { role: 'creator' } }` (from JWT, not DB)

### What to Check
Server logs should show:
```
[ProfileAPI] {
  jwtRole: 'creator',
  dbRole: null,          ← DB timeout
  finalRole: 'creator',  ← Falls back to JWT
  hasJWTRole: true,
  hasDBRole: false
}
```

### If Failed
- Verify `withTimeoutAndRetry()` is working
- Check API uses `finalRole = jwtRole || dbUser?.role || 'fan'`
- Verify JWT role is set (run backfill)

---

## ✅ Test 4: Intentional Downgrade (Admin Changes Role)

**Objective**: Verify admin can change creator → fan and it applies correctly

### Setup
1. Sign in as admin
2. Navigate to admin panel → Users
3. Find a creator account
4. Change role from "creator" to "fan"
5. Sign in as that creator (or have them refresh)

### Expected Results
- ✅ Admin change succeeds without errors
- ✅ Creator's JWT updated with new role
- ✅ Creator sees fan dashboard after refresh
- ✅ Console shows: `[Navigation] Force updating role: creator -> fan`
- ✅ localStorage updated to `digis_user_role = 'fan'`

### What to Check
```javascript
// Decode JWT at https://jwt.io
// Should show: app_metadata.role = "fan"
```

### Server Logs Should Show
```
[ProfileAPI] {
  jwtRole: 'fan',
  dbRole: 'fan',
  finalRole: 'fan',
  hasJWTRole: true,
  hasDBRole: true
}
```

### If Failed
- Check `AdminService.updateUserRole()` updates JWT
- Verify admin client uses `SUPABASE_SERVICE_ROLE_KEY`
- Check profile API uses `{ force: true }` when setting role

---

## ✅ Test 5: Multi-Tab Consistency

**Objective**: Verify role is consistent across multiple tabs

### Setup
1. Sign in as creator
2. Open same site in 3 different tabs
3. Refresh all tabs simultaneously (Cmd/Ctrl + R in each)

### Expected Results
- ✅ All 3 tabs show creator dashboard
- ✅ No fan flash in any tab
- ✅ localStorage consistent across tabs
- ✅ Each tab logs: `[Navigation] Asserting role immediately: creator`

### What to Check
```javascript
// In each tab's console
localStorage.getItem('digis_user_role')  // All should be 'creator'
```

### Edge Case: Change Role in One Tab
1. In tab 1, manually run:
   ```javascript
   localStorage.setItem('digis_user_role', 'fan');
   window.location.reload();
   ```
2. Refresh tab 2 and tab 3

**Expected**: All tabs should sync to the API's role (creator), overriding the manual localStorage change.

### If Failed
- Check `{ force: true }` is used when profile API returns
- Verify JWT role overrides localStorage tampering

---

## ✅ Test 6: Page Refresh Storm (No Flash)

**Objective**: Verify no fan flash even during rapid refreshes

### Setup
1. Sign in as creator
2. Rapidly refresh page 10 times (as fast as possible)
3. Watch for any flash of fan view

### Expected Results
- ✅ No fan flash visible at any point
- ✅ Creator dashboard shows immediately on every refresh
- ✅ Console shows "Asserting role immediately" on each load

### What to Check
- Visual: No UI elements from fan view should appear
- Console: Each refresh should show consistent role assertion

### If Failed
- Check localStorage is seeding correctly
- Verify JWT decode fallback is working
- Check for race conditions in useEffect

---

## ✅ Test 7: JWT vs DB Role Mismatch

**Objective**: Verify JWT role always wins over DB role

### Setup (Manual)
1. Sign in as creator
2. Manually change DB role to 'fan':
   ```sql
   UPDATE users SET role = 'fan' WHERE email = 'miriam@example.com';
   ```
3. Keep JWT role as 'creator' (don't run backfill yet)
4. Refresh page

### Expected Results
- ✅ UI shows creator dashboard (from JWT)
- ✅ Console shows:
   ```
   [ProfileAPI] {
     jwtRole: 'creator',  ← JWT wins
     dbRole: 'fan',
     finalRole: 'creator',  ← JWT is authoritative
   }
   ```

### What to Check
```javascript
// Profile API should return:
{ user: { role: 'creator' } }  // Not 'fan'
```

### If Failed
- Check `finalRole = jwtRole || dbUser?.role || 'fan'`
- Verify JWT role is read first
- Check API logs for role source

---

## ✅ Test 8: Backfill Verification

**Objective**: Verify backfill updates all creators correctly

### Setup
```bash
npx tsx scripts/backfill-user-roles.ts
```

### Expected Results
- ✅ Script finds all creators and admins
- ✅ Updates auth metadata for each user
- ✅ No errors in output
- ✅ Summary shows:
  ```
  ✅ Updated: X
  ⏭️  Skipped: Y (already correct)
  ❌ Errors: 0
  ```

### What to Check
Pick a random creator and verify:
1. Supabase Dashboard → Authentication → Users → Select user
2. Check `raw_app_meta_data` → should have `{ "role": "creator" }`
3. Sign in as that creator
4. Decode JWT at https://jwt.io → verify `app_metadata.role = "creator"`

### If Failed
- Check `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Verify admin client has proper permissions
- Review error messages in script output

---

## ✅ Test 9: Session Refresh (No Sign-Out)

**Objective**: Verify users can refresh JWT without signing out

### Setup
1. Sign in as creator
2. Run backfill (if JWT doesn't have role yet)
3. Use refresh utility:
   ```javascript
   import { refreshSession } from '@/lib/auth/refresh-session';
   await refreshSession();
   window.location.reload();
   ```

### Expected Results
- ✅ Session refreshes without sign-out
- ✅ Console shows: `[RefreshSession] Session refreshed successfully`
- ✅ JWT now contains `app_metadata.role`
- ✅ Role persists after reload

### What to Check
```javascript
// Before refresh
jwtRole: null

// After refresh
jwtRole: 'creator'
```

### If Failed
- Check Supabase client is properly configured
- Verify user has active session
- Check network tab for auth errors

---

## ✅ Test 10: localStorage Tampering (Security)

**Objective**: Verify client can't elevate privileges by tampering localStorage

### Setup
1. Sign in as fan
2. Manually set localStorage:
   ```javascript
   localStorage.setItem('digis_user_role', 'admin');
   window.location.reload();
   ```

### Expected Results
- ✅ UI briefly shows "admin" from localStorage
- ✅ Profile API returns actual role: 'fan'
- ✅ UI updates to fan dashboard (correct role)
- ✅ Console shows: `[Navigation] Force updating role: admin -> fan`

### What to Check
```javascript
// Final state should be:
localStorage.getItem('digis_user_role')  // 'fan' (corrected)
```

### Server Logs Should Show
```
[ProfileAPI] {
  jwtRole: null,
  dbRole: 'fan',
  finalRole: 'fan'
}
```

### If Failed
- Check `{ force: true }` is used when profile API returns
- Verify API is authoritative, not localStorage

---

## Quick Test Checklist

Before deploying to production, run these quick tests:

- [ ] **Test 1**: Cold load as creator (no flash)
- [ ] **Test 2**: Profile API blocked (role persists)
- [ ] **Test 3**: DB outage simulation (role persists)
- [ ] **Test 4**: Admin role change (applies correctly)
- [ ] **Test 5**: Multi-tab consistency
- [ ] **Test 6**: Rapid refresh (no flash)
- [ ] **Test 7**: JWT vs DB mismatch (JWT wins)
- [ ] **Test 8**: Backfill verification
- [ ] **Test 9**: Session refresh (no sign-out)
- [ ] **Test 10**: localStorage tampering (security)

---

## Automated Testing (Optional)

For continuous validation, consider adding these as automated E2E tests:

```typescript
// Example Playwright test
test('creator sees no fan flash on cold load', async ({ page }) => {
  await page.goto('/');
  await page.fill('[name="email"]', 'miriam@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('[type="submit"]');

  // Should never see fan view elements
  await expect(page.locator('text=Explore Creators')).not.toBeVisible();

  // Should see creator elements immediately
  await expect(page.locator('text=Go Live')).toBeVisible();
});
```

---

## Troubleshooting

### Issue: Fan flash still occurs
**Solution**:
- Run backfill to update JWT
- Check console for "No role found in JWT or localStorage"
- Verify JWT decode fallback is working

### Issue: Role doesn't update after admin change
**Solution**:
- User needs to refresh session or sign out/in
- Check admin service is using `supabaseAdmin`
- Verify JWT was updated in Supabase

### Issue: Inconsistent roles across tabs
**Solution**:
- Check all tabs are using same localStorage
- Verify profile API is returning consistent data
- Check for caching issues (Vary: Cookie header)

---

**Status**: Ready for Testing
**Last Updated**: 2025-11-12
