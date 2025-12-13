'use client';

import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
}

interface ParticleEffectProps {
  trigger: boolean;
  onComplete?: () => void;
}

export function ParticleEffect({ trigger, onComplete }: ParticleEffectProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (trigger) {
      // Generate particles
      const colors = ['#FF6B9D', '#C084FC', '#22D3EE', '#A78BFA', '#FCA5A5'];
      const newParticles: Particle[] = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: 50 + (Math.random() - 0.5) * 20,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        duration: Math.random() * 1 + 1,
        delay: Math.random() * 0.3,
      }));

      setParticles(newParticles);

      // Clear particles after animation
      const timer = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [trigger, onComplete]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full animate-particle"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            animation: `particle-float ${particle.duration}s ease-out ${particle.delay}s forwards`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes particle-float {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(
              ${Math.random() * 200 - 100}px,
              ${-200 - Math.random() * 200}px
            ) scale(0);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

export function SuccessAnimation({ show, onComplete }: { show: boolean; onComplete?: () => void }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onComplete?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm">
      <div className="glass rounded-3xl border-2 border-purple-200 p-12 text-center animate-scale-in">
        <div className="relative mb-6 flex items-center justify-center">
          <div className="absolute bg-gradient-to-br from-digis-pink via-digis-purple to-digis-cyan rounded-full animate-spin-slow opacity-20"
               style={{ width: 100, height: 100 }} />
          <img
            src="/images/digis-logo-white.png"
            alt="Digis"
            className="relative w-20 h-20 object-contain animate-bounce-in drop-shadow-[0_0_15px_rgba(192,132,252,0.5)]"
          />
        </div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-digis-pink via-digis-purple to-digis-cyan bg-clip-text text-transparent mb-2">
          Going Live!
        </h2>
        <p className="text-gray-700">Preparing your broadcast studio...</p>
      </div>
      <style jsx>{`
        @keyframes scale-in {
          0% {
            transform: scale(0.8);
            opacity: 0;
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes bounce-in {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.2);
          }
        }
        @keyframes spin-slow {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.5s ease-out;
        }
        .animate-bounce-in {
          animation: bounce-in 0.6s ease-in-out;
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
