# Deploy Digis to Production

## Quick Deploy (5 minutes)

### Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `digis-platform` (or your choice)
3. Make it **Private** (for now)
4. Click "Create repository"
5. **IMPORTANT:** Don't initialize with README (we already have code)

### Step 2: Push Code to GitHub

```bash
cd /Users/examodels/Desktop/digis-app

# Update git remote to your new repo
git remote set-url origin https://github.com/YOUR_USERNAME/digis-platform.git

# Push all commits
git push -u origin main
```

**If you get errors:**
```bash
# Force push if needed (you're the only dev)
git push -u origin main --force
```

### Step 3: Set Up Services

**3a. Supabase (Database)**

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Name: `digis-production`
4. Password: Generate strong password (save it!)
5. Region: Choose closest to your users
6. Wait 2-3 minutes for provisioning

**Get Credentials:**
- Settings → API → Copy:
  - Project URL
  - `anon` (public) key
  - `service_role` key
- Settings → Database → Connection Pooling (Transaction mode):
  - Copy connection string

**Push Database Schema:**
```bash
# Add credentials to .env.local first
npm run db:push
```

**Enable RLS Policies:**
Copy SQL from `DEPLOYMENT.md` and run in Supabase SQL Editor

**3b. Stripe (Payments)**

1. Go to https://dashboard.stripe.com
2. Get test keys from Developers → API keys:
   - Publishable key: `pk_test_...`
   - Secret key: `sk_test_...`
3. Add webhook endpoint:
   - URL: `https://YOUR_APP.vercel.app/api/stripe/webhook`
   - Events: `checkout.session.completed`
   - Copy webhook secret: `whsec_...`

**3c. LiveKit (Video Calls)**

1. Go to https://cloud.livekit.io
2. Create account → New Project
3. Get credentials:
   - API Key: `APIxxx`
   - API Secret: `xxx`
   - WebSocket URL: `wss://xxx.livekit.cloud`

**3d. Inngest (Background Jobs)**

1. Go to https://www.inngest.com
2. Sign up → Create app
3. Get credentials:
   - Event Key
   - Signing Key

### Step 4: Deploy to Vercel

**4a. Connect Vercel**

1. Go to https://vercel.com
2. Click "Add New..." → "Project"
3. Import Git Repository → Select your `digis-platform` repo
4. Framework: **Next.js** (auto-detected)
5. Root Directory: `./` (default)
6. **DON'T DEPLOY YET!**

**4b. Add Environment Variables**

In Vercel project settings → Environment Variables, add ALL of these:

```bash
# App
NEXT_PUBLIC_URL=https://your-app.vercel.app  # Will update after deploy
NODE_ENV=production

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
DATABASE_URL=postgresql://postgres:xxx@xxx.supabase.co:5432/postgres

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# LiveKit
LIVEKIT_API_KEY=APIxxx
LIVEKIT_API_SECRET=xxx
NEXT_PUBLIC_LIVEKIT_URL=wss://xxx.livekit.cloud

# Inngest
INNGEST_EVENT_KEY=xxx
INNGEST_SIGNING_KEY=signkey-xxx

# Feature Flags
FEATURE_VIDEO_CALLS=true
FEATURE_LIVE_STREAMING=false  # Week 4
FEATURE_PPV_MESSAGES=false    # Week 5
```

**4c. Deploy!**

1. Click "Deploy"
2. Wait ~2 minutes
3. Copy your app URL: `https://your-app-abc123.vercel.app`
4. Update `NEXT_PUBLIC_URL` environment variable with this URL
5. Redeploy (will be instant)

### Step 5: Configure Webhooks

**Stripe Webhook:**
1. Go to Stripe Dashboard → Webhooks
2. Update endpoint URL to your Vercel URL:
   `https://your-app-abc123.vercel.app/api/stripe/webhook`
3. Copy NEW webhook secret
4. Update `STRIPE_WEBHOOK_SECRET` in Vercel
5. Redeploy

**Inngest Sync:**
1. Go to Inngest Dashboard → Apps
2. Add sync URL:
   `https://your-app-abc123.vercel.app/api/inngest`
3. Test the connection

### Step 6: Test Production

**Test Auth:**
1. Visit your Vercel URL
2. Click "Get Started"
3. Sign up with test email
4. Verify email received (check spam)
5. Log in

**Test Wallet:**
1. Go to `/wallet`
2. Click "Buy Coins"
3. Use Stripe test card: `4242 4242 4242 4242`
4. Complete purchase
5. Verify coins added

**Test Video Call (if both users available):**
1. Two browser windows
2. Fan initiates call
3. Creator accepts
4. Both join room
5. Verify video/audio works

## Custom Domain (Optional)

**For digis.cc:**

1. In Vercel → Settings → Domains
2. Add `digis.cc`
3. Update your DNS provider:
   - Type: `CNAME`
   - Name: `@`
   - Value: `cname.vercel-dns.com`
4. Wait 24-48 hours for propagation
5. Update `NEXT_PUBLIC_URL` to `https://digis.cc`

## Troubleshooting

**Build fails:**
- Check build logs in Vercel
- Verify all environment variables are set
- Try building locally: `npm run build`

**Database errors:**
- Verify Supabase credentials
- Check RLS policies are enabled
- Run `npm run db:push` again

**Stripe webhook not working:**
- Verify webhook URL is correct
- Check webhook signing secret
- View webhook logs in Stripe Dashboard

**LiveKit video not working:**
- Check API credentials
- Verify WebSocket URL
- Test with https://livekit.io/test

## What's Live?

Once deployed, users can:
- ✅ Sign up and log in
- ✅ Buy Digis Coins with credit card
- ✅ View wallet balance and transactions
- ✅ Initiate video calls (Week 3)
- ❌ Live streaming (Week 4 - not yet)
- ❌ Messaging (Week 5 - not yet)

## Monitoring

**Vercel Dashboard:**
- Analytics: Page views, performance
- Functions: API route logs
- Deployments: Build history

**Supabase Dashboard:**
- Database: Table editor, SQL editor
- Logs: API requests, errors
- Auth: User signups

**Stripe Dashboard:**
- Payments: Successful charges
- Customers: User list
- Webhooks: Event delivery

**Inngest Dashboard:**
- Functions: Event processing
- Logs: Background job status
- Metrics: Success rate

## Cost Summary

**Current (Weeks 1-3):**
- Vercel: $0/month (Hobby tier)
- Supabase: $0/month (Free tier)
- Stripe: Transaction fees only (2.9% + $0.30)
- LiveKit: $0/month (first 50GB free)
- Inngest: $0/month (first 50k steps free)

**Total: $0/month** + transaction fees

**At Scale (1000+ users):**
- Vercel Pro: $20/month
- Supabase Pro: $25/month
- LiveKit: ~$150/month
- Inngest: $20/month
- Stripe fees: Variable

**Total: ~$215/month** + transaction fees

---

## Need Help?

**Deployment Issues:**
1. Check DEPLOYMENT.md for detailed steps
2. Verify all environment variables
3. Check Vercel build logs
4. Review Supabase logs

**Questions:**
- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs
- Stripe Docs: https://stripe.com/docs
- LiveKit Docs: https://docs.livekit.io

**Your app is ready to launch! 🚀**
