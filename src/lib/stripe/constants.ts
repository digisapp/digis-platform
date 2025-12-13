// Client-safe Stripe constants and utility functions
// This file can be safely imported in client components

// Coin-to-USD conversion rates
export const COIN_TO_USD_RATE = 0.10; // 10 coins = $1.00 USD for creator payouts (1 coin = $0.10)
export const MIN_PAYOUT_COINS = 100; // Minimum 100 coins = $10 USD
export const MIN_PAYOUT_USD = MIN_PAYOUT_COINS * COIN_TO_USD_RATE; // $10 minimum

// Coin packages available for purchase
// Premium pricing: ~50% margin (industry standard for live streaming platforms)
// Creator payout: $0.10 per coin (10 coins = $1.00) - 2x what creators earn on Chaturbate
export const COIN_PACKAGES = [
  {
    id: '20',
    name: '20 Coins',
    coins: 20,
    price: 399, // $3.99 - $0.20/coin - 50% margin
    popular: false,
  },
  {
    id: '50',
    name: '50 Coins',
    coins: 50,
    price: 999, // $9.99 - $0.20/coin - 50% margin
    popular: false,
  },
  {
    id: '100',
    name: '100 Coins',
    coins: 100,
    price: 1999, // $19.99 - $0.20/coin - 50% margin
    popular: true,
  },
  {
    id: '250',
    name: '250 Coins',
    coins: 250,
    price: 4999, // $49.99 - $0.20/coin - 50% margin
    popular: false,
  },
  {
    id: '500',
    name: '500 Coins',
    coins: 500,
    price: 9499, // $94.99 - $0.19/coin - 47% margin
    popular: false,
  },
  {
    id: '1000',
    name: '1,000 Coins',
    coins: 1000,
    price: 17999, // $179.99 - $0.18/coin - 44% margin
    popular: false,
  },
  {
    id: '4000',
    name: '4,000 Coins',
    coins: 4000,
    price: 64999, // $649.99 - $0.16/coin - 38% margin (bulk discount)
    popular: false,
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
