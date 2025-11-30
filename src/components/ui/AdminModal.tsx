'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, Trash2, UserPlus, Shield } from 'lucide-react';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (inputValue?: string) => void;
  title: string;
  message: string;
  type?: 'confirm' | 'prompt' | 'danger' | 'success';
  confirmText?: string;
  cancelText?: string;
  placeholder?: string;
  requireInput?: string; // If set, user must type this exact string to confirm
  icon?: 'delete' | 'promote' | 'shield' | 'warning' | 'success';
}

export function AdminModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'confirm',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  placeholder = '',
  requireInput,
  icon = 'warning',
}: AdminModalProps) {
  const [inputValue, setInputValue] = useState('');
  const [isConfirmEnabled, setIsConfirmEnabled] = useState(!requireInput);

  useEffect(() => {
    if (requireInput) {
      setIsConfirmEnabled(inputValue === requireInput);
    }
  }, [inputValue, requireInput]);

  useEffect(() => {
    if (isOpen) {
      setInputValue('');
      setIsConfirmEnabled(!requireInput);
    }
  }, [isOpen, requireInput]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (type === 'prompt' || requireInput) {
      onConfirm(inputValue);
    } else {
      onConfirm();
    }
  };

  const getIcon = () => {
    switch (icon) {
      case 'delete':
        return <Trash2 className="w-8 h-8 text-red-500" />;
      case 'promote':
        return <UserPlus className="w-8 h-8 text-cyan-400" />;
      case 'shield':
        return <Shield className="w-8 h-8 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      default:
        return <AlertTriangle className="w-8 h-8 text-yellow-500" />;
    }
  };

  const getGradient = () => {
    switch (type) {
      case 'danger':
        return 'from-red-500 to-pink-500';
      case 'success':
        return 'from-green-500 to-emerald-500';
      default:
        return 'from-cyan-500 to-pink-500';
    }
  };

  const getConfirmButtonStyle = () => {
    if (!isConfirmEnabled) {
      return 'bg-gray-600 cursor-not-allowed opacity-50';
    }
    switch (type) {
      case 'danger':
        return 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 shadow-[0_0_20px_rgba(239,68,68,0.4)]';
      case 'success':
        return 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-[0_0_20px_rgba(34,197,94,0.4)]';
      default:
        return 'bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-600 hover:to-pink-600 shadow-[0_0_20px_rgba(6,182,212,0.4)]';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        {/* Glow effect */}
        <div className={`absolute -inset-0.5 bg-gradient-to-r ${getGradient()} rounded-2xl blur opacity-30`} />

        <div className="relative bg-gray-900/95 border border-white/10 rounded-2xl p-6 shadow-2xl">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className={`p-4 rounded-full bg-gradient-to-br ${getGradient()} bg-opacity-20 border border-white/10`}>
              {getIcon()}
            </div>
          </div>

          {/* Title */}
          <h3 className={`text-xl font-bold text-center mb-2 bg-gradient-to-r ${getGradient()} bg-clip-text text-transparent`}>
            {title}
          </h3>

          {/* Message */}
          <p className="text-gray-300 text-center mb-6 whitespace-pre-line">
            {message}
          </p>

          {/* Input field for prompt type or requireInput */}
          {(type === 'prompt' || requireInput) && (
            <div className="mb-6">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={placeholder || (requireInput ? `Type "${requireInput}" to confirm` : '')}
                className="w-full px-4 py-3 bg-black/50 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:shadow-[0_0_10px_rgba(6,182,212,0.3)] transition-all"
                autoFocus
              />
              {requireInput && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Type <span className="text-red-400 font-mono">{requireInput}</span> to confirm
                </p>
              )}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-all"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isConfirmEnabled}
              className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${getConfirmButtonStyle()}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Alert/Toast notification for success messages
interface AdminToastProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
}

export function AdminToast({
  isOpen,
  onClose,
  message,
  type = 'success',
  duration = 3000,
}: AdminToastProps) {
  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const getStyle = () => {
    switch (type) {
      case 'error':
        return {
          gradient: 'from-red-500 to-pink-500',
          icon: <X className="w-5 h-5 text-red-400" />,
          glow: 'rgba(239,68,68,0.3)',
        };
      case 'info':
        return {
          gradient: 'from-cyan-500 to-blue-500',
          icon: <AlertTriangle className="w-5 h-5 text-cyan-400" />,
          glow: 'rgba(6,182,212,0.3)',
        };
      default:
        return {
          gradient: 'from-green-500 to-emerald-500',
          icon: <CheckCircle className="w-5 h-5 text-green-400" />,
          glow: 'rgba(34,197,94,0.3)',
        };
    }
  };

  const style = getStyle();

  return (
    <div className="fixed top-4 right-4 z-[100] animate-in slide-in-from-top-2 fade-in duration-300">
      <div className="relative">
        {/* Glow */}
        <div
          className={`absolute -inset-0.5 bg-gradient-to-r ${style.gradient} rounded-xl blur opacity-40`}
        />

        <div
          className="relative flex items-center gap-3 px-4 py-3 bg-gray-900/95 border border-white/10 rounded-xl shadow-xl"
          style={{ boxShadow: `0 0 20px ${style.glow}` }}
        >
          {style.icon}
          <p className="text-white font-medium">{message}</p>
          <button
            onClick={onClose}
            className="ml-2 p-1 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
