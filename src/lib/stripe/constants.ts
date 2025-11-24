// Client-safe Stripe constants and utility functions
// This file can be safely imported in client components

// Coin-to-USD conversion rates
export const COIN_TO_USD_RATE = 0.01; // 100 coins = $1.00 USD for creator payouts
export const MIN_PAYOUT_COINS = 1000; // Minimum 1000 coins = $10 USD
export const MIN_PAYOUT_USD = MIN_PAYOUT_COINS * COIN_TO_USD_RATE; // $10 minimum

// Coin packages available for purchase
// Pricing competitive with Twitch Bits ($0.014/bit) and TikTok Coins ($0.013/coin)
// Net margins: 25-40% after Stripe fees
export const COIN_PACKAGES = [
  {
    id: 'starter',
    name: '100 Digis Coins',
    coins: 100,
    price: 179, // $1.79 in cents (~$0.0179/coin)
    popular: false,
    description: 'Perfect for trying out',
  },
  {
    id: 'value',
    name: '500 Digis Coins',
    coins: 500,
    price: 849, // $8.49 in cents (~$0.0169/coin)
    popular: true,
    savings: '6% Bonus',
    description: 'Most popular choice',
  },
  {
    id: 'popular',
    name: '1000 Digis Coins',
    coins: 1000,
    price: 1599, // $15.99 in cents (~$0.0159/coin)
    popular: false,
    savings: '11% Bonus',
    description: 'Great value',
  },
  {
    id: 'best',
    name: '2500 Digis Coins',
    coins: 2500,
    price: 3699, // $36.99 in cents (~$0.0147/coin)
    popular: false,
    savings: '18% Bonus',
    description: 'Best value',
  },
  {
    id: 'ultimate',
    name: '5000 Digis Coins',
    coins: 5000,
    price: 6799, // $67.99 in cents (~$0.0135/coin)
    popular: false,
    savings: '25% Bonus',
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
