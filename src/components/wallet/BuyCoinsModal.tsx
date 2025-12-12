'use client';

import { useState, useEffect, useCallback } from 'react';
import { GlassModal, GlassButton, LoadingSpinner } from '@/components/ui';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { Coins, ArrowLeft, CheckCircle } from 'lucide-react';
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
}));

export function BuyCoinsModal({ isOpen, onClose, onSuccess }: BuyCoinsModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkoutComplete, setCheckoutComplete] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedPackage(null);
      setClientSecret(null);
      setError('');
      setCheckoutComplete(false);
    }
  }, [isOpen]);

  // Create embedded checkout session when package is selected
  const handleSelectPackage = async (packageId: string) => {
    setSelectedPackage(packageId);
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/stripe/create-embedded-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      setClientSecret(data.clientSecret);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setSelectedPackage(null);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedPackage(null);
    setClientSecret(null);
    setError('');
  };

  const handleCheckoutComplete = useCallback(() => {
    setCheckoutComplete(true);
    // Trigger success callback after a short delay
    setTimeout(() => {
      onSuccess?.();
      onClose();
    }, 2000);
  }, [onSuccess, onClose]);

  // Get selected package details
  const selectedPkg = DISPLAY_PACKAGES.find(p => p.id === selectedPackage);

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={clientSecret ? () => {} : onClose}
      title={clientSecret ? undefined : "Buy Coins"}
      size="lg"
    >
      <div className="space-y-4">
        {/* Error Message */}
        {error && (
          <div className="p-4 rounded-lg bg-red-500/20 border border-red-500 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Checkout Complete State */}
        {checkoutComplete ? (
          <div className="text-center py-8">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Payment Successful!</h3>
            <div className="flex items-center justify-center gap-2 mb-4">
              <Coins className="w-6 h-6 text-green-400" />
              <span className="text-lg font-bold text-green-400">Coins Added!</span>
            </div>
            <p className="text-gray-400">Closing...</p>
          </div>
        ) : clientSecret ? (
          /* Embedded Checkout Form */
          <div>
            {/* Back button and package info */}
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div className="flex-1">
                <p className="text-sm text-gray-400">Purchasing</p>
                <p className="font-bold text-white">{selectedPkg?.name} - {selectedPkg?.price}</p>
              </div>
            </div>

            {/* Stripe Embedded Checkout */}
            <div className="min-h-[400px]">
              <EmbeddedCheckoutProvider
                stripe={stripePromise}
                options={{
                  clientSecret,
                  onComplete: handleCheckoutComplete,
                }}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          </div>
        ) : loading ? (
          /* Loading State */
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          /* Package Selection */
          <>
            <div className="grid md:grid-cols-2 gap-4">
              {DISPLAY_PACKAGES.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`
                    glass glass-hover p-5 rounded-2xl cursor-pointer transition-all
                    ${pkg.popular ? 'border-2 border-digis-pink glow-pink' : 'border-2 border-transparent hover:border-white/20'}
                  `}
                  onClick={() => handleSelectPackage(pkg.id)}
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
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                        <Coins className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{pkg.name}</h3>
                        <p className="text-xs text-gray-400">{pkg.coins.toLocaleString()} coins</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">{pkg.price}</p>
                    </div>
                  </div>

                  {/* Select Button */}
                  <GlassButton
                    variant={pkg.popular ? 'gradient' : 'cyan'}
                    size="md"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectPackage(pkg.id);
                    }}
                  >
                    Select
                  </GlassButton>
                </div>
              ))}
            </div>

            {/* Security Info */}
            <div className="text-center text-xs text-gray-400 space-y-1 pt-2">
              <p>🔒 Secure payment powered by Stripe</p>
              <p>✨ Coins added instantly • Apple Pay & Google Pay supported</p>
            </div>
          </>
        )}
      </div>
    </GlassModal>
  );
}
