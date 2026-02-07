'use client';

import { Ticket, Calendar, RotateCcw, X } from 'lucide-react';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface VipShowChoiceModalProps {
  announcedTicketedStream: {
    id: string;
    title: string;
    ticketPrice: number;
    startsAt: Date;
  };
  vipTicketCount: number;
  isEnding: boolean;
  onKeepVip: () => void;
  onCancelVip: () => void;
  onClose: () => void;
}

export function VipShowChoiceModal({
  announcedTicketedStream,
  vipTicketCount,
  isEnding,
  onKeepVip,
  onCancelVip,
  onClose,
}: VipShowChoiceModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative backdrop-blur-xl bg-black/90 rounded-3xl border border-white/20 shadow-2xl p-6 max-w-md w-full">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
            <Ticket className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            You Have a Pending VIP Show
          </h3>
          <p className="text-gray-300 text-sm">
            &ldquo;{announcedTicketedStream.title}&rdquo; is scheduled but hasn&apos;t started yet.
            {vipTicketCount > 0 && (
              <span className="block mt-2 text-amber-400 font-medium">
                {vipTicketCount} {vipTicketCount === 1 ? 'person has' : 'people have'} already purchased tickets!
              </span>
            )}
          </p>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {/* Keep Scheduled Option */}
          <button
            onClick={onKeepVip}
            disabled={isEnding}
            className="w-full p-4 rounded-xl bg-gradient-to-r from-emerald-600/20 to-green-600/20 border border-emerald-500/50 hover:border-emerald-400 hover:bg-emerald-600/30 transition-all text-left group"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20 group-hover:bg-emerald-500/30 transition-colors">
                <Calendar className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-white mb-1">Keep Scheduled</h4>
                <p className="text-xs text-gray-400">
                  End your stream but keep the VIP show scheduled. You can start it in a future stream.
                </p>
              </div>
            </div>
          </button>

          {/* Cancel & Refund Option */}
          <button
            onClick={onCancelVip}
            disabled={isEnding}
            className="w-full p-4 rounded-xl bg-gradient-to-r from-red-600/20 to-pink-600/20 border border-red-500/50 hover:border-red-400 hover:bg-red-600/30 transition-all text-left group"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-red-500/20 group-hover:bg-red-500/30 transition-colors">
                <RotateCcw className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-white mb-1">Cancel & Refund</h4>
                <p className="text-xs text-gray-400">
                  Cancel the VIP show and automatically refund all ticket purchases.
                  {vipTicketCount > 0 && ` (${vipTicketCount} refund${vipTicketCount === 1 ? '' : 's'})`}
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Loading State */}
        {isEnding && (
          <div className="mt-4 flex items-center justify-center gap-2 text-gray-400">
            <LoadingSpinner size="sm" />
            <span className="text-sm">Processing...</span>
          </div>
        )}

        {/* Cancel Button */}
        <div className="mt-4">
          <GlassButton
            variant="ghost"
            size="md"
            onClick={onClose}
            disabled={isEnding}
            className="w-full !text-gray-400 !border-gray-600 hover:!text-white"
          >
            Go Back to Stream
          </GlassButton>
        </div>
      </div>
    </div>
  );
}
