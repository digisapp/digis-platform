import React from 'react';
import { Radio } from 'lucide-react';

interface LiveIndicatorProps {
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showText?: boolean;
  className?: string;
}

export const LiveIndicator: React.FC<LiveIndicatorProps> = ({
  size = 'md',
  showIcon = true,
  showText = true,
  className = ''
}) => {
  const sizes = {
    sm: {
      container: 'gap-1',
      dot: 'w-1.5 h-1.5',
      icon: 'w-3 h-3',
      text: 'text-xs',
      padding: 'p-1'
    },
    md: {
      container: 'gap-2',
      dot: 'w-2 h-2',
      icon: 'w-4 h-4',
      text: 'text-xs',
      padding: 'p-1.5'
    },
    lg: {
      container: 'gap-2',
      dot: 'w-3 h-3',
      icon: 'w-5 h-5',
      text: 'text-sm',
      padding: 'p-2'
    }
  };

  const currentSize = sizes[size];

  return (
    <div className={`inline-flex items-center ${currentSize.container} ${className}`}>
      {showIcon && (
        <div className={`relative ${currentSize.padding} bg-red-500/20 rounded-lg`}>
          {/* Pulsing rings */}
          <div className="absolute inset-0 bg-red-500 rounded-lg animate-ping opacity-75" />
          <div className="absolute inset-0 bg-red-500 rounded-lg animate-pulse" />

          {/* Icon */}
          <Radio className={`${currentSize.icon} text-red-500 relative z-10`} />
        </div>
      )}

      {showText && (
        <div className="flex items-center gap-1.5">
          {/* Pulsing dot */}
          <div className="relative flex items-center justify-center">
            <div className={`absolute ${currentSize.dot} bg-red-500 rounded-full animate-ping`} />
            <div className={`${currentSize.dot} bg-red-500 rounded-full relative z-10`} />
          </div>

          {/* LIVE text */}
          <span className={`${currentSize.text} font-bold text-red-500 tracking-wider`}>
            LIVE
          </span>
        </div>
      )}
    </div>
  );
};
