'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from '@livekit/components-react';
import { StreamChat } from '@/components/streaming/StreamChat';
import { GiftAnimationManager } from '@/components/streaming/GiftAnimation';
import { RealtimeService, StreamEvent } from '@/lib/streams/realtime-service';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { Stream, StreamMessage, VirtualGift, StreamGift } from '@/db/schema';

export default function BroadcastStudioPage() {
  const params = useParams() as { streamId: string };
  const router = useRouter();
  const streamId = params.streamId as string;

  const [stream, setStream] = useState<Stream | null>(null);
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [token, setToken] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [viewerCount, setViewerCount] = useState(0);
  const [peakViewers, setPeakViewers] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [isEnding, setIsEnding] = useState(false);
  const [giftAnimations, setGiftAnimations] = useState<Array<{ gift: VirtualGift; streamGift: StreamGift }>>([]);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Fetch stream details and token
  useEffect(() => {
    fetchStreamDetails();
    fetchMessages();
    fetchBroadcastToken();
  }, [streamId]);

  // Setup real-time subscriptions
  useEffect(() => {
    if (!stream) return;

    const handleStreamEvent = (event: StreamEvent) => {
      switch (event.type) {
        case 'chat':
          setMessages((prev) => [...prev, event.data]);
          break;
        case 'gift':
          setGiftAnimations((prev) => [...prev, event.data]);
          setTotalEarnings((prev) => prev + event.data.streamGift.totalCoins);
          // Show gift notification
          showGiftNotification(event.data);
          break;
        case 'viewer_joined':
          playSound('join');
          break;
        case 'viewer_count':
          setViewerCount(event.data.currentViewers);
          setPeakViewers(event.data.peakViewers);
          break;
      }
    };

    const channel = RealtimeService.subscribeToStream(streamId, handleStreamEvent);

    return () => {
      RealtimeService.unsubscribeFromStream(streamId);
    };
  }, [stream, streamId]);

  const fetchStreamDetails = async () => {
    try {
      const response = await fetch(`/api/streams/${streamId}`);
      const data = await response.json();

      if (response.ok) {
        setStream(data.stream);
        setViewerCount(data.stream.currentViewers);
        setPeakViewers(data.stream.peakViewers);
        setTotalEarnings(data.stream.totalGiftsReceived);
      } else {
        setError(data.error || 'Stream not found');
      }
    } catch (err) {
      setError('Failed to load stream');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/streams/${streamId}/messages`);
      const data = await response.json();
      if (response.ok) {
        setMessages(data.messages.reverse());
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const fetchBroadcastToken = async () => {
    try {
      const response = await fetch(`/api/streams/${streamId}/broadcast-token`);
      const data = await response.json();

      if (response.ok) {
        setToken(data.token);
        setServerUrl(data.serverUrl);
      } else {
        setError(data.error || 'Not authorized to broadcast');
      }
    } catch (err) {
      setError('Failed to get broadcast token');
    }
  };

  const handleEndStream = async () => {
    setIsEnding(true);
    try {
      const response = await fetch(`/api/streams/${streamId}/end`, {
        method: 'POST',
      });

      if (response.ok) {
        router.push('/creator/dashboard');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to end stream');
      }
    } catch (err) {
      alert('Failed to end stream');
    } finally {
      setIsEnding(false);
      setShowEndConfirm(false);
    }
  };

  const showGiftNotification = (data: { gift: VirtualGift; streamGift: StreamGift }) => {
    // Play sound
    playSound('gift');

    // Could add a toast notification here
    console.log(`${data.streamGift.senderUsername} sent ${data.gift.emoji} ${data.gift.name}!`);
  };

  const playSound = (type: 'join' | 'gift') => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      if (type === 'gift') {
        // Happy ding sound for gifts
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      } else if (type === 'join') {
        // Subtle join sound
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      }
    } catch (err) {
      console.log('Audio not supported');
    }
  };

  const removeGiftAnimation = (index: number) => {
    setGiftAnimations((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async (message: string) => {
    try {
      const response = await fetch(`/api/streams/${streamId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }
    } catch (err: any) {
      throw err;
    }
  };

  const formatDuration = () => {
    if (!stream?.startedAt) return '0:00';
    const start = new Date(stream.startedAt);
    const diff = Math.floor((currentTime.getTime() - start.getTime()) / 1000);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !stream) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">😔</div>
          <h1 className="text-2xl font-bold text-white mb-2">{error || 'Stream not found'}</h1>
          <GlassButton variant="cyan" onClick={() => router.push('/creator/dashboard')}>
            Back to Dashboard
          </GlassButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      {/* Gift Animations Overlay */}
      <GiftAnimationManager gifts={giftAnimations} onRemove={removeGiftAnimation} />

      {/* End Stream Confirmation Modal */}
      {showEndConfirm && (
        <>
          <div className="fixed inset-0 bg-black/80 z-50" onClick={() => setShowEndConfirm(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-black/90 backdrop-blur-xl rounded-2xl border-2 border-white/20 p-8 max-w-md w-full">
              <h3 className="text-2xl font-bold text-white mb-4">End Stream?</h3>
              <p className="text-gray-400 mb-6">
                Are you sure you want to end this stream? Your viewers will be disconnected.
              </p>
              <div className="space-y-3">
                <GlassButton
                  variant="gradient"
                  size="lg"
                  onClick={handleEndStream}
                  disabled={isEnding}
                  className="w-full"
                >
                  {isEnding ? 'Ending...' : 'Yes, End Stream'}
                </GlassButton>
                <GlassButton
                  variant="ghost"
                  size="lg"
                  onClick={() => setShowEndConfirm(false)}
                  className="w-full"
                >
                  Cancel
                </GlassButton>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Top Stats Bar */}
      <div className="bg-black/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 rounded-lg border border-red-500">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-500 font-bold">LIVE</span>
                <span className="text-white ml-2">{formatDuration()}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-2xl">👤</span>
                <span className="text-white font-semibold">{viewerCount} viewers</span>
                <span className="text-gray-500">· Peak: {peakViewers}</span>
              </div>

              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-digis-cyan/20 to-digis-pink/20 rounded-lg border border-digis-cyan/30">
                <span className="text-2xl">💰</span>
                <span className="text-white font-bold">{totalEarnings} coins</span>
              </div>
            </div>

            <GlassButton
              variant="pink"
              size="md"
              onClick={() => setShowEndConfirm(true)}
              glow
            >
              End Stream
            </GlassButton>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Video Area */}
          <div className="lg:col-span-2 space-y-4">
            {/* Video Player */}
            <div className="aspect-video bg-black rounded-2xl overflow-hidden border-2 border-white/10">
              {token && serverUrl ? (
                <LiveKitRoom
                  video={true}
                  audio={true}
                  token={token}
                  serverUrl={serverUrl}
                  className="h-full"
                >
                  <VideoConference />
                  <RoomAudioRenderer />
                </LiveKitRoom>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <LoadingSpinner size="lg" />
                </div>
              )}
            </div>

            {/* Stream Info */}
            <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-6">
              <h1 className="text-2xl font-bold text-white mb-2">{stream.title}</h1>
              {stream.description && (
                <p className="text-gray-400">{stream.description}</p>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-4 text-center">
                <div className="text-3xl mb-2">👁️</div>
                <div className="text-2xl font-bold text-digis-cyan">{stream.totalViews}</div>
                <div className="text-sm text-gray-400">Total Views</div>
              </div>
              <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-4 text-center">
                <div className="text-3xl mb-2">📊</div>
                <div className="text-2xl font-bold text-digis-pink">{peakViewers}</div>
                <div className="text-sm text-gray-400">Peak Viewers</div>
              </div>
              <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-4 text-center">
                <div className="text-3xl mb-2">🎁</div>
                <div className="text-2xl font-bold text-yellow-400">{totalEarnings}</div>
                <div className="text-sm text-gray-400">Coins Earned</div>
              </div>
            </div>
          </div>

          {/* Chat Sidebar */}
          <div className="lg:col-span-1">
            <div className="h-[calc(100vh-12rem)] sticky top-24">
              <StreamChat
                streamId={streamId}
                messages={messages}
                isCreator={true}
                onSendMessage={handleSendMessage}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
