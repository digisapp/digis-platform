import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
});

// Coin-to-USD conversion rates
export const COIN_TO_USD_RATE = 0.01; // 100 coins = $1.00 USD for creator payouts
export const MIN_PAYOUT_COINS = 1000; // Minimum 1000 coins = $10 USD
export const MIN_PAYOUT_USD = MIN_PAYOUT_COINS * COIN_TO_USD_RATE; // $10 minimum

// Coin packages available for purchase
// Pricing competitive with Twitch Bits ($0.014/bit) and TikTok Coins ($0.013/coin)
export const COIN_PACKAGES = [
  {
    id: 'starter',
    name: '100 Digis Coins',
    coins: 100,
    price: 149, // $1.49 in cents (~$0.0149/coin)
    popular: false,
    description: 'Perfect for trying out',
  },
  {
    id: 'value',
    name: '500 Digis Coins',
    coins: 500,
    price: 699, // $6.99 in cents (~$0.0139/coin)
    popular: true,
    savings: '7% Bonus',
    description: 'Most popular choice',
  },
  {
    id: 'popular',
    name: '1000 Digis Coins',
    coins: 1000,
    price: 1299, // $12.99 in cents (~$0.0129/coin)
    popular: false,
    savings: '13% Bonus',
    description: 'Great value',
  },
  {
    id: 'best',
    name: '2500 Digis Coins',
    coins: 2500,
    price: 2999, // $29.99 in cents (~$0.0119/coin)
    popular: false,
    savings: '20% Bonus',
    description: 'Best value',
  },
  {
    id: 'ultimate',
    name: '5000 Digis Coins',
    coins: 5000,
    price: 5499, // $54.99 in cents (~$0.0109/coin)
    popular: false,
    savings: '27% Bonus',
    description: 'Maximum savings',
  },
];

export function getCoinPackage(packageId: string) {
  return COIN_PACKAGES.find((pkg) => pkg.id === packageId);
}

// Helper function to convert coins to USD for creator payouts
export function coinsToUSD(coins: number): number {
  return coins * COIN_TO_USD_RATE;
}

// Helper function to convert USD to coins
export function usdToCoins(usd: number): number {
  return Math.floor(usd / COIN_TO_USD_RATE);
}

// Helper function to format coins as USD
export function formatCoinsAsUSD(coins: number): string {
  const usd = coinsToUSD(coins);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(usd);
}
