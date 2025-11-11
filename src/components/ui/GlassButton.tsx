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
      cyan: 'border-2 border-digis-cyan text-white hover:glow-cyan',
      pink: 'border-2 border-digis-pink text-white hover:glow-pink',
      purple: 'border-2 border-digis-purple text-white',
      gradient: 'bg-gradient-to-r from-digis-cyan to-digis-pink text-gray-900 font-semibold border-none',
      ghost: 'border border-white/20 text-white hover:border-white/40',
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
