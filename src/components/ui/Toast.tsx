'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, X, Sparkles } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onClose, 300); // Wait for exit animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0 animate-bounce-in" />;
      case 'error':
        return <XCircle className="w-6 h-6 text-rose-500 flex-shrink-0 animate-shake" />;
      default:
        return <AlertCircle className="w-6 h-6 text-cyan-500 flex-shrink-0 animate-bounce-in" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          gradient: 'from-emerald-500 via-green-500 to-teal-500',
          bg: 'from-gray-900/95 via-gray-800/95 to-gray-900/95',
          border: 'border-emerald-500/50',
          glow: 'shadow-emerald-500/30',
        };
      case 'error':
        return {
          gradient: 'from-rose-500 via-pink-500 to-red-500',
          bg: 'from-gray-900/95 via-gray-800/95 to-gray-900/95',
          border: 'border-rose-500/50',
          glow: 'shadow-rose-500/30',
        };
      default:
        return {
          gradient: 'from-cyan-500 via-blue-500 to-indigo-500',
          bg: 'from-gray-900/95 via-gray-800/95 to-gray-900/95',
          border: 'border-cyan-500/50',
          glow: 'shadow-cyan-500/30',
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      className={`max-w-md w-full sm:w-auto ${
        isExiting ? 'animate-slide-out-right' : 'animate-slide-in-right'
      }`}
    >
      <div
        className={`relative overflow-hidden flex items-start gap-3 p-4 pr-12 rounded-2xl border-2 shadow-2xl backdrop-blur-xl ${styles.bg} ${styles.border} ${styles.glow}`}
      >
        {/* Animated gradient background */}
        <div className={`absolute inset-0 bg-gradient-to-r ${styles.gradient} opacity-10 animate-gradient`} />

        {/* Success sparkles */}
        {type === 'success' && (
          <>
            <Sparkles className="absolute top-2 right-16 w-4 h-4 text-emerald-400 animate-ping" style={{ animationDuration: '1s' }} />
            <Sparkles className="absolute bottom-2 right-20 w-3 h-3 text-green-400 animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.3s' }} />
          </>
        )}

        {/* Content */}
        <div className="relative z-10 flex items-start gap-3 flex-1">
          <div className="relative">
            {getIcon()}
            {type === 'success' && (
              <div className="absolute -inset-1 bg-emerald-400/30 rounded-full blur-md animate-pulse" />
            )}
          </div>
          <p className="flex-1 text-sm font-bold text-white leading-relaxed pt-0.5">{message}</p>
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-20"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30">
          <div
            className={`h-full bg-gradient-to-r ${styles.gradient} animate-progress`}
            style={{ animationDuration: `${duration}ms` }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(120%) scale(0.8);
            opacity: 0;
          }
          to {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
        }

        @keyframes slide-out-right {
          from {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
          to {
            transform: translateX(120%) scale(0.8);
            opacity: 0;
          }
        }

        @keyframes bounce-in {
          0% {
            transform: scale(0);
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes shake {
          0%, 100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-4px);
          }
          75% {
            transform: translateX(4px);
          }
        }

        @keyframes gradient {
          0%, 100% {
            opacity: 0.1;
          }
          50% {
            opacity: 0.2;
          }
        }

        @keyframes progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }

        .animate-slide-in-right {
          animation: slide-in-right 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .animate-slide-out-right {
          animation: slide-out-right 0.3s ease-in;
        }

        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out;
        }

        .animate-shake {
          animation: shake 0.5s ease-out;
        }

        .animate-gradient {
          animation: gradient 2s ease-in-out infinite;
        }

        .animate-progress {
          animation: progress linear;
        }
      `}</style>
    </div>
  );
}
