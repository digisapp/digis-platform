'use client';

import { Lock, X, Coins } from 'lucide-react';

export interface PrivateTip {
  id: string;
  senderId: string;
  senderUsername: string;
  amount: number;
  note: string;
  timestamp: number;
}

interface PrivateTipsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  tips: PrivateTip[];
}

/**
 * Slide-in panel showing private tip notes from fans.
 * Only visible to the creator during their broadcast.
 */
export function PrivateTipsPanel({ isOpen, onClose, tips }: PrivateTipsPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-[60] w-full max-w-sm">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm -left-full"
        style={{ width: '200vw' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative h-full bg-gradient-to-br from-slate-900/98 via-purple-900/98 to-slate-900/98 backdrop-blur-xl border-l border-cyan-500/30 shadow-[-4px_0_30px_rgba(34,211,238,0.2)] flex flex-col animate-slideInRight">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cyan-500/20">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-white">Private Tip Notes</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Tips List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {tips.length === 0 ? (
            <div className="text-center py-10">
              <Lock className="w-12 h-12 mx-auto text-cyan-400/40 mb-4" />
              <p className="text-white/60 text-sm">
                Private notes from fans will appear here
              </p>
              <p className="text-white/40 text-xs mt-2">
                Only you can see these messages
              </p>
            </div>
          ) : (
            tips.map((tip) => (
              <div
                key={tip.id}
                className="p-3 rounded-xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-purple-400 flex items-center justify-center text-xs font-bold text-white">
                      {tip.senderUsername?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <span className="font-bold text-cyan-300 text-sm">@{tip.senderUsername}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 rounded-full border border-green-500/30">
                    <Coins className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-green-400 text-sm font-bold">{tip.amount}</span>
                  </div>
                </div>
                <p className="text-white/90 text-sm italic pl-10">"{tip.note}"</p>
                <div className="flex items-center justify-end mt-2">
                  <span className="text-white/40 text-xs">
                    {new Date(tip.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Info Footer */}
        <div className="p-4 border-t border-cyan-500/20 bg-black/30">
          <div className="flex items-center gap-2 text-white/50 text-xs">
            <Lock className="w-3.5 h-3.5" />
            <span>Private notes are only visible to you</span>
          </div>
        </div>
      </div>

      {/* CSS for slide animation */}
      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slideInRight {
          animation: slideInRight 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

interface PrivateTipsButtonProps {
  onClick: () => void;
  tipCount: number;
  hasNewTips: boolean;
}

/**
 * Floating button to open the private tips panel.
 */
export function PrivateTipsButton({ onClick, tipCount, hasNewTips }: PrivateTipsButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-24 right-4 z-50 p-3 rounded-full shadow-lg transition-all hover:scale-110 ${
        tipCount > 0
          ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
          : 'bg-white/10 text-white/60 border border-white/20 backdrop-blur-xl'
      }`}
      title="Private Tip Notes"
    >
      <Lock className="w-5 h-5" />
      {hasNewTips && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
      )}
      {tipCount > 0 && (
        <span className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1.5 bg-cyan-500 rounded-full text-xs font-bold flex items-center justify-center">
          {tipCount}
        </span>
      )}
    </button>
  );
}
