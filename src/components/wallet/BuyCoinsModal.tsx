'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { GlassModal, GlassButton, LoadingSpinner } from '@/components/ui';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { Coins, ArrowLeft, CheckCircle } from 'lucide-react';
import { COIN_PACKAGES } from '@/lib/stripe/constants';
import { PaymentErrorBoundary } from '@/components/error-boundaries';

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
}));

export function BuyCoinsModal({ isOpen, onClose, onSuccess }: BuyCoinsModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkoutComplete, setCheckoutComplete] = useState(false);
  const stripePromiseRef = useRef<Promise<Stripe | null> | null>(null);

  // Lazily load Stripe only when the modal opens
  useEffect(() => {
    if (isOpen && !stripePromiseRef.current) {
      stripePromiseRef.current = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
    }
  }, [isOpen]);

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
    // Play coin purchase sound
    const audio = new Audio('/sounds/coin-purchase.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {});
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
      <div className="space-y-2 sm:space-y-4">
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
            <div className="min-h-[400px] pb-16 sm:pb-0">
              <PaymentErrorBoundary
                transactionType="purchase"
                onRetry={handleBack}
                onClose={onClose}
              >
                <EmbeddedCheckoutProvider
                  stripe={stripePromiseRef.current}
                  options={{
                    clientSecret,
                    onComplete: handleCheckoutComplete,
                  }}
                >
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              </PaymentErrorBoundary>
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
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              {DISPLAY_PACKAGES.map((pkg) => (
                <div
                  key={pkg.id}
                  className="glass glass-hover p-2.5 sm:p-5 rounded-xl sm:rounded-2xl cursor-pointer transition-all border-2 border-transparent hover:border-white/20 active:scale-95"
                  onClick={() => handleSelectPackage(pkg.id)}
                >
                  {/* Package Details - Compact on mobile */}
                  <div className="text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-1 sm:gap-3 mb-2 sm:mb-3">
                      <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                          <Coins className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-sm sm:text-xl font-bold text-white">{pkg.coins.toLocaleString()}</p>
                          <p className="text-[10px] sm:text-xs text-gray-400">coins</p>
                        </div>
                      </div>
                      <div className="sm:text-right">
                        <p className="text-lg sm:text-2xl font-bold text-emerald-400">{pkg.price}</p>
                      </div>
                    </div>
                  </div>

                  {/* Select Button */}
                  <GlassButton
                    variant="cyan"
                    size="sm"
                    className="w-full text-xs sm:text-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectPackage(pkg.id);
                    }}
                  >
                    Buy
                  </GlassButton>
                </div>
              ))}
            </div>

            {/* Security Info - More compact on mobile */}
            <div className="text-center text-[10px] sm:text-xs text-gray-400 pt-1 sm:pt-2">
              <p>🔒 Secure payment • Apple Pay & Google Pay</p>
            </div>
          </>
        )}
      </div>
    </GlassModal>
  );
}
