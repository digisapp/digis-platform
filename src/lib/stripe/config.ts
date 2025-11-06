import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
});

// Coin packages available for purchase
export const COIN_PACKAGES = [
  {
    id: 'starter',
    name: '100 Digis Coins',
    coins: 100,
    price: 999, // $9.99 in cents
    popular: false,
  },
  {
    id: 'popular',
    name: '500 Digis Coins',
    coins: 500,
    price: 4499, // $44.99 in cents (10% bonus)
    popular: true,
    savings: '10% Bonus',
  },
  {
    id: 'premium',
    name: '1000 Digis Coins',
    coins: 1000,
    price: 7999, // $79.99 in cents (20% bonus)
    popular: false,
    savings: '20% Bonus',
  },
  {
    id: 'ultimate',
    name: '5000 Digis Coins',
    coins: 5000,
    price: 34999, // $349.99 in cents (30% bonus)
    popular: false,
    savings: '30% Bonus',
  },
];

export function getCoinPackage(packageId: string) {
  return COIN_PACKAGES.find((pkg) => pkg.id === packageId);
}
