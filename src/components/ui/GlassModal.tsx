'use client';

import { ReactNode, useEffect } from 'react';

interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  transparentBackdrop?: boolean; // For streaming - keeps background visible
}

export function GlassModal({ isOpen, onClose, title, children, size = 'md', transparentBackdrop = false }: GlassModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll and fix position to prevent jump on mobile
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    } else {
      // Restore scroll position
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-[calc(80px+env(safe-area-inset-bottom,0px))] sm:pb-4 overflow-y-auto">
      {/* Backdrop - covers ENTIRE screen including sidebar */}
      <div
        className={`absolute top-0 left-0 right-0 bottom-0 ${
          transparentBackdrop
            ? 'bg-black/30 backdrop-blur-sm'
            : 'bg-black/70 backdrop-blur-md'
        }`}
        onClick={onClose}
      />

      {/* Modal - Futuristic Glass Dark Theme */}
      <div className={`relative backdrop-blur-2xl bg-gradient-to-br from-black/80 via-gray-900/90 to-black/80 rounded-3xl w-full ${sizeClasses[size]} max-h-[calc(100dvh-160px)] sm:max-h-[90vh] flex flex-col border-2 border-cyan-500/30 shadow-[0_0_50px_rgba(34,211,238,0.3)] animate-fadeIn mx-auto`}>
        {/* Header */}
        {title && (
          <div className="px-6 py-4 border-b border-cyan-500/20 flex items-center justify-between relative flex-shrink-0">
            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Content - scrollable if needed */}
        <div className="p-4 sm:p-6 relative overflow-y-auto flex-1">
          {children}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
