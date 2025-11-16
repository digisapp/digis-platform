'use client';

import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />;
      default:
        return <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'border-green-500/50 bg-gradient-to-br from-green-50 to-emerald-50';
      case 'error':
        return 'border-red-500/50 bg-gradient-to-br from-red-50 to-pink-50';
      default:
        return 'border-blue-500/50 bg-gradient-to-br from-blue-50 to-cyan-50';
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 max-w-md w-full sm:w-auto z-[9999] animate-slide-in-right`}
    >
      <div
        className={`flex items-start gap-3 p-4 rounded-xl border-2 shadow-2xl backdrop-blur-md ${getStyles()}`}
      >
        {getIcon()}
        <p className="flex-1 text-sm font-medium text-gray-800">{message}</p>
        <button
          onClick={onClose}
          className="flex-shrink-0 w-6 h-6 rounded-full hover:bg-black/10 flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
