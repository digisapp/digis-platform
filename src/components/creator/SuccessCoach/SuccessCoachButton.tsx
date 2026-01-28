'use client';

import { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { SuccessCoachPanel } from './SuccessCoachPanel';

interface SuccessCoachButtonProps {
  creatorId: string;
}

export function SuccessCoachButton({ creatorId }: SuccessCoachButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Check if user has interacted before (to show hint)
  useEffect(() => {
    const interacted = localStorage.getItem('digis_coach_interacted');
    if (interacted) {
      setHasInteracted(true);
    }
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    if (!hasInteracted) {
      localStorage.setItem('digis_coach_interacted', 'true');
      setHasInteracted(true);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-24 right-4 z-50 md:bottom-8">
      {/* Panel - positioned above the button */}
      {isOpen && (
        <div className="absolute bottom-full mb-3 right-0 z-[100]">
          <SuccessCoachPanel creatorId={creatorId} onClose={handleClose} />
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={isOpen ? handleClose : handleOpen}
        className={`relative w-14 h-14 rounded-full backdrop-blur-xl border-2 shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 ${
          isOpen
            ? 'bg-white/10 border-white/30 shadow-white/10'
            : 'bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border-purple-500/40 shadow-purple-500/20 hover:border-purple-400/60 hover:shadow-purple-500/30'
        }`}
      >
        {/* Animated glow ring */}
        {!isOpen && !hasInteracted && (
          <span className="absolute inset-0 rounded-full border-2 border-purple-500/50 animate-ping" />
        )}

        {/* Icon */}
        {isOpen ? (
          <X className="w-6 h-6 text-white mx-auto" />
        ) : (
          <Sparkles className="w-6 h-6 text-purple-400 mx-auto" />
        )}

        {/* Hint tooltip - only show before first interaction */}
        {!hasInteracted && !isOpen && (
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap">
            <div className="px-3 py-2 bg-black/90 backdrop-blur-xl rounded-lg border border-purple-500/30 shadow-lg">
              <p className="text-sm text-white font-medium">Need help? Try AI Coach!</p>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 bg-black/90 border-r border-b border-purple-500/30 rotate-[-45deg]" />
            </div>
          </div>
        )}
      </button>

      {/* Custom animation styles */}
      <style jsx>{`
        @keyframes ping {
          75%, 100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
        .animate-ping {
          animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
}
