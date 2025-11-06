'use client';

import { HTMLAttributes, forwardRef } from 'react';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: 'cyan' | 'pink' | 'purple' | 'none';
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({
    glow = 'none',
    hover = true,
    padding = 'md',
    className = '',
    children,
    ...props
  }, ref) => {
    const baseClasses = 'glass rounded-2xl border-2 border-transparent transition-all duration-300';
    const hoverClass = hover ? 'glass-hover' : '';

    const paddingClasses = {
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    const glowClasses = {
      cyan: 'border-digis-cyan/30 hover:border-digis-cyan hover:glow-cyan',
      pink: 'border-digis-pink/30 hover:border-digis-pink hover:glow-pink',
      purple: 'border-digis-purple/30 hover:border-digis-purple',
      none: 'hover:border-white/20',
    };

    return (
      <div
        ref={ref}
        className={`${baseClasses} ${hoverClass} ${paddingClasses[padding]} ${glowClasses[glow]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';
