# Security Lockdown Checklist - PostgREST & RLS

This checklist resolves all 31 "RLS Disabled in Public" security warnings by hiding tables from PostgREST.

**Why**: Your app uses Drizzle ORM through Next.js API routes (server-side). You don't need PostgREST exposed, so hiding it is the cleanest fix.

---

## ✅ Pre-Flight Check (Completed)

- [x] **No hardcoded keys in source code** - Only in env files (correct)
- [x] **Middleware added** - Blocks `/rest/v1/*` access in production
- [x] **Architecture confirmed** - Using Drizzle + API routes (not PostgREST client-side)

---

## 🔒 Step 1: Hide Public Schema from PostgREST

**Go to**: [Supabase Dashboard → Settings → API → API Settings](https://supabase.com/dashboard/project/udpolhavhefflrawpokb/settings/api)

### Current State:
```
Exposed schemas: public
```

### Action Required:
1. Find the **"Exposed schemas"** field
2. **Remove** `public` from the list
3. Result should be: **Empty** (or `rpc` only if you have custom functions)
4. Click **"Save"**

**Why**: This immediately hides all tables from PostgREST API. No RLS policies needed.

---

## 🔄 Step 2: Rotate API Keys

**Still in**: Settings → API → **Project API keys**

### Rotate Anon Key:
1. Find `anon (public)` key
2. Click **"⋯" menu** → **"Rotate"**
3. **Copy the new key** (starts with `eyJhbGci...`)
4. Save it somewhere safe for Step 3

### Rotate Service Role Key:
1. Find `service_role` key
2. Click **"⋯" menu** → **"Rotate"**
3. **Copy the new key** (starts with `eyJhbGci...`)
4. Save it somewhere safe for Step 3

**Why**: Rotating keys invalidates the old ones in case they were leaked.

---

## 🌐 Step 3: Update Vercel Environment Variables

**Go to**: [Vercel Dashboard → digis-app → Settings → Environment Variables](https://vercel.com/digis/settings/environment-variables)

### Update These 2 Variables:

1. **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**
   - Click **Edit**
   - Replace with **new anon key** from Step 2
   - Select: ✅ Production, ✅ Preview, ✅ Development
   - Save

2. **`SUPABASE_SERVICE_ROLE_KEY`**
   - Click **Edit**
   - Replace with **new service_role key** from Step 2
   - Select: ✅ Production, ✅ Preview, ✅ Development
   - Save

### Redeploy:
After saving both keys, trigger a redeploy:
- Go to **Deployments** tab
- Click **"⋯" menu** on latest deployment → **"Redeploy"**
- Or just push a commit (middleware changes will auto-deploy)

---

## 💻 Step 4: Update Local Environment

**Edit**: `/Users/examodels/Desktop/digis-app/.env.local`

### Update Lines 3-4:
```bash
# OLD (to be replaced):
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# NEW (paste from Step 2):
NEXT_PUBLIC_SUPABASE_ANON_KEY=<new-anon-key-here>
SUPABASE_SERVICE_ROLE_KEY=<new-service-role-key-here>
```

**Save the file**.

---

## 🧪 Step 5: Verify Lockdown

### Test 1: PostgREST is Blocked
```bash
curl https://udpolhavhefflrawpokb.supabase.co/rest/v1/streams
```

**Expected**: `404` or `401` (not a list of streams)

### Test 2: Your API Routes Still Work
```bash
curl https://www.digis.cc/api/streams/live
```

**Expected**: `200` with stream data

### Test 3: Auth Still Works
- Log in to www.digis.cc
- Navigate around the app
- Everything should work normally

### Test 4: Storage Still Works
- Upload an avatar at www.digis.cc/settings
- Should upload successfully

---

## 📋 Optional: Check Other Surfaces

### GraphQL (if enabled):
**Go to**: Settings → API → **GraphQL**

- If enabled, remove `public` from exposed schemas there too
- Most apps don't use this, so you can leave it off

### Realtime (for future reference):
**Go to**: Database → **Replication**

- Currently, your realtime subscriptions work because they're on `conversations` and `messages`
- These tables are accessed server-side, so no RLS needed yet
- If you later want client-side realtime subscriptions, you'll need RLS policies

---

## 🎯 Success Criteria

After completing all steps, you should have:

✅ **Zero security warnings** in Supabase Dashboard
✅ **PostgREST returns 404** when accessed directly
✅ **Old keys invalidated** (rotated)
✅ **App still works** perfectly (uses API routes)
✅ **Middleware blocks** accidental PostgREST access

---

## 🛡️ What This Protects Against

**Before lockdown**:
- ❌ Anyone with anon key could read: wallets, transactions, messages, user data
- ❌ Anyone with anon key could write: potentially manipulate data
- ❌ Old keys might be in logs, commits, or screenshots

**After lockdown**:
- ✅ PostgREST API hidden (schema removed)
- ✅ Keys rotated (old ones invalid)
- ✅ Middleware double-blocks access
- ✅ Only server-side Drizzle access (secure)

---

## 📝 Post-Lockdown Notes

### What Still Works:
- ✅ Supabase Auth (separate from PostgREST)
- ✅ Supabase Storage (has its own RLS policies)
- ✅ All your API routes (use service_role)
- ✅ Database migrations (use direct connection)

### What's Blocked:
- ❌ Direct PostgREST access (e.g., `supabase.from('users').select()`)
- ❌ Client-side database queries
- ❌ Any accidental PostgREST calls

### If You Later Need Client-Side Queries:
1. Re-expose `public` schema in PostgREST settings
2. Enable RLS on specific tables: `ALTER TABLE xxx ENABLE ROW LEVEL SECURITY;`
3. Create minimal policies for those tables
4. See: `docs/SUPABASE_RLS_POLICIES.md` (create this when needed)

---

## 🚨 Troubleshooting

### "Anon key not working"
- Make sure you updated ALL environments in Vercel (Prod/Preview/Dev)
- Make sure you redeployed after updating
- Check `.env.local` has the new key

### "API routes returning 401"
- Check `SUPABASE_SERVICE_ROLE_KEY` is updated in Vercel
- Service role key is different from anon key
- Verify it's set for Production environment

### "PostgREST still accessible"
- Wait 5-10 minutes for Supabase cache to clear
- Verify `public` is removed from exposed schemas
- Check middleware deployed (should see `[Security] Blocked...` in logs)

---

## 📞 Support

If you run into issues:
1. Check Vercel deployment logs
2. Check Supabase logs (Dashboard → Logs → API)
3. Verify middleware is active (push a test endpoint hit to `/rest/v1/test`)

---

**Estimated Time**: 10-15 minutes
**Risk Level**: Low (worst case: redeploy with old keys)
**Impact**: Fixes all 31 security warnings ✅
