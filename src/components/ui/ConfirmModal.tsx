'use client';

import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmModal({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'warning',
}: ConfirmModalProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: 'text-red-500',
          button: 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600',
          border: 'border-red-300/50',
          bg: 'from-red-50 to-pink-50',
        };
      case 'warning':
        return {
          icon: 'text-amber-500',
          button: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600',
          border: 'border-amber-300/50',
          bg: 'from-amber-50 to-orange-50',
        };
      default:
        return {
          icon: 'text-blue-500',
          button: 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600',
          border: 'border-blue-300/50',
          bg: 'from-blue-50 to-cyan-50',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in">
      <div className={`relative max-w-md w-full bg-gradient-to-br ${styles.bg} rounded-2xl shadow-2xl border-2 ${styles.border} p-6 animate-scale-in`}>
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>

        {/* Icon */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-white/50">
            <AlertTriangle className={`w-6 h-6 ${styles.icon}`} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {title}
          </h2>
        </div>

        {/* Message */}
        <p className="text-gray-700 mb-6 text-sm leading-relaxed">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-700 bg-white hover:bg-gray-100 transition-colors border-2 border-gray-300"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`relative flex-1 px-4 py-3 rounded-xl font-bold text-white ${styles.button} transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg`}
          >
            {confirmText}
            <div className={`absolute -inset-0.5 ${styles.button} rounded-xl blur opacity-50 -z-10`} />
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scale-in {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
