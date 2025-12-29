'use client';

import { useState } from 'react';
import { Coins, Sparkles } from 'lucide-react';
import { useToastContext } from '@/context/ToastContext';

interface QuickTipButtonsProps {
  creatorId: string;
  creatorName: string;
  onTipSent?: (amount: number) => void;
}

const PRESET_AMOUNTS = [10, 25, 50, 100];

export function QuickTipButtons({ creatorId, creatorName, onTipSent }: QuickTipButtonsProps) {
  const { showError } = useToastContext();
  const [sending, setSending] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleQuickTip = async (amount: number) => {
    setSending(amount);

    try {
      const response = await fetch('/api/tips/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          receiverId: creatorId,
          message: '',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send gift');
      }

      // Show confetti
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);

      onTipSent?.(amount);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to send gift');
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="relative">
      {/* Quick Gift Chips */}
      <div className="flex flex-wrap gap-2">
        {PRESET_AMOUNTS.map((amount) => (
          <button
            key={amount}
            onClick={() => handleQuickTip(amount)}
            disabled={sending !== null}
            className="group relative px-4 py-2 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-white font-bold text-sm transition-all hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center gap-1.5"
          >
            {sending === amount ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Coins className="w-4 h-4" />
                <span>{amount}</span>
              </>
            )}
          </button>
        ))}
      </div>

      {/* Confetti Effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `confetti-fall ${1 + Math.random()}s ease-out`,
              }}
            >
              <Sparkles
                className="text-yellow-400"
                size={Math.random() * 20 + 10}
                style={{
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(-200px) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
