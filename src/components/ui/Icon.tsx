import React from 'react';
import { LucideIcon } from 'lucide-react';

interface IconProps {
  icon: LucideIcon;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  variant?: 'default' | 'brand' | 'success' | 'warning' | 'danger' | 'muted' | 'cyan' | 'pink' | 'purple' | 'gold';
  className?: string;
  strokeWidth?: number;
  animate?: 'pulse' | 'bounce' | 'spin' | 'none';
}

export const Icon: React.FC<IconProps> = ({
  icon: LucideIcon,
  size = 'md',
  variant = 'default',
  className = '',
  strokeWidth = 2,
  animate = 'none'
}) => {
  const sizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
    '2xl': 'w-10 h-10'
  };

  const variants = {
    default: 'text-gray-700',
    brand: 'text-digis-cyan',
    success: 'text-green-500',
    warning: 'text-yellow-500',
    danger: 'text-red-500',
    muted: 'text-gray-500',
    cyan: 'text-digis-cyan',
    pink: 'text-digis-pink',
    purple: 'text-digis-purple',
    gold: 'text-yellow-600'
  };

  const animations = {
    pulse: 'animate-pulse',
    bounce: 'animate-bounce',
    spin: 'animate-spin',
    none: ''
  };

  return (
    <LucideIcon
      className={`${sizes[size]} ${variants[variant]} ${animations[animate]} ${className}`}
      strokeWidth={strokeWidth}
    />
  );
};

interface IconContainerProps {
  children: React.ReactNode;
  variant?: 'cyan' | 'pink' | 'purple' | 'green' | 'red' | 'yellow' | 'blue';
  size?: 'sm' | 'md' | 'lg';
  glow?: boolean;
  className?: string;
}

export const IconContainer: React.FC<IconContainerProps> = ({
  children,
  variant = 'cyan',
  size = 'md',
  glow = false,
  className = ''
}) => {
  const sizes = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3'
  };

  const variants = {
    cyan: 'bg-digis-cyan/20 text-digis-cyan',
    pink: 'bg-digis-pink/20 text-digis-pink',
    purple: 'bg-digis-purple/20 text-digis-purple',
    green: 'bg-green-500/20 text-green-600',
    red: 'bg-red-500/20 text-red-500',
    yellow: 'bg-yellow-500/20 text-yellow-600',
    blue: 'bg-blue-500/20 text-blue-500'
  };

  return (
    <div className={`relative ${sizes[size]} rounded-lg ${variants[variant]} ${glow ? 'shadow-lg' : ''} ${className}`}>
      {glow && (
        <div className="absolute inset-0 bg-current opacity-20 blur-lg rounded-lg animate-pulse" />
      )}
      <div className="relative">
        {children}
      </div>
    </div>
  );
};
