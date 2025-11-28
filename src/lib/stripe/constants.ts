// Client-safe Stripe constants and utility functions
// This file can be safely imported in client components

// Coin-to-USD conversion rates
export const COIN_TO_USD_RATE = 0.10; // 10 coins = $1.00 USD for creator payouts (1 coin = $0.10)
export const MIN_PAYOUT_COINS = 100; // Minimum 100 coins = $10 USD
export const MIN_PAYOUT_USD = MIN_PAYOUT_COINS * COIN_TO_USD_RATE; // $10 minimum

// Coin packages available for purchase
// Net margins: 28-34% after Stripe fees (~3%)
// Creator payout: $0.10 per coin (10 coins = $1.00)
export const COIN_PACKAGES = [
  {
    id: 'starter',
    name: '20 Coins',
    coins: 20,
    price: 299, // $2.99 - margin 30%
    popular: false,
    description: 'Perfect for trying out',
  },
  {
    id: 'popular',
    name: '50 Coins',
    coins: 50,
    price: 799, // $7.99 - margin 34%
    popular: true,
    savings: '10% Bonus',
    description: 'Most popular choice',
  },
  {
    id: 'value',
    name: '100 Coins',
    coins: 100,
    price: 1599, // $15.99 - margin 34%
    popular: false,
    savings: '15% Bonus',
    description: 'Great value',
  },
  {
    id: 'best',
    name: '250 Coins',
    coins: 250,
    price: 3899, // $38.99 - margin 33%
    popular: false,
    savings: '20% Bonus',
    description: 'Best value',
  },
  {
    id: 'ultimate',
    name: '500 Coins',
    coins: 500,
    price: 7499, // $74.99 - margin 30%
    popular: false,
    savings: '25% Bonus',
    description: 'Maximum savings',
  },
  {
    id: 'super',
    name: '1,000 Coins',
    coins: 1000,
    price: 14499, // $144.99 - margin 28%
    popular: false,
    savings: '30% Bonus',
    description: 'For super fans',
  },
  {
    id: 'whale',
    name: '5,000 Coins',
    coins: 5000,
    price: 49999, // $499.99 - margin 0% (break-even for Mansion gift)
    popular: false,
    savings: '35% Bonus',
    description: 'Ultimate supporter',
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
