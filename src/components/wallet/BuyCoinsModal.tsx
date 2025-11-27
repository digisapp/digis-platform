'use client';

import { useState } from 'react';
import { GlassModal, GlassButton, LoadingSpinner } from '@/components/ui';
import { loadStripe } from '@stripe/stripe-js';
import { COIN_PACKAGES } from '@/lib/stripe/constants';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface BuyCoinsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Format coin packages for display
const formatPrice = (cents: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
};

const DISPLAY_PACKAGES = COIN_PACKAGES.map(pkg => ({
  id: pkg.id,
  name: pkg.name,
  coins: pkg.coins,
  price: formatPrice(pkg.price),
  priceValue: pkg.price,
  popular: pkg.popular,
  savings: pkg.savings,
  description: pkg.description,
}));

export function BuyCoinsModal({ isOpen, onClose, onSuccess }: BuyCoinsModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePurchase = async (packageId: string) => {
    setError('');
    setLoading(true);

    try {
      // Create Stripe checkout session
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title="Buy Digis Coins" size="lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="text-6xl mb-4">🪙</div>
          <p className="text-gray-300">
            Purchase Digis Coins to unlock video calls, live streams, and exclusive content
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 rounded-lg bg-red-500/20 border border-red-500 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Package Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {DISPLAY_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className={`
                glass glass-hover p-6 rounded-2xl cursor-pointer transition-all
                ${selectedPackage === pkg.id ? 'border-2 border-digis-cyan glow-cyan' : 'border-2 border-transparent'}
                ${pkg.popular ? 'border-digis-pink glow-pink' : ''}
              `}
              onClick={() => setSelectedPackage(pkg.id)}
            >
              {/* Popular Badge */}
              {pkg.popular && (
                <div className="mb-3">
                  <span className="bg-gradient-to-r from-digis-pink to-digis-purple px-3 py-1 rounded-full text-xs font-bold text-white">
                    MOST POPULAR
                  </span>
                </div>
              )}

              {/* Package Details */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🪙</span>
                  <div>
                    <h3 className="text-2xl font-bold text-white">{pkg.name}</h3>
                    {pkg.savings && (
                      <p className="text-sm text-digis-cyan font-medium">{pkg.savings}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-white">{pkg.price}</p>
                </div>
              </div>

              {/* Buy Button */}
              <GlassButton
                variant={pkg.popular ? 'gradient' : 'cyan'}
                size="lg"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePurchase(pkg.id);
                }}
                disabled={loading}
              >
                {loading && selectedPackage === pkg.id ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  `Buy for ${pkg.price}`
                )}
              </GlassButton>
            </div>
          ))}
        </div>

        {/* Security Info */}
        <div className="text-center text-sm text-gray-400 space-y-2">
          <p>🔒 Secure payment processing by Stripe</p>
          <p>✨ Coins are added instantly after purchase</p>
          <p>💸 No recurring charges • Pay once, use anywhere</p>
        </div>
      </div>
    </GlassModal>
  );
}
