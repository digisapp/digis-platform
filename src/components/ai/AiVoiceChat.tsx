'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GlassButton, GlassCard, LoadingSpinner } from '@/components/ui';
import { Mic, MicOff, PhoneOff, Bot, Volume2, Sparkles } from 'lucide-react';
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
  const { showError, showSuccess } = useToastContext();
  const [startTime, setStartTime] = useState<number | null>(null);
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [ending, setEnding] = useState(false);
  const [rating, setRating] = useState(0);
  const [showRating, setShowRating] = useState(false);
  const hasInitiatedRef = useRef(false);

  const {
    connectionState,
    speakingState,
    isMuted,
    error,
    connect,
    disconnect,
    toggleMute,
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
  });

  // Start connection on mount - only once
  useEffect(() => {
    if (hasInitiatedRef.current) return;
    hasInitiatedRef.current = true;
    connect(creatorId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creatorId]);

  // Track duration
  useEffect(() => {
    if (connectionState === 'connected' && !startTime) {
      setStartTime(Date.now());
    }
  }, [connectionState, startTime]);

  useEffect(() => {
    if (!startTime) return;

    const interval = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  // Clear AI response when user starts speaking
  useEffect(() => {
    if (speakingState === 'listening') {
      setAiResponse('');
    }
  }, [speakingState]);

  const handleEndChat = useCallback(async () => {
    setEnding(true);
    setShowRating(true);
  }, []);

  const handleSubmitRating = useCallback(async () => {
    try {
      await disconnect();
      showSuccess('Chat ended. Thanks for using AI Twin!');
      onEnd?.();
    } catch (err) {
      console.error('Error ending chat:', err);
      showError('Failed to end chat properly');
    } finally {
      setEnding(false);
    }
  }, [disconnect, showSuccess, showError, onEnd]);

  const handleSkipRating = useCallback(async () => {
    try {
      await disconnect();
      onEnd?.();
    } catch (err) {
      console.error('Error ending chat:', err);
    }
  }, [disconnect, onEnd]);

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

  // Rating dialog
  if (showRating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-8">
        <GlassCard glow="cyan" padding="lg" className="max-w-md w-full">
          <div className="text-center">
            <Bot className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Rate Your Chat</h2>
            <p className="text-gray-400 mb-6">
              How was your experience with {creatorName}&apos;s AI Twin?
            </p>

            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-3xl transition-transform hover:scale-110 ${
                    star <= rating ? 'text-yellow-400' : 'text-gray-600'
                  }`}
                >
                  {star <= rating ? '★' : '☆'}
                </button>
              ))}
            </div>

            <div className="flex gap-4">
              <GlassButton variant="ghost" onClick={handleSkipRating} className="flex-1">
                Skip
              </GlassButton>
              <GlassButton variant="cyan" onClick={handleSubmitRating} className="flex-1">
                Submit
              </GlassButton>
            </div>

            <p className="text-gray-500 text-sm mt-4">
              Session: {formatDuration(duration)}
            </p>
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <GlassCard glow="pink" padding="lg">
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-white mb-4">Connection Failed</h2>
            <p className="text-gray-300 mb-6">{error}</p>
            <div className="flex gap-4">
              <GlassButton variant="ghost" onClick={() => router.back()}>
                Go Back
              </GlassButton>
              <GlassButton variant="cyan" onClick={() => connect(creatorId)}>
                Try Again
              </GlassButton>
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

        {/* Duration */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full border border-white/20">
          <Volume2 className="w-4 h-4 text-cyan-400" />
          <span className="text-white font-mono text-lg">{formatDuration(duration)}</span>
        </div>
      </div>

      {/* Transcription Display */}
      {(transcript || aiResponse) && (
        <div className="w-full max-w-md mb-8">
          {transcript && (
            <div className="mb-3 p-3 bg-white/5 rounded-lg border border-white/10">
              <p className="text-xs text-gray-500 mb-1">You said:</p>
              <p className="text-gray-300">{transcript}</p>
            </div>
          )}
          {aiResponse && (
            <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
              <p className="text-xs text-cyan-500 mb-1">AI Twin:</p>
              <p className="text-white">{aiResponse}</p>
            </div>
          )}
        </div>
      )}

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
      <p className="mt-8 text-gray-500 text-sm">
        Coins are charged per minute of conversation
      </p>
    </div>
  );
}
