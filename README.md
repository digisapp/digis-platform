# Digis - Creator Economy Platform

A Next.js 15 platform connecting creators and fans through video calls, live streaming, and exclusive content. Powered by Digis Coins.

## Features (Week 1 Complete)

- ✅ **Modern Tech Stack**: Next.js 15, TypeScript, Supabase, Drizzle ORM
- ✅ **Authentication**: Email/password signup and login with Supabase Auth
- ✅ **Glassmorphism UI**: Beautiful Tokyo-inspired design with neon accents
- ✅ **Database Schema**: Users, profiles, wallet with double-entry ledger
- ✅ **Spend Holds System**: Prevents mid-transaction failures
- ✅ **Component Library**: Reusable glass components (Button, Card, Input, Modal)

## Tech Stack

- **Framework**: Next.js 15.0.3 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (glassmorphism design)
- **Database**: Supabase (PostgreSQL)
- **ORM**: Drizzle
- **Authentication**: Supabase Auth
- **Payments**: Stripe (coming in Week 2)
- **Video**: LiveKit (coming in Week 3)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase account (free tier works)
- npm or yarn package manager

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd digis-app
npm install
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the database to be provisioned (~2 minutes)
3. Go to Project Settings → API
4. Copy your project URL and anon key

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Fill in your Supabase credentials:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:your-password@db.your-project.supabase.co:5432/postgres
```

### 4. Push Database Schema

```bash
npm run db:push
```

This will create all the necessary tables in your Supabase database:
- users
- profiles
- wallets
- wallet_transactions
- spend_holds

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

### Users Table
- User authentication and basic profile info
- Role-based access (fan, creator, admin)
- Creator verification status

### Wallets Table
- User balance in Digis Coins
- Held balance (coins in active holds)
- Last reconciliation timestamp

### Wallet Transactions (Double-Entry Ledger)
- All coin movements
- Idempotency keys prevent double-charges
- Transaction types: purchase, gift, call_charge, stream_tip, etc.

### Spend Holds
- Reserve coins for active calls/streams
- Prevents mid-transaction failures
- Auto-settle or release based on activity

## Deployment to Vercel

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Week 1 complete: Foundation ready for deployment"
git push origin main
```

### Step 2: Import to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Import Project"
3. Select your GitHub repository
4. Vercel will auto-detect Next.js settings

### Step 3: Add Environment Variables

In Vercel project settings, add:

```
NEXT_PUBLIC_SUPABASE_URL=<your-value>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-value>
SUPABASE_SERVICE_ROLE_KEY=<your-value>
DATABASE_URL=<your-value>
```

### Step 4: Deploy

Click "Deploy" and wait ~2 minutes.

Your app will be live at `https://your-project.vercel.app`

## Week 1 Exit Criteria

- [x] User can sign up and log in
- [x] Database schema deployed with RLS policies
- [x] At least 5 glass components working
- [x] Project deploys to Vercel successfully

## Coming in Week 2: Wallet System

- Double-entry ledger implementation
- Idempotency checks
- Stripe integration
- Buy coins modal
- Webhook processing with Inngest

## Project Structure

```
digis-app/
├── src/
│   ├── app/
│   │   ├── api/auth/          # Auth API routes
│   │   ├── globals.css         # Global styles with glassmorphism
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Home page
│   ├── components/
│   │   ├── auth/               # Login/Signup modals
│   │   └── ui/                 # Glass component library
│   ├── db/
│   │   ├── schema/             # Drizzle schema files
│   │   └── index.ts            # Database connection
│   └── lib/
│       └── supabase/           # Supabase client utilities
├── drizzle.config.ts           # Drizzle configuration
├── tailwind.config.ts          # Tailwind with Digis colors
└── package.json
```

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:generate  # Generate Drizzle migrations
npm run db:push      # Push schema to database
npm run db:studio    # Open Drizzle Studio (DB GUI)
```

## Component Usage

### Glass Button

```tsx
import { GlassButton } from '@/components/ui';

<GlassButton variant="gradient" size="lg" shimmer>
  Buy Coins
</GlassButton>
```

### Glass Card

```tsx
import { GlassCard } from '@/components/ui';

<GlassCard glow="cyan" padding="lg">
  <h2>Card Title</h2>
  <p>Card content...</p>
</GlassCard>
```

### Wallet Widget

```tsx
import { WalletWidget } from '@/components/ui';

<WalletWidget coins={1250} />
```

## Design System

**Colors:**
- Cyan: `#00BFFF` (primary action, borders)
- Pink: `#FF69B4` (secondary action, highlights)
- Purple: `#9D4EDD` (accents)
- Blue: `#4361EE` (gradients)

**Effects:**
- Glass: `backdrop-blur-10px` with subtle white overlay
- Glow: Neon box shadows on hover
- Shimmer: Animated gradient overlay

## License

Proprietary - All rights reserved

## Support

For issues or questions, please contact the team or open a GitHub issue.

---

**Built with ❤️ for the creator economy**
# Test auto-deploy
