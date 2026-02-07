'use client';

import { GlassButton } from '@/components/ui/GlassButton';

interface StreamEndConfirmationModalProps {
  isLeaveAttempt: boolean;
  isEnding: boolean;
  onEndStream: () => void;
  onCancel: () => void;
}

export function StreamEndConfirmationModal({
  isLeaveAttempt,
  isEnding,
  onEndStream,
  onCancel,
}: StreamEndConfirmationModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative backdrop-blur-xl bg-black/80 rounded-3xl border border-white/20 shadow-2xl p-6 max-w-sm w-full">
        {/* Warning Icon */}
        <div className="flex justify-center mb-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isLeaveAttempt ? 'bg-yellow-500/20' : 'bg-red-500/20'}`}>
            {isLeaveAttempt ? (
              <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            )}
          </div>
        </div>

        {/* Title and Description */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-white mb-2">
            {isLeaveAttempt ? 'Wait! You\'re Still Live' : 'End Your Stream?'}
          </h3>
          <p className="text-gray-300 text-sm">
            {isLeaveAttempt
              ? 'If you leave now, your stream will end and your viewers will be disconnected.'
              : 'Are you sure you want to end your stream? This will disconnect all viewers.'}
          </p>
        </div>

        <div className="space-y-3">
          {isLeaveAttempt && (
            <GlassButton
              variant="gradient"
              size="lg"
              onClick={onCancel}
              shimmer
              glow
              className="w-full text-white font-semibold"
            >
              Stay on Stream
            </GlassButton>
          )}
          <GlassButton
            variant={isLeaveAttempt ? 'ghost' : 'gradient'}
            size="lg"
            onClick={onEndStream}
            disabled={isEnding}
            shimmer={!isLeaveAttempt}
            glow={!isLeaveAttempt}
            className={`w-full font-semibold ${isLeaveAttempt ? '!text-red-400 !bg-red-500/10 !border-red-500/50 hover:!bg-red-500/20' : 'text-white bg-gradient-to-r from-red-600 to-pink-600'}`}
          >
            {isEnding ? 'Ending...' : (isLeaveAttempt ? 'End Stream Anyway' : 'End Stream')}
          </GlassButton>
          {!isLeaveAttempt && (
            <GlassButton
              variant="ghost"
              size="lg"
              onClick={onCancel}
              className="w-full font-semibold !text-white !bg-white/10 !border-white/40 hover:!bg-white/20"
            >
              Cancel
            </GlassButton>
          )}
        </div>
      </div>
    </div>
  );
}
