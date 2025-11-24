// Server-side Stripe configuration
// DO NOT import this file in client components - use @/lib/stripe/constants instead

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
});

// Re-export constants for server-side use
export * from './constants';
