'use client';

import { ReactNode, ButtonHTMLAttributes } from 'react';

interface NeonButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  glowIntensity?: 'low' | 'medium' | 'high';
  className?: string;
}

export function NeonButton({
  children,
  variant = 'primary',
  glowIntensity = 'medium',
  className = '',
  disabled,
  ...props
}: NeonButtonProps) {
  const variants = {
    primary: {
      bg: 'bg-gradient-to-r from-digis-cyan to-digis-pink',
      glow: 'hover:shadow-[0_0_20px_rgba(0,245,255,0.6),0_0_40px_rgba(255,0,255,0.4)]',
      text: 'text-white',
    },
    secondary: {
      bg: 'bg-gradient-to-r from-digis-purple to-digis-pink',
      glow: 'hover:shadow-[0_0_20px_rgba(139,92,246,0.6),0_0_40px_rgba(236,72,153,0.4)]',
      text: 'text-white',
    },
    success: {
      bg: 'bg-gradient-to-r from-emerald-500 to-green-500',
      glow: 'hover:shadow-[0_0_20px_rgba(16,185,129,0.6),0_0_40px_rgba(34,197,94,0.4)]',
      text: 'text-white',
    },
    danger: {
      bg: 'bg-gradient-to-r from-red-500 to-pink-500',
      glow: 'hover:shadow-[0_0_20px_rgba(239,68,68,0.6),0_0_40px_rgba(236,72,153,0.4)]',
      text: 'text-white',
    },
  };

  const glowStrength = {
    low: 'hover:shadow-[0_0_10px_currentColor]',
    medium: variants[variant].glow,
    high: 'hover:shadow-[0_0_30px_currentColor,0_0_60px_currentColor,0_0_90px_currentColor]',
  };

  return (
    <button
      className={`
        relative px-6 py-3 rounded-lg font-semibold
        ${variants[variant].bg}
        ${variants[variant].text}
        ${glowStrength[glowIntensity]}
        transition-all duration-300
        hover:scale-105 hover:brightness-110
        active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        ${className}
        group
      `}
      disabled={disabled}
      {...props}
    >
      {/* Animated shine effect */}
      <span className="absolute inset-0 rounded-lg overflow-hidden">
        <span className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      </span>

      {/* Content */}
      <span className="relative flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  );
}
