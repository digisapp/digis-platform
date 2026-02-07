'use client';

import { Loader2, PhoneOff, X, Clock, Coins, Zap, Gift, Phone } from 'lucide-react';
import type { CallData } from './types';

// --- Connection Error Modal ---
export function ConnectionErrorModal({
  otherPartyError,
  onKeepWaiting,
  onEndCall,
}: {
  otherPartyError: string;
  onKeepWaiting: () => void;
  onEndCall: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative backdrop-blur-2xl bg-gradient-to-br from-black/60 via-gray-900/80 to-black/60 rounded-3xl p-8 max-w-sm w-full border-2 border-orange-500/40 shadow-[0_0_60px_rgba(249,115,22,0.3)] animate-in zoom-in-95 duration-200">
        <div className="relative text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-orange-500/20 rounded-2xl flex items-center justify-center border border-orange-500/40">
            <X className="w-10 h-10 text-orange-400" />
          </div>

          <h3 className="text-2xl font-bold text-white mb-3">Connection Problem</h3>
          <p className="text-gray-400 mb-2">The other participant couldn&apos;t connect to the call.</p>
          <p className="text-sm text-orange-300 mb-6 bg-orange-500/10 rounded-lg p-3 border border-orange-500/20">
            {otherPartyError}
          </p>

          <div className="flex gap-3">
            <button
              onClick={onKeepWaiting}
              className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all border border-white/20"
            >
              Keep Waiting
            </button>
            <button
              onClick={onEndCall}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold transition-all shadow-lg"
            >
              End Call
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Call Ended Modal ---
export function CallEndedModal({
  hasStarted,
  duration,
  estimatedCost,
  formatDuration,
}: {
  hasStarted: boolean;
  duration: number;
  estimatedCost: number;
  formatDuration: (seconds: number) => string;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative backdrop-blur-2xl bg-gradient-to-br from-black/60 via-gray-900/80 to-black/60 rounded-3xl p-8 max-w-sm w-full border-2 border-cyan-500/40 shadow-[0_0_60px_rgba(34,211,238,0.3)] animate-in zoom-in-95 duration-200">
        <div className="relative text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-cyan-500/20 rounded-2xl flex items-center justify-center border border-cyan-500/40">
            <PhoneOff className="w-10 h-10 text-cyan-400" />
          </div>

          <h3 className="text-2xl font-bold text-white mb-3">Call Ended</h3>
          <p className="text-gray-400 mb-4">The other participant has ended the call.</p>

          {hasStarted && (
            <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Duration</span>
                <span className="font-mono font-bold text-cyan-400">{formatDuration(duration)}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-400">Estimated Cost</span>
                <span className="font-bold text-emerald-400">{estimatedCost} coins</span>
              </div>
            </div>
          )}

          <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400 mx-auto mt-3" />
        </div>
      </div>
    </div>
  );
}

// --- End Call Confirm Modal ---
export function EndCallConfirmModal({
  hasStarted,
  duration,
  estimatedCost,
  isEnding,
  formatDuration,
  onCancel,
  onConfirm,
}: {
  hasStarted: boolean;
  duration: number;
  estimatedCost: number;
  isEnding: boolean;
  formatDuration: (seconds: number) => string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative backdrop-blur-2xl bg-gradient-to-br from-black/60 via-gray-900/80 to-black/60 rounded-3xl p-8 max-w-sm w-full border-2 border-red-500/40 shadow-[0_0_60px_rgba(239,68,68,0.3)] animate-in zoom-in-95 duration-200">
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/10 to-red-500/0 animate-pulse" />
        </div>

        <div className="relative text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-red-500/20 rounded-2xl flex items-center justify-center border border-red-500/40">
            <PhoneOff className="w-10 h-10 text-red-400" />
          </div>

          <h3 className="text-2xl font-bold text-white mb-3">End Call?</h3>
          <p className="text-gray-400 mb-2">This will disconnect your video call.</p>

          {hasStarted && (
            <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Duration</span>
                <span className="font-mono font-bold text-cyan-400">{formatDuration(duration)}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-400">Estimated Cost</span>
                <span className="font-bold text-emerald-400">{estimatedCost} coins</span>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all border border-white/20"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isEnding}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-red-500/30 disabled:opacity-50"
            >
              {isEnding ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                'End Call'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Creator Summary Modal ---
export function CreatorSummaryModal({
  callData,
  finalCallDuration,
  finalCallEarnings,
  finalTipEarnings,
  formatDuration,
  onBackToDashboard,
}: {
  callData: CallData;
  finalCallDuration: number;
  finalCallEarnings: number;
  finalTipEarnings: number;
  formatDuration: (seconds: number) => string;
  onBackToDashboard: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative backdrop-blur-2xl bg-gradient-to-br from-black/60 via-gray-900/80 to-black/60 rounded-3xl p-8 max-w-sm w-full border-2 border-emerald-500/40 shadow-[0_0_60px_rgba(16,185,129,0.3)] animate-in zoom-in-95 duration-200">
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0 animate-pulse" />
        </div>

        <div className="relative text-center">
          {/* Success icon */}
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-emerald-500/30 to-green-500/30 rounded-2xl flex items-center justify-center border border-emerald-500/40">
            <Zap className="w-10 h-10 text-emerald-400" />
          </div>

          <h3 className="text-2xl font-bold text-white mb-2">Call Complete!</h3>
          <p className="text-gray-400 mb-6">Here&apos;s your earnings summary</p>

          {/* Stats breakdown */}
          <div className="space-y-3 mb-6">
            {/* Duration */}
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span className="text-gray-400 text-sm">Call Duration</span>
              </div>
              <span className="font-mono font-bold text-cyan-400">{formatDuration(finalCallDuration)}</span>
            </div>

            {/* Call earnings */}
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400" />
                <span className="text-gray-400 text-sm">Call Earnings</span>
              </div>
              <span className="font-bold text-emerald-400">+{finalCallEarnings} coins</span>
            </div>

            {/* Gifts */}
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-pink-400" />
                <span className="text-gray-400 text-sm">Gifts</span>
              </div>
              <span className="font-bold text-pink-400">+{finalTipEarnings} coins</span>
            </div>

            {/* Divider */}
            <div className="border-t border-white/10 my-2" />

            {/* Total earnings */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-xl border border-emerald-500/30">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-400" />
                <span className="text-white font-semibold">Total Earned</span>
              </div>
              <span className="text-2xl font-bold text-emerald-400">+{finalCallEarnings + finalTipEarnings}</span>
            </div>
          </div>

          {/* Fan info */}
          {callData?.fan && (
            <div className="mb-6 p-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                {callData.fan.avatarUrl ? (
                  <img
                    src={callData.fan.avatarUrl}
                    alt={callData.fan.displayName || callData.fan.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white text-sm font-bold">
                    {(callData.fan.displayName || callData.fan.username)?.[0]?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <div className="text-left">
                <p className="text-white font-medium text-sm">
                  {callData.fan.displayName || callData.fan.username}
                </p>
                <p className="text-gray-400 text-xs">Fan</p>
              </div>
            </div>
          )}

          <button
            onClick={onBackToDashboard}
            className="w-full px-8 py-4 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white rounded-xl font-semibold transition-all shadow-lg shadow-emerald-500/30"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
