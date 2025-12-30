'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AiVoiceChat } from '@/components/ai';
import { GlassCard, LoadingSpinner } from '@/components/ui';
import { Bot, ArrowLeft, Coins, Mic, MessageSquare } from 'lucide-react';

interface CreatorInfo {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  aiEnabled: boolean;
  voiceEnabled: boolean;
  textEnabled: boolean;
  pricePerMinute?: number;
  minimumMinutes?: number;
  textPricePerMessage?: number;
}

export default function AiChatPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creator, setCreator] = useState<CreatorInfo | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [chatMode, setChatMode] = useState<'voice' | 'text' | null>(null);

  useEffect(() => {
    fetchCreatorInfo();
  }, [username]);

  const fetchCreatorInfo = async () => {
    try {
      // Fetch creator profile
      const response = await fetch(`/api/profile/${username}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Creator not found');
      }

      // Check what AI modes are available for this creator
      const checkResponse = await fetch(`/api/ai/check/${data.user.id}`);
      const checkData = await checkResponse.json();

      if (!checkData.enabled) {
        setCreator({
          id: data.user.id,
          username: data.user.username,
          displayName: data.user.displayName,
          avatarUrl: data.user.avatarUrl,
          aiEnabled: false,
          voiceEnabled: false,
          textEnabled: false,
        });
        setError('This creator has not enabled their AI Twin yet');
        setLoading(false);
        return;
      }

      // Set creator info with available modes
      setCreator({
        id: data.user.id,
        username: data.user.username,
        displayName: data.user.displayName,
        avatarUrl: data.user.avatarUrl,
        aiEnabled: true,
        voiceEnabled: checkData.voiceEnabled || false,
        textEnabled: checkData.textEnabled || false,
        pricePerMinute: checkData.pricePerMinute,
        minimumMinutes: checkData.minimumMinutes,
        textPricePerMessage: checkData.textPricePerMessage,
      });

      // Auto-select mode if only one is available
      if (checkData.voiceEnabled && !checkData.textEnabled) {
        setChatMode('voice');
      } else if (checkData.textEnabled && !checkData.voiceEnabled) {
        setChatMode('text');
      }
      // If both available, user will choose

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = (mode: 'voice' | 'text') => {
    setChatMode(mode);
    setShowChat(true);
  };

  const handleEndChat = () => {
    router.push(`/${username}`);
  };

  const handleStartTextChat = async () => {
    if (!creator) return;

    try {
      // Check for existing conversation
      const response = await fetch('/api/messages/conversations');
      if (response.ok) {
        const data = await response.json();
        const existingConv = data.conversations?.find(
          (conv: any) => conv.user1Id === creator.id || conv.user2Id === creator.id
        );

        if (existingConv) {
          router.push(`/chats/${existingConv.id}`);
          return;
        }
      }

      // No existing conversation - create one
      const createResponse = await fetch('/api/messages/conversations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: creator.id }),
      });

      if (createResponse.ok) {
        const createData = await createResponse.json();
        router.push(`/chats/${createData.conversationId}`);
      } else {
        // Check error - might need to show message modal on profile
        console.error('[AI Text Chat] Failed to create conversation');
        router.push(`/${creator.username}`);
      }
    } catch (err) {
      console.error('[AI Text Chat] Error:', err);
      router.push(`/${creator?.username}`);
    }
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

  // Show the actual voice chat if started (voice mode only)
  if (showChat && chatMode === 'voice') {
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

        {/* Pricing info based on available modes */}
        <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10 space-y-2">
          {creator.voiceEnabled && creator.pricePerMinute && (
            <div className="flex items-center justify-center gap-2 text-yellow-400 font-bold">
              <Mic className="w-4 h-4" />
              <span>Voice: {creator.pricePerMinute} coins/min</span>
            </div>
          )}
          {creator.textEnabled && creator.textPricePerMessage && (
            <div className="flex items-center justify-center gap-2 text-cyan-400 font-bold">
              <MessageSquare className="w-4 h-4" />
              <span>Text: {creator.textPricePerMessage} coins/message</span>
            </div>
          )}
        </div>

        {/* Features based on available modes */}
        <div className="mb-6 text-left space-y-2">
          <div className="flex items-center gap-2 text-gray-300 text-sm">
            <span className="text-green-400">✓</span>
            Available 24/7
          </div>
          {creator.voiceEnabled && (
            <div className="flex items-center gap-2 text-gray-300 text-sm">
              <span className="text-green-400">✓</span>
              Real-time voice conversation
            </div>
          )}
          {creator.textEnabled && (
            <div className="flex items-center gap-2 text-gray-300 text-sm">
              <span className="text-green-400">✓</span>
              Text chat with AI personality
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-300 text-sm">
            <span className="text-green-400">✓</span>
            Speaks 100+ languages
          </div>
        </div>

        {/* Start buttons based on available modes */}
        <div className="space-y-3">
          {creator.voiceEnabled && (
            <button
              onClick={() => handleStartChat('voice')}
              className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold hover:scale-105 transition-transform shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2"
            >
              <Mic className="w-5 h-5" />
              Start Voice Chat
            </button>
          )}
          {creator.textEnabled && (
            <button
              onClick={handleStartTextChat}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:scale-105 transition-transform shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-5 h-5" />
              Start Text Chat
            </button>
          )}
        </div>

        {creator.voiceEnabled && (
          <p className="text-xs text-gray-500 mt-4">
            Voice chat requires microphone access
          </p>
        )}
      </GlassCard>
    </div>
  );
}
