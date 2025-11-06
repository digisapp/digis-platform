# Digis Deployment Guide

## Pre-Deployment Checklist

### 1. Supabase Setup (Required)

**Create Supabase Project:**
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in:
   - Name: `digis-production`
   - Database Password: (generate strong password)
   - Region: Choose closest to your users
4. Wait 2-3 minutes for provisioning

**Get API Credentials:**
1. Go to Project Settings → API
2. Copy these values:
   - Project URL: `https://xxxxx.supabase.co`
   - Anon (public) key: `eyJxxx...`
   - Service role key: `eyJxxx...`
3. Go to Project Settings → Database
4. Copy the connection string under "Connection Pooling"
   - Use "Transaction" mode
   - Format: `postgresql://postgres.xxx:password@xxx.supabase.co:5432/postgres`

**Push Database Schema:**
```bash
# Make sure .env.local has your Supabase credentials
npm run db:push
```

This creates:
- `users` table with email auth
- `profiles` table for extended user data
- `wallets` table for coin balances
- `wallet_transactions` table (double-entry ledger)
- `spend_holds` table (prevents mid-call failures)

**Enable Row Level Security (RLS):**

Run these SQL commands in Supabase SQL Editor:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE spend_holds ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Wallet policies
CREATE POLICY "Users can view own wallet" ON wallets
  FOR SELECT USING (auth.uid() = user_id);

-- Transaction policies (read-only for users)
CREATE POLICY "Users can view own transactions" ON wallet_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Spend holds policies
CREATE POLICY "Users can view own holds" ON spend_holds
  FOR SELECT USING (auth.uid() = user_id);
```

### 2. Vercel Deployment

**Method 1: GitHub Integration (Recommended)**

1. Push your code to GitHub:
```bash
git add -A
git commit -m "Ready for deployment"
git push origin main
```

2. Go to [vercel.com](https://vercel.com)
3. Click "Add New" → "Project"
4. Import your GitHub repository
5. Configure:
   - Framework Preset: Next.js (auto-detected)
   - Root Directory: `./`
   - Build Command: `npm run build` (auto)
   - Output Directory: `.next` (auto)

6. Add Environment Variables:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
DATABASE_URL=postgresql://postgres.xxx:password@xxx.supabase.co:5432/postgres
```

7. Click "Deploy"
8. Wait ~2 minutes

**Method 2: Vercel CLI**

```bash
npm install -g vercel
vercel login
vercel
# Follow prompts to deploy
```

### 3. Post-Deployment Verification

**Test Authentication:**
1. Visit your Vercel URL
2. Click "Get Started"
3. Sign up with a test email
4. Check Supabase Auth dashboard for new user
5. Click "Sign In" and log in
6. Verify auth session works

**Test Database:**
1. Go to Supabase → Table Editor
2. Verify user created in `users` table
3. Verify wallet created in `wallets` table (via trigger)

**Check Logs:**
1. Vercel → Your Project → Deployments
2. Click latest deployment
3. View "Functions" tab for any errors

### 4. Custom Domain (Optional)

**In Vercel:**
1. Project Settings → Domains
2. Add `digis.cc`
3. Update your DNS provider with Vercel's records:
   - Type: CNAME
   - Name: www
   - Value: cname.vercel-dns.com
4. Wait 24-48 hours for DNS propagation

**Update Environment:**
```bash
NEXT_PUBLIC_URL=https://digis.cc
```

## Production Environment Variables

Create these in Vercel Project Settings → Environment Variables:

```bash
# App
NEXT_PUBLIC_URL=https://your-app.vercel.app
NODE_ENV=production

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
DATABASE_URL=postgresql://postgres.xxx:password@xxx.supabase.co:5432/postgres

# Week 2+ (Add when ready)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
LIVEKIT_API_KEY=APIxxx
LIVEKIT_API_SECRET=xxx
NEXT_PUBLIC_LIVEKIT_URL=wss://xxx.livekit.cloud
```

## Monitoring & Analytics

### 1. Vercel Analytics (Built-in)
- Automatically enabled
- View in Vercel dashboard

### 2. Supabase Logs
- Go to Supabase → Logs
- Monitor API usage, errors, slow queries

### 3. Add Sentry (Week 9)
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

## Week 1 Deployment Complete!

Once deployed, you'll have:
- ✅ Live authentication system
- ✅ Database with RLS security
- ✅ Beautiful glassmorphism UI
- ✅ Responsive mobile design
- ✅ SSL/HTTPS enabled
- ✅ CDN distribution worldwide

## Next Steps

### Week 2: Wallet System
- Integrate Stripe
- Build coin purchase flow
- Implement double-entry ledger transactions
- Add idempotency checks
- Set up webhook processing

### Testing Checklist
- [ ] New user signup works
- [ ] Email verification (if enabled)
- [ ] Login with existing user
- [ ] Logout functionality
- [ ] Protected routes redirect to login
- [ ] Mobile responsive on iPhone/Android
- [ ] All glassmorphism effects render correctly

## Troubleshooting

**Build fails on Vercel:**
- Check build logs for TypeScript errors
- Ensure all environment variables are set
- Try building locally: `npm run build`

**Auth not working:**
- Verify Supabase URL and keys are correct
- Check if RLS policies are enabled
- Look at Network tab for API errors

**Database connection issues:**
- Ensure DATABASE_URL uses transaction pooling mode
- Check if Supabase project is active
- Verify connection string format

## Cost Estimation

**Current Setup (Week 1):**
- Vercel Hobby: $0/month
- Supabase Free: $0/month
- **Total: $0/month** (up to 50k users)

**Production Ready:**
- Vercel Pro: $20/month (better support)
- Supabase Pro: $25/month (more DB storage)
- **Total: $45/month base** + usage-based fees

## Support

If you encounter issues:
1. Check deployment logs in Vercel
2. Check Supabase logs for database errors
3. Review README.md for setup steps
4. Check browser console for client errors

---

**Your app is ready to launch! 🚀**
