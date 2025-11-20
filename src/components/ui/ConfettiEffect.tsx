'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Heart, Star } from 'lucide-react';

interface ConfettiEffectProps {
  show: boolean;
  duration?: number;
}

export function ConfettiEffect({ show, duration = 2000 }: ConfettiEffectProps) {
  const [particles, setParticles] = useState<any[]>([]);

  useEffect(() => {
    if (show) {
      // Reduce particles on mobile for better performance
      const isMobile = window.innerWidth < 768;
      const particleCount = isMobile ? 10 : 30;

      const newParticles = [...Array(particleCount)].map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 1 + Math.random() * 0.5,
        type: ['sparkles', 'heart', 'star'][Math.floor(Math.random() * 3)],
      }));
      setParticles(newParticles);

      const timer = setTimeout(() => {
        setParticles([]);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, duration]);

  if (!show || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((particle) => {
        const Icon = particle.type === 'heart' ? Heart : particle.type === 'star' ? Star : Sparkles;

        return (
          <div
            key={particle.id}
            className="absolute"
            style={{
              left: `${particle.left}%`,
              top: '-50px',
              animation: `confetti-fall ${particle.duration}s ease-out forwards`,
              animationDelay: `${particle.delay}s`,
            }}
          >
            <Icon
              className={`${
                particle.type === 'heart'
                  ? 'text-red-500'
                  : particle.type === 'star'
                  ? 'text-yellow-400'
                  : 'text-cyan-400'
              }`}
              size={Math.random() * 20 + 20}
              fill="currentColor"
              style={{
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            />
          </div>
        );
      })}

      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 1;
          }
          50% {
            transform: translateY(50vh) rotate(180deg) scale(0.8);
            opacity: 0.8;
          }
          100% {
            transform: translateY(100vh) rotate(360deg) scale(0.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
