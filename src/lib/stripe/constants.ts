// Client-safe Stripe constants and utility functions
// This file can be safely imported in client components

// Coin-to-USD conversion rates
export const COIN_TO_USD_RATE = 0.10; // 10 coins = $1.00 USD for creator payouts (1 coin = $0.10)
export const MIN_PAYOUT_COINS = 100; // Minimum 100 coins = $10 USD
export const MIN_PAYOUT_USD = MIN_PAYOUT_COINS * COIN_TO_USD_RATE; // $10 minimum

// Coin packages available for purchase
// Competitive pricing: 30-40% margin (between Fanfix 20% and Chaturbate 50%)
// Creator payout: $0.10 per coin (10 coins = $1.00) - 2x what creators earn on Chaturbate
export const COIN_PACKAGES = [
  {
    id: '20',
    name: '20 Coins',
    coins: 20,
    price: 329, // $3.29 - $0.165/coin - 39% margin
    popular: false,
  },
  {
    id: '50',
    name: '50 Coins',
    coins: 50,
    price: 799, // $7.99 - $0.16/coin - 37% margin
    popular: false,
  },
  {
    id: '100',
    name: '100 Coins',
    coins: 100,
    price: 1499, // $14.99 - $0.15/coin - 33% margin
    popular: true,
  },
  {
    id: '250',
    name: '250 Coins',
    coins: 250,
    price: 3599, // $35.99 - $0.144/coin - 31% margin
    popular: false,
  },
  {
    id: '500',
    name: '500 Coins',
    coins: 500,
    price: 7199, // $71.99 - $0.144/coin - 31% margin
    popular: false,
  },
  {
    id: '1000',
    name: '1,000 Coins',
    coins: 1000,
    price: 14299, // $142.99 - $0.143/coin - 30% margin
    popular: false,
  },
  {
    id: '3000',
    name: '3,000 Coins',
    coins: 3000,
    price: 42999, // $429.99 - $0.143/coin - 30% margin (bulk discount)
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
