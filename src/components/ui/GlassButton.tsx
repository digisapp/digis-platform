'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'cyan' | 'pink' | 'purple' | 'gradient' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  shimmer?: boolean;
  glow?: boolean;
}

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({
    variant = 'gradient',
    size = 'md',
    shimmer = false,
    glow = false,
    className = '',
    children,
    ...props
  }, ref) => {
    const baseClasses = 'glass glass-hover rounded-full font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed';

    const sizeClasses = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg',
    };

    const variantClasses = {
      cyan: 'border-2 border-digis-cyan text-white hover:glow-cyan hover:bg-cyan-500/10',
      pink: 'border-2 border-digis-pink text-white hover:glow-pink hover:bg-pink-500/10',
      purple: 'border-2 border-digis-purple text-white hover:bg-purple-500/10',
      gradient: 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white font-semibold border-none hover:from-cyan-500 hover:to-purple-500',
      ghost: 'border-2 border-cyan-500/30 text-white hover:border-cyan-500/50 hover:bg-white/5',
    };

    const shimmerClass = shimmer ? 'shimmer' : '';
    const glowClass = glow ? (variant === 'pink' ? 'glow-pink' : 'glow-cyan') : '';

    return (
      <button
        ref={ref}
        className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${shimmerClass} ${glowClass} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

GlassButton.displayName = 'GlassButton';
