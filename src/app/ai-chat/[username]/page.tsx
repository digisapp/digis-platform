'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AiVoiceChat } from '@/components/ai';
import { GlassCard, LoadingSpinner } from '@/components/ui';
import { Bot, ArrowLeft, Coins } from 'lucide-react';

interface CreatorInfo {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  aiEnabled: boolean;
  pricePerMinute?: number;
  minimumMinutes?: number;
}

export default function AiChatPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creator, setCreator] = useState<CreatorInfo | null>(null);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    fetchCreatorInfo();
  }, [username]);

  const fetchCreatorInfo = async () => {
    try {
      // Fetch creator profile and AI settings
      const response = await fetch(`/api/profile/${username}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Creator not found');
      }

      // Check if AI Twin (voice) is enabled for this creator
      const aiResponse = await fetch(`/api/ai/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId: data.user.id }),
      });

      const aiData = await aiResponse.json();

      if (!aiResponse.ok) {
        // AI Twin might not be available - show appropriate message
        if (aiResponse.status === 404) {
          setCreator({
            id: data.user.id,
            username: data.user.username,
            displayName: data.user.displayName,
            avatarUrl: data.user.avatarUrl,
            aiEnabled: false,
          });
        } else if (aiResponse.status === 402) {
          // Insufficient coins
          setCreator({
            id: data.user.id,
            username: data.user.username,
            displayName: data.user.displayName,
            avatarUrl: data.user.avatarUrl,
            aiEnabled: true,
            pricePerMinute: aiData.pricePerMinute,
            minimumMinutes: aiData.minimumMinutes,
          });
          setError(`You need at least ${aiData.required} coins. You have ${aiData.balance} coins.`);
        } else {
          throw new Error(aiData.error || 'AI Twin not available');
        }
      } else {
        setCreator({
          id: data.user.id,
          username: data.user.username,
          displayName: data.user.displayName,
          avatarUrl: data.user.avatarUrl,
          aiEnabled: true,
          pricePerMinute: aiData.settings?.pricePerMinute,
          minimumMinutes: aiData.settings?.minimumMinutes,
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = () => {
    setShowChat(true);
  };

  const handleEndChat = () => {
    router.push(`/${username}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error && !creator?.aiEnabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <GlassCard className="max-w-md w-full p-8 text-center">
          <Bot className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">AI Twin Not Available</h2>
          <p className="text-gray-400 mb-6">{error || 'This creator has not enabled their AI Twin yet.'}</p>
          <button
            onClick={() => router.push(`/${username}`)}
            className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-purple-600 text-white rounded-lg font-semibold hover:scale-105 transition-transform"
          >
            Back to Profile
          </button>
        </GlassCard>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <GlassCard className="max-w-md w-full p-8 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Creator Not Found</h2>
          <button
            onClick={() => router.push('/explore')}
            className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-purple-600 text-white rounded-lg font-semibold hover:scale-105 transition-transform"
          >
            Browse Creators
          </button>
        </GlassCard>
      </div>
    );
  }

  // Insufficient funds error
  if (error && creator?.aiEnabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <GlassCard className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50 flex items-center justify-center">
            <Coins className="w-8 h-8 text-yellow-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Insufficient Coins</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <p className="text-sm text-gray-500 mb-6">
            Minimum session: {creator.minimumMinutes} minutes at {creator.pricePerMinute} coins/min
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/${username}`)}
              className="flex-1 px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg font-semibold hover:bg-white/20 transition-all"
            >
              Back
            </button>
            <button
              onClick={() => router.push('/wallet')}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-black rounded-lg font-semibold hover:scale-105 transition-transform"
            >
              Buy Coins
            </button>
          </div>
        </GlassCard>
      </div>
    );
  }

  // Show the actual voice chat if started
  if (showChat) {
    return (
      <AiVoiceChat
        creatorId={creator.id}
        creatorName={creator.displayName || creator.username}
        creatorAvatar={creator.avatarUrl || undefined}
        onEnd={handleEndChat}
      />
    );
  }

  // Pre-chat screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      {/* Back button */}
      <button
        onClick={() => router.push(`/${username}`)}
        className="absolute top-4 left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
      >
        <ArrowLeft className="w-6 h-6 text-white" />
      </button>

      <GlassCard glow="cyan" className="max-w-md w-full p-8 text-center">
        {/* Avatar */}
        <div className="relative mb-6">
          <div className="absolute -inset-3 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full blur-xl opacity-50" />
          <div className="relative w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center overflow-hidden">
            {creator.avatarUrl ? (
              <img
                src={creator.avatarUrl}
                alt={creator.displayName || creator.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <Bot className="w-12 h-12 text-white" />
            )}
          </div>
          {/* AI Badge */}
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center border-4 border-gray-900">
            <Bot className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-6">
          {creator.displayName || creator.username}&apos;s AI Twin
        </h1>

        {/* Pricing info */}
        {creator.pricePerMinute && (
          <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
            <div className="flex items-center justify-center gap-2 text-yellow-400 font-bold">
              <Coins className="w-5 h-5" />
              <span>{creator.pricePerMinute} coins/minute</span>
            </div>
          </div>
        )}

        {/* Features */}
        <div className="mb-6 text-left space-y-2">
          <div className="flex items-center gap-2 text-gray-300 text-sm">
            <span className="text-green-400">✓</span>
            Real-time voice conversation
          </div>
          <div className="flex items-center gap-2 text-gray-300 text-sm">
            <span className="text-green-400">✓</span>
            Available 24/7
          </div>
          <div className="flex items-center gap-2 text-gray-300 text-sm">
            <span className="text-green-400">✓</span>
            Speaks 100+ languages
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={handleStartChat}
          className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold hover:scale-105 transition-transform shadow-lg shadow-cyan-500/30"
        >
          Start Voice Chat
        </button>

        <p className="text-xs text-gray-500 mt-4">
          You&apos;ll need to allow microphone access
        </p>
      </GlassCard>
    </div>
  );
}
