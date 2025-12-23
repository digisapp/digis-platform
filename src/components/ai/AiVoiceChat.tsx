'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GlassButton, GlassCard, LoadingSpinner } from '@/components/ui';
import { Mic, MicOff, PhoneOff, Bot, Volume2, Sparkles, Coins, AlertTriangle } from 'lucide-react';
import { useToastContext } from '@/context/ToastContext';
import { useAiVoiceChat, ConnectionState, SpeakingState } from './useAiVoiceChat';

interface AiVoiceChatProps {
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  onEnd?: () => void;
}

export function AiVoiceChat({ creatorId, creatorName, creatorAvatar, onEnd }: AiVoiceChatProps) {
  const router = useRouter();
  const { showError, showSuccess, showInfo } = useToastContext();
  const [startTime, setStartTime] = useState<number | null>(null);
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [ending, setEnding] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [lowBalanceWarning, setLowBalanceWarning] = useState(false);
  const [balanceDepleted, setBalanceDepleted] = useState(false);
  const hasInitiatedRef = useRef(false);
  const lowBalanceShownRef = useRef(false);

  const {
    connectionState,
    speakingState,
    isMuted,
    error,
    connect,
    disconnect,
    toggleMute,
    remainingBalance,
    minutesRemaining,
    totalCharged,
  } = useAiVoiceChat({
    onTranscript: (text, isFinal) => {
      if (isFinal) {
        setTranscript(text);
      }
    },
    onAiResponse: (text) => {
      setAiResponse((prev) => prev + text);
    },
    onError: (err) => {
      showError(err);
    },
    onLowBalance: (mins) => {
      if (!lowBalanceShownRef.current) {
        lowBalanceShownRef.current = true;
        setLowBalanceWarning(true);
        showInfo(`Low balance! Only ${mins} minute${mins !== 1 ? 's' : ''} remaining.`);
      }
    },
    onBalanceDepleted: () => {
      setBalanceDepleted(true);
      showError('Your balance has run out. The chat will end.');
      // Auto-end chat after a brief moment
      setTimeout(() => {
        handleEndChat();
      }, 2000);
    },
  });

  // Start connection on mount
  useEffect(() => {
    // Guard against double-calls within same mount cycle
    if (hasInitiatedRef.current) return;
    hasInitiatedRef.current = true;
    connect(creatorId);

    // Reset on cleanup so reconnection can happen after StrictMode unmount
    return () => {
      hasInitiatedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creatorId]);

  // Track duration
  useEffect(() => {
    if (connectionState === 'connected' && !startTime) {
      setStartTime(Date.now());
    }
  }, [connectionState, startTime]);

  useEffect(() => {
    // Stop timer if chat ended (showSummary) or no start time
    if (!startTime || showSummary) return;

    const interval = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, showSummary]);

  // Clear AI response when user starts speaking
  useEffect(() => {
    if (speakingState === 'listening') {
      setAiResponse('');
    }
  }, [speakingState]);

  const handleEndChat = useCallback(async () => {
    setEnding(true);
    // End the call immediately
    try {
      await disconnect();
    } catch (err) {
      console.error('Error disconnecting:', err);
    }
    // Show summary
    setShowSummary(true);
    setEnding(false);
  }, [disconnect]);

  const handleCloseSummary = useCallback(() => {
    if (onEnd) {
      onEnd();
    } else {
      router.push('/');
    }
  }, [onEnd, router]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (connectionState) {
      case 'connecting':
        return 'Connecting to AI Twin...';
      case 'error':
        return error || 'Connection error';
      case 'disconnected':
        return 'Disconnected';
      case 'connected':
        switch (speakingState) {
          case 'listening':
            return 'Listening...';
          case 'thinking':
            return 'Thinking...';
          case 'speaking':
            return 'Speaking...';
          default:
            return 'Ready';
        }
    }
  };

  const getStatusColor = () => {
    if (connectionState === 'error') return 'text-red-400';
    if (speakingState === 'speaking') return 'text-cyan-400';
    if (speakingState === 'thinking') return 'text-yellow-400';
    return 'text-gray-400';
  };

  // Call summary
  if (showSummary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-8">
        <GlassCard glow="cyan" padding="lg" className="max-w-md w-full">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500/20 to-cyan-500/20 border-2 border-green-500/30 flex items-center justify-center">
              <Bot className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-6">Chat Ended</h2>

            {/* Summary stats */}
            <div className="bg-white/5 rounded-xl p-4 mb-6 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Duration</span>
                <span className="text-white font-mono">{formatDuration(duration)}</span>
              </div>
              {totalCharged > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Coins Used</span>
                  <span className="text-cyan-400 font-mono flex items-center gap-1">
                    <Coins className="w-4 h-4" />
                    {totalCharged.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <GlassButton variant="cyan" onClick={handleCloseSummary} className="w-full">
              Done
            </GlassButton>
          </div>
        </GlassCard>
      </div>
    );
  }

  // Loading state
  if (connectionState === 'connecting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <GlassCard glow="cyan" padding="lg">
          <div className="text-center">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto animate-pulse">
                <Bot className="w-12 h-12 text-white" />
              </div>
              <div className="absolute -inset-2 rounded-full border-2 border-cyan-500/30 animate-ping" />
            </div>
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-white">Connecting to {creatorName}&apos;s AI Twin...</p>
          </div>
        </GlassCard>
      </div>
    );
  }

  // Error state
  if (connectionState === 'error') {
    // Determine if the error is retriable
    const isBalanceError = error?.toLowerCase().includes('coins') || error?.toLowerCase().includes('balance');
    const isAuthError = error?.toLowerCase().includes('sign in') || error?.toLowerCase().includes('authentication');
    const isSetupError = error?.toLowerCase().includes('not set up') || error?.toLowerCase().includes('disabled');
    const isMicError = error?.toLowerCase().includes('microphone');

    // Get helpful suggestion based on error type
    const getSuggestion = () => {
      if (isBalanceError) {
        return 'You can add more coins from your profile page.';
      }
      if (isAuthError) {
        return 'Please sign in and try again.';
      }
      if (isSetupError) {
        return 'The creator needs to configure their AI Twin before you can chat.';
      }
      if (isMicError) {
        return 'Check that your microphone is connected and browser has permission to use it.';
      }
      return 'Please check your internet connection and try again.';
    };

    const canRetry = !isBalanceError && !isAuthError && !isSetupError;

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <GlassCard glow="pink" padding="lg" className="max-w-md w-full">
          <div className="text-center">
            {/* Error icon with appropriate color */}
            <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${
              isBalanceError ? 'bg-yellow-500/20 border-2 border-yellow-500/30' :
              isSetupError ? 'bg-blue-500/20 border-2 border-blue-500/30' :
              'bg-red-500/20 border-2 border-red-500/30'
            }`}>
              {isBalanceError ? (
                <Coins className="w-10 h-10 text-yellow-400" />
              ) : isMicError ? (
                <MicOff className="w-10 h-10 text-red-400" />
              ) : (
                <AlertTriangle className="w-10 h-10 text-red-400" />
              )}
            </div>

            <h2 className="text-2xl font-bold text-white mb-3">
              {isBalanceError ? 'Insufficient Balance' :
               isAuthError ? 'Sign In Required' :
               isSetupError ? 'AI Twin Not Available' :
               'Connection Failed'}
            </h2>

            <p className="text-gray-300 mb-4">{error}</p>

            {/* Helpful suggestion */}
            <p className="text-gray-500 text-sm mb-6 px-4">
              {getSuggestion()}
            </p>

            <div className="flex gap-4 justify-center">
              <GlassButton variant="ghost" onClick={() => router.back()}>
                Go Back
              </GlassButton>
              {canRetry && (
                <GlassButton variant="cyan" onClick={() => connect(creatorId)}>
                  Try Again
                </GlassButton>
              )}
              {isBalanceError && (
                <GlassButton variant="cyan" onClick={() => router.push('/coins')}>
                  Add Coins
                </GlassButton>
              )}
            </div>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex flex-col items-center justify-center p-8">
      {/* Avatar and Status */}
      <div className="text-center mb-8">
        <div className="relative mb-6">
          {/* Animated rings based on state */}
          {speakingState === 'speaking' && (
            <>
              <div className="absolute -inset-4 rounded-full border-4 border-cyan-500/50 animate-pulse" />
              <div className="absolute -inset-8 rounded-full border-2 border-cyan-500/30 animate-ping" />
            </>
          )}
          {speakingState === 'listening' && (
            <div className="absolute -inset-4 rounded-full border-4 border-green-500/50 animate-pulse" />
          )}
          {speakingState === 'thinking' && (
            <div className="absolute -inset-4 rounded-full border-4 border-yellow-500/50 animate-spin" style={{ animationDuration: '3s' }} />
          )}

          {/* Avatar */}
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto shadow-[0_0_60px_rgba(6,182,212,0.5)]">
            {creatorAvatar ? (
              <img
                src={creatorAvatar}
                alt={creatorName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <Bot className="w-16 h-16 text-white" />
            )}
          </div>

          {/* AI indicator */}
          <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center border-4 border-gray-900">
            <Sparkles className="w-5 h-5 text-white" />
          </div>

          {/* Audio wave animation when AI is speaking */}
          {speakingState === 'speaking' && (
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
              <div className="w-1 h-4 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1 h-6 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1 h-4 bg-cyan-400 rounded-full animate-bounce" />
              <div className="w-1 h-5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.1s]" />
              <div className="w-1 h-3 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.2s]" />
            </div>
          )}
        </div>

        {/* Name */}
        <h2 className="text-2xl font-bold text-white mb-1">{creatorName}&apos;s AI Twin</h2>
        <p className={`mb-4 ${getStatusColor()}`}>{getStatusText()}</p>

        {/* Duration and Balance */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full border border-white/20">
            <Volume2 className="w-4 h-4 text-cyan-400" />
            <span className="text-white font-mono text-lg">{formatDuration(duration)}</span>
          </div>

          {/* Balance indicator */}
          {remainingBalance !== null && (
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${
              lowBalanceWarning
                ? 'bg-yellow-500/20 border-yellow-500/50'
                : 'bg-white/10 border-white/20'
            }`}>
              <Coins className={`w-4 h-4 ${lowBalanceWarning ? 'text-yellow-400' : 'text-cyan-400'}`} />
              <span className={`font-mono text-lg ${lowBalanceWarning ? 'text-yellow-400' : 'text-white'}`}>
                {remainingBalance.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Low balance warning banner */}
        {lowBalanceWarning && !balanceDepleted && (
          <div className="mt-4 flex items-center gap-2 px-4 py-2 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <span className="text-yellow-400 text-sm">
              Low balance! ~{minutesRemaining} minute{minutesRemaining !== 1 ? 's' : ''} remaining
            </span>
          </div>
        )}

        {/* Balance depleted warning */}
        {balanceDepleted && (
          <div className="mt-4 flex items-center gap-2 px-4 py-2 bg-red-500/20 rounded-lg border border-red-500/30">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-red-400 text-sm">
              Balance depleted - chat ending...
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        {/* Mute Button */}
        <button
          onClick={toggleMute}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${
            isMuted
              ? 'bg-red-500 text-white shadow-red-500/30'
              : 'bg-white/20 text-white hover:bg-white/30 border border-white/20'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
        </button>

        {/* End Chat Button */}
        <button
          onClick={handleEndChat}
          disabled={ending}
          className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all disabled:opacity-50 shadow-lg shadow-red-500/30"
          title="End Chat"
        >
          {ending ? <LoadingSpinner size="md" /> : <PhoneOff className="w-8 h-8" />}
        </button>
      </div>

      {/* Mute indicator */}
      {isMuted && (
        <p className="mt-4 text-red-400 text-sm flex items-center gap-2">
          <MicOff className="w-4 h-4" />
          You are muted
        </p>
      )}

      {/* Cost indicator */}
      <div className="mt-8 text-center">
        {totalCharged > 0 ? (
          <p className="text-gray-400 text-sm flex items-center justify-center gap-2">
            <Coins className="w-4 h-4" />
            <span>{totalCharged.toLocaleString()} coins used this session</span>
          </p>
        ) : (
          <p className="text-gray-500 text-sm">
            Coins are charged per minute of conversation
          </p>
        )}
      </div>
    </div>
  );
}
