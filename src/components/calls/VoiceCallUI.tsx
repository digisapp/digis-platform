'use client';

import { useState } from 'react';
import { useLocalParticipant, useRemoteParticipants, useConnectionState } from '@livekit/components-react';
import { ConnectionState } from 'livekit-client';
import { Phone, Loader2, Mic, MicOff, Volume2, X, Coins, Gift } from 'lucide-react';
import type { CallData, VirtualGift } from './types';

interface VoiceCallUIProps {
  callData: CallData;
  duration: number;
  estimatedCost: number;
  isEnding: boolean;
  onEndCall: () => void;
  isFan: boolean;
  userBalance: number;
  onSendTip: (amount: number) => void;
  onSendGift: (gift: VirtualGift) => void;
  gifts: VirtualGift[];
  tipSending: boolean;
  onBuyCoins: () => void;
}

export function VoiceCallUI({
  callData,
  duration,
  estimatedCost,
  isEnding,
  onEndCall,
  isFan,
  userBalance,
  onSendTip,
  onSendGift,
  gifts,
  tipSending,
  onBuyCoins,
}: VoiceCallUIProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [showTipMenu, setShowTipMenu] = useState(false);
  const [showGifts, setShowGifts] = useState(false);
  const [sentNotification, setSentNotification] = useState<{ type: 'tip' | 'gift'; amount?: number; emoji?: string } | null>(null);
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const connectionState = useConnectionState();

  const isConnected = connectionState === ConnectionState.Connected;
  const hasRemoteParticipant = remoteParticipants.length > 0;
  const isLowBalance = userBalance < 50;

  // Show notification when tip/gift is sent
  const handleSendTip = (amount: number) => {
    onSendTip(amount);
    setSentNotification({ type: 'tip', amount });
    setTimeout(() => setSentNotification(null), 3000);
  };

  const handleSendGift = (gift: VirtualGift) => {
    onSendGift(gift);
    setSentNotification({ type: 'gift', emoji: gift.emoji, amount: gift.coinCost });
    setTimeout(() => setSentNotification(null), 3000);
  };

  const toggleMute = async () => {
    if (localParticipant) {
      await localParticipant.setMicrophoneEnabled(isMuted);
      setIsMuted(!isMuted);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const otherParticipant = callData.creator;
  const tipAmounts = [10, 25, 50, 100, 250, 500];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex flex-col items-center justify-center p-8 relative">
      {/* Avatar and Status */}
      <div className="text-center mb-8">
        <div className="relative mb-6">
          {isConnected && hasRemoteParticipant && (
            <div className="absolute -inset-4 rounded-full border-4 border-cyan-500/50 animate-pulse" />
          )}
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto shadow-[0_0_60px_rgba(99,102,241,0.5)]">
            {otherParticipant.avatarUrl ? (
              <img
                src={otherParticipant.avatarUrl}
                alt={otherParticipant.displayName || otherParticipant.username}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <Phone className="w-16 h-16 text-white" />
            )}
          </div>

          {isConnected && hasRemoteParticipant && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              <div className="w-1 h-4 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1 h-6 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1 h-4 bg-cyan-400 rounded-full animate-bounce" />
              <div className="w-1 h-5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.1s]" />
              <div className="w-1 h-3 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.2s]" />
            </div>
          )}
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">
          {otherParticipant.displayName || otherParticipant.username}
        </h2>

        <p className="text-gray-400 mb-4">
          {!isConnected && 'Connecting...'}
          {isConnected && !hasRemoteParticipant && 'Waiting for participant...'}
          {isConnected && hasRemoteParticipant && 'Voice Call Connected'}
        </p>

        <div className="flex items-center justify-center gap-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full border border-white/20">
            <Volume2 className="w-4 h-4 text-cyan-400" />
            <span className="text-white font-mono text-lg">{formatDuration(duration)}</span>
          </div>
          <div className="text-sm text-gray-400">
            ~{estimatedCost} coins
          </div>
        </div>
      </div>

      {/* Coin Balance & Buy Coins - for fans */}
      {isFan && (
        <div className="mb-6">
          <div className={`flex items-center gap-3 px-4 py-2.5 bg-black/50 backdrop-blur-xl rounded-2xl border ${isLowBalance ? 'border-red-500/50' : 'border-emerald-500/40'}`}>
            <div className="flex items-center gap-2">
              <Coins className={`w-5 h-5 ${isLowBalance ? 'text-red-400' : 'text-emerald-400'}`} />
              <span className={`text-lg font-bold ${isLowBalance ? 'text-red-400' : 'text-emerald-400'}`}>
                {userBalance.toLocaleString()}
              </span>
            </div>
            <div className="w-px h-6 bg-white/20" />
            <button
              onClick={onBuyCoins}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 rounded-xl text-white font-bold text-sm transition-all active:scale-95"
            >
              <span>+</span>
              <span>Buy Coins</span>
            </button>
          </div>
        </div>
      )}

      {/* Tip Menu Popup */}
      {showTipMenu && isFan && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-in zoom-in-95 duration-200">
          <div className="bg-black/90 backdrop-blur-xl rounded-2xl p-4 border border-yellow-500/30 shadow-xl min-w-[280px]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white font-semibold">Send a Tip</span>
              <button onClick={() => setShowTipMenu(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {tipAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => {
                    handleSendTip(amount);
                    setShowTipMenu(false);
                  }}
                  disabled={userBalance < amount || tipSending}
                  className="px-3 py-2 rounded-xl bg-gradient-to-r from-yellow-500/20 to-amber-500/20 hover:from-yellow-500/30 hover:to-amber-500/30 border border-yellow-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                  <span className="text-yellow-400 font-bold">{amount}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Gift Picker Popup */}
      {showGifts && isFan && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-in zoom-in-95 duration-200">
          <div className="bg-black/90 backdrop-blur-xl rounded-2xl p-4 border border-pink-500/30 shadow-xl min-w-[280px]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white font-semibold">Send Tip</span>
              <button onClick={() => setShowGifts(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto">
              <div className="grid grid-cols-3 gap-2">
                {gifts.map((gift) => (
                  <button
                    key={gift.id}
                    onClick={() => {
                      handleSendGift(gift);
                      setShowGifts(false);
                    }}
                    disabled={userBalance < gift.coinCost || tipSending}
                    className="flex flex-col items-center p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                  >
                    <span className="text-2xl mb-1">{gift.emoji}</span>
                    <span className="text-emerald-400 text-xs font-bold">{gift.coinCost}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
            isMuted
              ? 'bg-red-500 text-white shadow-red-500/30'
              : 'bg-white/20 text-white hover:bg-white/30 border border-white/20'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        {/* Tip button - for fans */}
        {isFan && (
          <button
            onClick={() => { setShowTipMenu(!showTipMenu); setShowGifts(false); }}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
              showTipMenu
                ? 'bg-yellow-500 text-white'
                : 'bg-white/20 text-white hover:bg-white/30 border border-white/20'
            }`}
            title="Send Tip"
          >
            <Coins className="w-6 h-6" />
          </button>
        )}

        <button
          onClick={onEndCall}
          disabled={isEnding}
          className="px-8 py-4 rounded-full bg-red-500 hover:bg-red-600 text-white font-bold text-base transition-all disabled:opacity-50 shadow-lg shadow-red-500/30"
          title="End Call"
        >
          {isEnding ? <Loader2 className="w-5 h-5 animate-spin" /> : 'End'}
        </button>

        {/* Gift button - for fans */}
        {isFan && (
          <button
            onClick={() => { setShowGifts(!showGifts); setShowTipMenu(false); }}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
              showGifts
                ? 'bg-pink-500 text-white'
                : 'bg-white/20 text-white hover:bg-white/30 border border-white/20'
            }`}
            title="Send Tip"
          >
            <Gift className="w-6 h-6" />
          </button>
        )}
      </div>

      {isMuted && (
        <p className="mt-4 text-red-400 text-sm flex items-center gap-2">
          <MicOff className="w-4 h-4" />
          You are muted
        </p>
      )}

      {/* Sent notification toast */}
      {sentNotification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-5 fade-in duration-300">
          <div className={`px-6 py-3 rounded-2xl shadow-xl border backdrop-blur-xl ${
            sentNotification.type === 'tip'
              ? 'bg-yellow-500/20 border-yellow-500/40'
              : 'bg-pink-500/20 border-pink-500/40'
          }`}>
            <div className="flex items-center gap-2">
              {sentNotification.type === 'tip' ? (
                <>
                  <Coins className="w-5 h-5 text-yellow-400" />
                  <span className="text-white font-semibold">
                    Sent {sentNotification.amount} coins gift!
                  </span>
                </>
              ) : (
                <>
                  <span className="text-2xl">{sentNotification.emoji}</span>
                  <span className="text-white font-semibold">
                    Gift sent!
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
