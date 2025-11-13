'use client';

import { useEffect, useState } from 'react';
import { Coins } from 'lucide-react';

interface CoinAnimationProps {
  amount: number;
  onComplete?: () => void;
  triggerKey?: string | number; // Change this to trigger animation
}

interface FloatingCoin {
  id: string;
  x: number;
  y: number;
  rotation: number;
  delay: number;
}

export function CoinAnimation({ amount, onComplete, triggerKey }: CoinAnimationProps) {
  const [coins, setCoins] = useState<FloatingCoin[]>([]);
  const [showAmount, setShowAmount] = useState(false);

  useEffect(() => {
    if (!triggerKey) return;

    // Generate random floating coins
    const numCoins = Math.min(Math.max(3, Math.floor(amount / 10)), 15);
    const newCoins = Array.from({ length: numCoins }, (_, i) => ({
      id: `coin-${triggerKey}-${i}`,
      x: Math.random() * 200 - 100, // -100 to 100
      y: Math.random() * -150 - 50, // -50 to -200
      rotation: Math.random() * 720 - 360, // -360 to 360
      delay: i * 50, // Stagger animation
    }));

    setCoins(newCoins);
    setShowAmount(true);

    // Clean up after animation
    const timer = setTimeout(() => {
      setCoins([]);
      setShowAmount(false);
      onComplete?.();
    }, 2000);

    return () => clearTimeout(timer);
  }, [triggerKey]);

  if (coins.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      {/* Floating coins */}
      {coins.map((coin) => (
        <div
          key={coin.id}
          className="absolute animate-float-up"
          style={{
            left: '50%',
            top: '50%',
            animationDelay: `${coin.delay}ms`,
            '--float-x': `${coin.x}px`,
            '--float-y': `${coin.y}px`,
            '--rotation': `${coin.rotation}deg`,
          } as React.CSSProperties}
        >
          <Coins
            className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]"
            style={{
              filter: 'drop-shadow(0 0 10px rgba(250, 204, 21, 0.8))',
            }}
          />
        </div>
      ))}

      {/* Amount popup */}
      {showAmount && (
        <div className="absolute animate-amount-popup">
          <div className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full shadow-2xl">
            <span className="text-2xl font-bold text-white drop-shadow-lg flex items-center gap-2">
              <Coins className="w-6 h-6" />
              +{amount}
            </span>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes float-up {
          0% {
            transform: translate(0, 0) rotate(0deg) scale(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
            scale: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translate(var(--float-x), var(--float-y)) rotate(var(--rotation)) scale(0.5);
            opacity: 0;
          }
        }

        @keyframes amount-popup {
          0% {
            transform: translateY(0) scale(0);
            opacity: 0;
          }
          20% {
            transform: translateY(-20px) scale(1.2);
            opacity: 1;
          }
          80% {
            transform: translateY(-30px) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-50px) scale(0.8);
            opacity: 0;
          }
        }

        .animate-float-up {
          animation: float-up 1.5s ease-out forwards;
        }

        .animate-amount-popup {
          animation: amount-popup 2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

// Hook for easy usage
export function useCoinAnimation() {
  const [trigger, setTrigger] = useState(0);

  const playAnimation = () => {
    setTrigger(prev => prev + 1);
  };

  return { trigger, playAnimation };
}
