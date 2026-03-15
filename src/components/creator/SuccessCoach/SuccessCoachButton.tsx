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

  useEffect(() => {
    const interacted = localStorage.getItem('digis_coach_interacted');
    if (interacted) setHasInteracted(true);
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    if (!hasInteracted) {
      localStorage.setItem('digis_coach_interacted', 'true');
      setHasInteracted(true);
    }
  };

  const handleClose = () => setIsOpen(false);

  return (
    <>
      {/* Full-screen overlay panel on mobile, floating on desktop */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] md:hidden"
            onClick={handleClose}
          />
          <div className="fixed inset-0 z-[100] md:absolute md:inset-auto md:bottom-full md:right-0 md:mb-3">
            <SuccessCoachPanel creatorId={creatorId} onClose={handleClose} />
          </div>
        </>
      )}

      {/* Floating button */}
      <div className="fixed bottom-24 right-4 z-50 md:bottom-8">
        <button
          onClick={isOpen ? handleClose : handleOpen}
          className={`relative w-14 h-14 rounded-full shadow-lg transition-all duration-300 active:scale-95 ${
            isOpen
              ? 'bg-white/10 backdrop-blur-xl border-2 border-white/30 shadow-white/10'
              : 'bg-gradient-to-br from-purple-600 to-cyan-500 border-2 border-purple-400/50 shadow-[0_0_25px_rgba(147,51,234,0.4)] hover:shadow-[0_0_35px_rgba(147,51,234,0.6)] hover:scale-110'
          }`}
        >
          {/* Animated ring */}
          {!isOpen && !hasInteracted && (
            <span className="absolute inset-0 rounded-full border-2 border-purple-400/60 animate-ping" />
          )}

          {isOpen ? (
            <X className="w-6 h-6 text-white mx-auto" />
          ) : (
            <Sparkles className="w-6 h-6 text-white mx-auto" />
          )}

          {/* Hint tooltip */}
          {!hasInteracted && !isOpen && (
            <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap">
              <div className="px-3 py-2 bg-black/90 backdrop-blur-xl rounded-xl border border-purple-500/30 shadow-lg">
                <p className="text-sm text-white font-medium">Need help? Try AI Coach!</p>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 bg-black/90 border-r border-b border-purple-500/30 rotate-[-45deg]" />
              </div>
            </div>
          )}
        </button>
      </div>
    </>
  );
}
