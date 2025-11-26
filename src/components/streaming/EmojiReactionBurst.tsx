'use client';

import { useState, useEffect } from 'react';

type FloatingEmoji = {
  id: string;
  emoji: string;
  x: number;
  delay: number;
};

type EmojiReactionBurstProps = {
  reactions: Array<{ id: string; emoji: string; timestamp: number }>;
  onComplete?: (id: string) => void;
};

// CSS-based floating emoji animation (no framer-motion dependency)
export function EmojiReactionBurstSimple({ reactions, onComplete }: EmojiReactionBurstProps) {
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);

  useEffect(() => {
    reactions.forEach(reaction => {
      const burstCount = 3;
      const newEmojis: FloatingEmoji[] = [];

      for (let i = 0; i < burstCount; i++) {
        newEmojis.push({
          id: `${reaction.id}-${i}`,
          emoji: reaction.emoji,
          x: 20 + Math.random() * 60,
          delay: i * 100,
        });
      }

      setFloatingEmojis(prev => [...prev, ...newEmojis]);

      setTimeout(() => {
        setFloatingEmojis(prev => prev.filter(e => !e.id.startsWith(reaction.id)));
        onComplete?.(reaction.id);
      }, 3000);
    });
  }, [reactions, onComplete]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {floatingEmojis.map((emoji) => (
        <div
          key={emoji.id}
          className="absolute text-4xl md:text-5xl animate-float-up"
          style={{
            left: `${emoji.x}%`,
            bottom: 0,
            animationDelay: `${emoji.delay}ms`,
            filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.5))',
          }}
        >
          {emoji.emoji}
        </div>
      ))}
      <style jsx>{`
        @keyframes float-up {
          0% {
            transform: translateY(0) scale(0.5) rotate(-10deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
            transform: translateY(-10vh) scale(1.2) rotate(5deg);
          }
          50% {
            opacity: 1;
            transform: translateY(-50vh) scale(1) rotate(-5deg);
          }
          100% {
            transform: translateY(-110vh) scale(0.8) rotate(10deg);
            opacity: 0;
          }
        }
        .animate-float-up {
          animation: float-up 2.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
