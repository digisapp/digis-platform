'use client';

import { useEffect, useState } from 'react';
import type { VirtualGift, StreamGift } from '@/db/schema';

type GiftAnimationProps = {
  gift: VirtualGift;
  streamGift: StreamGift;
  onComplete: () => void;
};

export function GiftAnimation({ gift, streamGift, onComplete }: GiftAnimationProps) {
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    // Auto-remove after animation completes
    const timer = setTimeout(() => {
      setRemoving(true);
      setTimeout(onComplete, 500); // Fade out duration
    }, getAnimationDuration(gift.animationType));

    return () => clearTimeout(timer);
  }, [gift.animationType, onComplete]);

  const getAnimationClass = (type: string) => {
    switch (type) {
      case 'float':
        return 'gift-float';
      case 'burst':
        return 'gift-burst';
      case 'confetti':
        return 'gift-confetti';
      case 'fireworks':
        return 'gift-fireworks';
      default:
        return 'gift-float';
    }
  };

  const getAnimationDuration = (type: string) => {
    switch (type) {
      case 'float':
        return 2000;
      case 'burst':
        return 1500;
      case 'confetti':
        return 3000;
      case 'fireworks':
        return 2500;
      default:
        return 2000;
    }
  };

  return (
    <div className={`gift-animation-container ${removing ? 'removing' : ''}`}>
      <div className={`gift-animation ${getAnimationClass(gift.animationType)}`}>
        <div className="gift-emoji">{gift.emoji}</div>
        <div className="gift-info">
          <div className="gift-sender">{streamGift.senderUsername}</div>
          <div className="gift-details">
            sent {streamGift.quantity > 1 ? `${streamGift.quantity}x ` : ''}
            {gift.name}
          </div>
        </div>
      </div>

      {/* Particle effects for special animations */}
      {gift.animationType === 'confetti' && (
        <div className="confetti-particles">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="confetti-particle"
              style={{
                '--delay': `${i * 0.05}s`,
                '--rotation': `${Math.random() * 360}deg`,
                '--x': `${(Math.random() - 0.5) * 300}px`,
                '--y': `${Math.random() * 400 + 100}px`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      {gift.animationType === 'fireworks' && (
        <div className="fireworks-container">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="firework"
              style={{
                '--delay': `${i * 0.3}s`,
                '--x': `${(Math.random() - 0.5) * 200}px`,
              } as React.CSSProperties}
            >
              {Array.from({ length: 12 }).map((_, j) => (
                <div
                  key={j}
                  className="firework-particle"
                  style={{
                    '--angle': `${j * 30}deg`,
                  } as React.CSSProperties}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .gift-animation-container {
          position: fixed;
          bottom: 100px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9999;
          pointer-events: none;
          transition: opacity 0.5s;
        }

        .gift-animation-container.removing {
          opacity: 0;
        }

        .gift-animation {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 2rem;
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(10px);
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        }

        .gift-emoji {
          font-size: 3rem;
          line-height: 1;
        }

        .gift-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .gift-sender {
          font-weight: 700;
          color: #00BFFF;
          font-size: 1.1rem;
        }

        .gift-details {
          color: #fff;
          font-size: 0.9rem;
        }

        /* Float Animation */
        .gift-float {
          animation: float-up 2s ease-out forwards;
        }

        @keyframes float-up {
          from {
            transform: translateY(0) scale(0.5);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          50% {
            transform: translateY(-100px) scale(1);
            opacity: 1;
          }
          to {
            transform: translateY(-200px) scale(1.2);
            opacity: 0;
          }
        }

        /* Burst Animation */
        .gift-burst {
          animation: burst 1.5s ease-out forwards;
        }

        @keyframes burst {
          0% {
            transform: scale(0) rotate(0deg);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          50% {
            transform: scale(1.3) rotate(180deg);
          }
          80% {
            transform: scale(1.1) rotate(340deg);
            opacity: 1;
          }
          100% {
            transform: scale(0.8) rotate(360deg);
            opacity: 0;
          }
        }

        /* Confetti Animation */
        .gift-confetti {
          animation: confetti-pop 3s ease-out forwards;
        }

        @keyframes confetti-pop {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          20% {
            transform: scale(1.2);
            opacity: 1;
          }
          80% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }

        .confetti-particles {
          position: absolute;
          top: 0;
          left: 50%;
          width: 1px;
          height: 1px;
        }

        .confetti-particle {
          position: absolute;
          width: 10px;
          height: 10px;
          background: linear-gradient(45deg, #00BFFF, #FF69B4, #FFD700);
          animation: confetti-fall 2s ease-out forwards;
          animation-delay: var(--delay);
          transform: rotate(var(--rotation));
        }

        @keyframes confetti-fall {
          0% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate(var(--x), var(--y)) rotate(720deg);
            opacity: 0;
          }
        }

        /* Fireworks Animation */
        .gift-fireworks {
          animation: fireworks-center 2.5s ease-out forwards;
        }

        @keyframes fireworks-center {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          30% {
            transform: scale(1.1);
            opacity: 1;
          }
          70% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }

        .fireworks-container {
          position: absolute;
          top: 50%;
          left: 50%;
        }

        .firework {
          position: absolute;
          animation: firework-launch 1s ease-out forwards;
          animation-delay: var(--delay);
          transform: translate(var(--x), 0);
        }

        @keyframes firework-launch {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-200px);
          }
        }

        .firework-particle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: radial-gradient(circle, #fff, #00BFFF, #FF69B4);
          border-radius: 50%;
          animation: firework-explode 0.8s ease-out forwards;
          animation-delay: calc(var(--delay) + 0.5s);
          transform: rotate(var(--angle)) translateX(0);
          opacity: 0;
        }

        @keyframes firework-explode {
          0% {
            transform: rotate(var(--angle)) translateX(0);
            opacity: 1;
          }
          100% {
            transform: rotate(var(--angle)) translateX(80px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

// Container to manage multiple gift animations
type GiftAnimationManagerProps = {
  gifts: Array<{ gift: VirtualGift; streamGift: StreamGift }>;
  onRemove: (index: number) => void;
};

export function GiftAnimationManager({ gifts, onRemove }: GiftAnimationManagerProps) {
  return (
    <>
      {gifts.map((item, index) => (
        <GiftAnimation
          key={`${item.streamGift.id}-${index}`}
          gift={item.gift}
          streamGift={item.streamGift}
          onComplete={() => onRemove(index)}
        />
      ))}
    </>
  );
}
