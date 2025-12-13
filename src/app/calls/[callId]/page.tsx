'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LiveKitRoom, RoomAudioRenderer, useConnectionState, useRemoteParticipants, useLocalParticipant, useTracks, VideoTrack, AudioTrack } from '@livekit/components-react';
import '@livekit/components-styles/themes/default';
import { ConnectionState, Track } from 'livekit-client';
import { Phone, PhoneOff, Loader2, Mic, MicOff, Volume2, Video, VideoOff, X, Clock, Coins, User, Zap, Gift, Send, MessageCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getAblyClient } from '@/lib/ably/client';
import { BuyCoinsModal } from '@/components/wallet/BuyCoinsModal';
import type Ably from 'ably';

interface CallToken {
  token: string;
  roomName: string;
  participantName: string;
  wsUrl: string;
}

interface CallData {
  id: string;
  status: string;
  callType: 'video' | 'voice';
  ratePerMinute: number;
  fanId: string;
  creatorId: string;
  fan: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  creator: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
}

// Component to detect when remote participant disconnects
function RemoteParticipantMonitor({
  onRemoteLeft,
  hasStarted
}: {
  onRemoteLeft: () => void;
  hasStarted: boolean;
}) {
  const remoteParticipants = useRemoteParticipants();
  const connectionState = useConnectionState();
  const [hadRemoteParticipant, setHadRemoteParticipant] = useState(false);

  useEffect(() => {
    // Track if we ever had a remote participant
    if (remoteParticipants.length > 0) {
      setHadRemoteParticipant(true);
    }
  }, [remoteParticipants.length]);

  useEffect(() => {
    // If we had a remote participant and now they're gone, and call has started
    if (hadRemoteParticipant && remoteParticipants.length === 0 && hasStarted && connectionState === ConnectionState.Connected) {
      console.log('Remote participant left the call');
      // Small delay to avoid false positives during reconnection
      const timeout = setTimeout(() => {
        if (remoteParticipants.length === 0) {
          onRemoteLeft();
        }
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [remoteParticipants.length, hadRemoteParticipant, hasStarted, connectionState, onRemoteLeft]);

  return null;
}

// Virtual gift type matching the database schema
interface VirtualGift {
  id: string;
  name: string;
  emoji: string;
  coinCost: number;
  rarity: string;
}

// FaceTime-style video layout component
function FaceTimeVideoLayout({
  callData,
  onEndCall,
  isEnding,
  duration,
  estimatedCost,
  hasStarted,
  userBalance,
  isFan,
  onSendTip,
  onSendGift,
  gifts,
  tipSending,
  chatMessages,
  onSendMessage,
  messageInput,
  setMessageInput,
  onBuyCoins,
  totalTipsReceived,
  onQuickTip,
}: {
  callData: CallData;
  onEndCall: () => void;
  isEnding: boolean;
  duration: number;
  estimatedCost: number;
  hasStarted: boolean;
  userBalance: number;
  isFan: boolean;
  onSendTip: (amount: number) => void;
  onSendGift: (gift: VirtualGift) => void;
  gifts: VirtualGift[];
  tipSending: boolean;
  chatMessages: Array<{ id: string; sender: string; senderName?: string; content: string; timestamp: number; type?: 'chat' | 'tip' | 'gift'; amount?: number; giftEmoji?: string }>;
  onSendMessage: () => void;
  messageInput: string;
  setMessageInput: (value: string) => void;
  onBuyCoins: () => void;
  totalTipsReceived: number;
  onQuickTip: () => void;
}) {
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone]);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(true); // Default video OFF - users manually enable
  const [localPosition, setLocalPosition] = useState({ x: 16, y: 16 });
  const [isDragging, setIsDragging] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showGifts, setShowGifts] = useState(false);
  const [showTipMenu, setShowTipMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showGiftAnimation, setShowGiftAnimation] = useState<{ emoji: string; id: string } | null>(null);
  const [lastDoubleTap, setLastDoubleTap] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

  // Track unread messages when chat is closed
  useEffect(() => {
    if (!showChat && chatMessages.length > 0) {
      const lastMsg = chatMessages[chatMessages.length - 1];
      if (lastMsg.type === 'chat') {
        setUnreadCount(prev => prev + 1);
      }
    }
  }, [chatMessages.length, showChat]);

  // Reset unread count when chat opens
  useEffect(() => {
    if (showChat) {
      setUnreadCount(0);
    }
  }, [showChat]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Show gift animation when gift received
  useEffect(() => {
    const lastMsg = chatMessages[chatMessages.length - 1];
    if (lastMsg?.type === 'gift' && lastMsg.giftEmoji) {
      setShowGiftAnimation({ emoji: lastMsg.giftEmoji, id: lastMsg.id });
      // Play sound
      try {
        const audio = new Audio('/sounds/gift.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch {}
      setTimeout(() => setShowGiftAnimation(null), 2000);
    } else if (lastMsg?.type === 'tip') {
      // Play tip sound
      try {
        const audio = new Audio('/sounds/coin.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch {}
    }
  }, [chatMessages.length]);

  // Double tap handler for quick tip
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastDoubleTap < 300) {
      // Double tap detected - send quick tip
      if (isFan && userBalance >= 10) {
        onQuickTip();
      }
    }
    setLastDoubleTap(now);
  }, [lastDoubleTap, isFan, userBalance, onQuickTip]);

  // Swipe gesture handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    swipeStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!swipeStartRef.current) return;
    const deltaX = e.changedTouches[0].clientX - swipeStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - swipeStartRef.current.y;

    // Only trigger if horizontal swipe is dominant
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 0) {
        // Swipe right - open chat
        setShowChat(true);
        setShowGifts(false);
        setShowTipMenu(false);
      } else {
        // Swipe left - open tip menu (for fans)
        if (isFan) {
          setShowTipMenu(true);
          setShowChat(false);
          setShowGifts(false);
        }
      }
    }
    swipeStartRef.current = null;
  }, [isFan]);

  // Low balance threshold
  const isLowBalance = userBalance < 100;

  const hasRemoteParticipant = remoteParticipants.length > 0;
  const remoteParticipant = remoteParticipants[0];

  // Get video tracks
  const localVideoTrack = tracks.find(
    t => t.participant.sid === localParticipant?.sid && t.source === Track.Source.Camera
  );
  const remoteVideoTrack = tracks.find(
    t => t.participant.sid === remoteParticipant?.sid && t.source === Track.Source.Camera
  );

  const toggleMute = async () => {
    if (localParticipant) {
      await localParticipant.setMicrophoneEnabled(isMuted);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = async () => {
    if (localParticipant) {
      await localParticipant.setCameraEnabled(isVideoOff);
      setIsVideoOff(!isVideoOff);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle dragging the local video
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragRef.current = {
      startX: clientX,
      startY: clientY,
      startPosX: localPosition.x,
      startPosY: localPosition.y,
    };
    setIsDragging(true);
  };

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragRef.current || !isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaX = clientX - dragRef.current.startX;
    const deltaY = clientY - dragRef.current.startY;

    const newX = Math.max(8, Math.min(window.innerWidth - 160, dragRef.current.startPosX + deltaX));
    const newY = Math.max(8, Math.min(window.innerHeight - 220, dragRef.current.startPosY + deltaY));

    setLocalPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    dragRef.current = null;
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('touchend', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchmove', handleDragMove);
        window.removeEventListener('touchend', handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Determine other participant - fan sees creator, creator sees fan
  const otherParticipant = isFan ? callData.creator : callData.fan;

  const TIP_AMOUNTS = [10, 25, 50, 100, 250, 500];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black overflow-hidden"
      style={{ height: '100dvh', minHeight: '-webkit-fill-available' }}
      onClick={handleDoubleTap}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Gift Animation Overlay */}
      {showGiftAnimation && (
        <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
          <div className="animate-bounce">
            <span className="text-[120px] drop-shadow-2xl">{showGiftAnimation.emoji}</span>
          </div>
          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute text-4xl animate-ping"
                style={{
                  left: `${10 + Math.random() * 80}%`,
                  top: `${10 + Math.random() * 80}%`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  animationDuration: '1s',
                }}
              >
                {showGiftAnimation.emoji}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Remote participant - full screen */}
      <div className="absolute inset-0">
        {remoteVideoTrack ? (
          <VideoTrack
            trackRef={remoteVideoTrack}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-center">
              {hasRemoteParticipant ? (
                <>
                  <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                    {otherParticipant?.avatarUrl ? (
                      <img src={otherParticipant.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-4xl font-bold text-white">
                        {(otherParticipant?.displayName || otherParticipant?.username)?.[0]?.toUpperCase() || '?'}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400">Camera off</p>
                </>
              ) : (
                <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30 flex items-center justify-center animate-pulse">
                  <User className="w-16 h-16 text-gray-500" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Local participant - small draggable PIP */}
      <div
        className={`absolute z-20 w-28 h-36 sm:w-36 sm:h-48 rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl cursor-move transition-shadow ${isDragging ? 'shadow-cyan-500/50' : ''}`}
        style={{ right: localPosition.x, top: Math.max(localPosition.y, 60) }}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
      >
        {localVideoTrack && !isVideoOff ? (
          <VideoTrack
            trackRef={localVideoTrack}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
              <User className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
          </div>
        )}
        {isMuted && (
          <div className="absolute bottom-2 right-2 p-1 sm:p-1.5 bg-red-500 rounded-full">
            <MicOff className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
          </div>
        )}
      </div>

      {/* Top bar - duration, earnings, and other participant info - safe area aware */}
      <div className="absolute top-0 left-0 right-0 z-30" style={{ paddingTop: 'max(8px, env(safe-area-inset-top, 8px))' }}>
        <div className="flex items-center justify-between pt-1 sm:pt-2 px-3">
          {/* Left side - Other participant avatar and name */}
          <div className="flex-1">
            {hasRemoteParticipant && otherParticipant && (
              <div className="inline-flex items-center gap-2 px-2.5 py-1.5 bg-black/60 backdrop-blur-xl rounded-full border border-white/20">
                <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                  {otherParticipant.avatarUrl ? (
                    <img
                      src={otherParticipant.avatarUrl}
                      alt={otherParticipant.displayName || otherParticipant.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-xs font-bold">
                      {(otherParticipant?.displayName || otherParticipant?.username)?.[0]?.toUpperCase() || '?'}
                    </span>
                  )}
                </div>
                <span className="text-white font-medium text-sm max-w-[80px] truncate">
                  {otherParticipant.displayName || otherParticipant.username}
                </span>
              </div>
            )}
          </div>

          {/* Center - Timer and cost/earnings */}
          <div className="flex items-center gap-2">
            {hasStarted && (
              <div className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-1.5 sm:py-2 bg-black/60 backdrop-blur-xl rounded-full border border-white/20">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
                  <span className="font-mono font-bold text-white text-sm sm:text-base">{formatDuration(duration)}</span>
                </div>
                <div className="w-px h-3 sm:h-4 bg-white/30" />
                {isFan ? (
                  // Fan sees cost - using green for better visibility
                  <div className="flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                    <span className="font-bold text-emerald-400 text-sm sm:text-base">~{estimatedCost}</span>
                  </div>
                ) : (
                  // Creator sees total earnings (call + tips)
                  <div className="flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                    <span className="font-bold text-emerald-400 text-sm sm:text-base">+{estimatedCost + totalTipsReceived}</span>
                  </div>
                )}
              </div>
            )}

            {/* Tips indicator for creator */}
            {!isFan && totalTipsReceived > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-emerald-500/20 to-green-500/20 backdrop-blur-xl rounded-full border border-emerald-500/30">
                <Gift className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-bold text-emerald-400 text-sm">+{totalTipsReceived}</span>
              </div>
            )}
          </div>

          {/* Right side - spacer for balance */}
          <div className="flex-1" />
        </div>
      </div>

      {/* Tips and Gifts - Always visible floating notifications */}
      {!showChat && (
        <div className="absolute left-3 bottom-48 sm:bottom-52 z-30 w-64 sm:w-72 max-h-[30vh] overflow-hidden pointer-events-none">
          <div className="space-y-1.5 overflow-hidden">
            {chatMessages.filter(m => m.type === 'tip' || m.type === 'gift').slice(-5).map((msg) => (
              <div key={msg.id} className="animate-in slide-in-from-left duration-300">
                {msg.type === 'tip' ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-green-500/90 to-emerald-500/90 backdrop-blur-sm shadow-lg border border-green-400/30">
                    <Coins className="w-4 h-4 text-emerald-300" />
                    <span className="text-white text-sm font-bold">{msg.senderName || 'Someone'}</span>
                    <span className="text-emerald-300 text-sm font-bold">+{msg.amount} coins!</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-pink-500/90 to-purple-500/90 backdrop-blur-sm shadow-lg border border-pink-400/30">
                    <span className="text-xl">{msg.giftEmoji}</span>
                    <span className="text-white text-sm font-bold">{msg.senderName || 'Someone'} sent a gift!</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat Overlay - floating messages on left side, positioned above wallet balance widget */}
      {showChat && (
        <div className="absolute left-3 bottom-48 sm:bottom-52 z-30 w-64 sm:w-72 max-h-[40vh] overflow-hidden pointer-events-auto">
          {/* Chat messages */}
          <div className="space-y-1.5 overflow-y-auto max-h-[calc(40vh-60px)] scrollbar-hide">
            {chatMessages.slice(-10).map((msg) => (
              <div key={msg.id} className="animate-in slide-in-from-left duration-300">
                {msg.type === 'tip' ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-green-500/80 to-emerald-500/80 backdrop-blur-sm shadow-lg">
                    <Coins className="w-3.5 h-3.5 text-emerald-300" />
                    <span className="text-white text-xs font-bold">{msg.senderName || 'You'}</span>
                    <span className="text-emerald-300 text-xs font-bold">+{msg.amount}</span>
                  </div>
                ) : msg.type === 'gift' ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-500/80 to-purple-500/80 backdrop-blur-sm shadow-lg">
                    <span className="text-lg">{msg.giftEmoji}</span>
                    <span className="text-white text-xs font-bold">{msg.senderName || 'You'}</span>
                  </div>
                ) : (
                  <div className="inline-flex items-start gap-1.5 px-2.5 py-1.5 rounded-xl bg-black/50 backdrop-blur-sm max-w-full">
                    <span className="text-cyan-300 text-xs font-bold shrink-0">{msg.senderName || 'You'}:</span>
                    <span className="text-white text-xs break-words">{msg.content}</span>
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input */}
          <div className="mt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && onSendMessage()}
              placeholder="Say something..."
              className="flex-1 px-3 py-2 bg-black/60 backdrop-blur-sm border border-white/20 rounded-full text-white text-sm placeholder-white/50 focus:outline-none focus:border-cyan-400"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSendMessage();
              }}
              disabled={!messageInput.trim()}
              className="p-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full disabled:opacity-50"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Gift picker overlay */}
      {showGifts && isFan && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-48 sm:bottom-52 z-40 animate-in slide-in-from-bottom duration-200 w-[85vw] max-w-xs">
          <div className="bg-black/80 backdrop-blur-xl rounded-2xl p-3 border border-white/20">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-white text-xs font-semibold">Send a Gift</span>
              <button onClick={() => setShowGifts(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-56 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
              <div className="grid grid-cols-3 gap-2 pr-1">
                {gifts.map((gift) => (
                  <button
                    key={gift.id}
                    onClick={() => {
                      onSendGift(gift);
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
            <div className="mt-2 text-center text-xs text-gray-400">
              Balance: <span className="text-emerald-400 font-bold">{userBalance}</span> coins
            </div>
          </div>
        </div>
      )}

      {/* Tip picker overlay */}
      {showTipMenu && isFan && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-48 sm:bottom-52 z-40 animate-in slide-in-from-bottom duration-200">
          <div className="bg-black/80 backdrop-blur-xl rounded-2xl p-3 border border-white/20">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-white text-xs font-semibold">Send a Tip</span>
              <button onClick={() => setShowTipMenu(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {TIP_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => {
                    onSendTip(amount);
                    setShowTipMenu(false);
                  }}
                  disabled={userBalance < amount || tipSending}
                  className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 hover:from-yellow-500/30 hover:to-orange-500/30 border border-yellow-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <Coins className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold text-sm">{amount}</span>
                </button>
              ))}
            </div>
            <div className="mt-2 text-center text-xs text-gray-400">
              Balance: <span className="text-emerald-400 font-bold">{userBalance}</span> coins
            </div>
          </div>
        </div>
      )}


      {/* Bottom controls - safe area aware */}
      <div className="absolute bottom-0 left-0 right-0 z-30" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))' }}>
        <div className="pb-2 sm:pb-4">
          {/* Coin balance and Buy Coins button - for fans only */}
          {isFan && (
            <div className="flex justify-center mb-3">
              <div className={`flex items-center gap-3 px-4 py-2.5 bg-black/70 backdrop-blur-xl rounded-2xl border ${isLowBalance ? 'border-red-500/50' : 'border-emerald-500/40'} shadow-lg`}>
                {/* Coin balance */}
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${isLowBalance ? 'bg-red-500/20' : 'bg-emerald-500/20'}`}>
                    <Coins className={`w-5 h-5 ${isLowBalance ? 'text-red-400' : 'text-emerald-400'}`} />
                  </div>
                  <div>
                    <div className={`text-lg font-bold ${isLowBalance ? 'text-red-400' : 'text-emerald-400'}`}>
                      {userBalance.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-gray-400 -mt-0.5">coins</div>
                  </div>
                </div>

                {/* Divider */}
                <div className="w-px h-8 bg-white/20" />

                {/* Buy Coins button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onBuyCoins();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 rounded-xl text-white font-bold text-sm transition-all active:scale-95 shadow-md shadow-emerald-500/30"
                >
                  <span>+</span>
                  <span>Buy Coins</span>
                </button>

                {/* Low balance warning */}
                {isLowBalance && (
                  <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-red-500 rounded-full">
                    <span className="text-white text-[10px] font-bold">LOW</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Main control buttons */}
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            {/* Chat toggle with unread badge */}
            <button
              onClick={() => { setShowChat(!showChat); setShowGifts(false); setShowTipMenu(false); }}
              className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                showChat
                  ? 'bg-cyan-500 text-white'
                  : 'bg-white/20 backdrop-blur-xl text-white hover:bg-white/30 border border-white/30'
              }`}
            >
              <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
              {/* Unread badge */}
              {!showChat && unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{unreadCount > 9 ? '9+' : unreadCount}</span>
                </div>
              )}
            </button>

            {/* Mute button */}
            <button
              onClick={toggleMute}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                isMuted
                  ? 'bg-red-500 text-white'
                  : 'bg-white/20 backdrop-blur-xl text-white hover:bg-white/30 border border-white/30'
              }`}
            >
              {isMuted ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>

            {/* End call button */}
            <button
              onClick={onEndCall}
              disabled={isEnding}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all shadow-lg shadow-red-500/30 disabled:opacity-50"
            >
              {isEnding ? <Loader2 className="w-6 h-6 sm:w-7 sm:h-7 animate-spin" /> : <PhoneOff className="w-6 h-6 sm:w-7 sm:h-7" />}
            </button>

            {/* Video toggle button */}
            <button
              onClick={toggleVideo}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                isVideoOff
                  ? 'bg-red-500 text-white'
                  : 'bg-white/20 backdrop-blur-xl text-white hover:bg-white/30 border border-white/30'
              }`}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Video className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>

            {/* Tip/Gift buttons - only for fans */}
            {isFan && (
              <>
                <button
                  onClick={() => { setShowTipMenu(!showTipMenu); setShowGifts(false); setShowChat(false); }}
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                    showTipMenu
                      ? 'bg-yellow-500 text-white'
                      : 'bg-white/20 backdrop-blur-xl text-white hover:bg-white/30 border border-white/30'
                  }`}
                >
                  <Coins className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>

                <button
                  onClick={() => { setShowGifts(!showGifts); setShowTipMenu(false); setShowChat(false); }}
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                    showGifts
                      ? 'bg-pink-500 text-white'
                      : 'bg-white/20 backdrop-blur-xl text-white hover:bg-white/30 border border-white/30'
                  }`}
                >
                  <Gift className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Voice Call UI Component
function VoiceCallUI({
  callData,
  duration,
  estimatedCost,
  isEnding,
  onEndCall,
}: {
  callData: CallData;
  duration: number;
  estimatedCost: number;
  isEnding: boolean;
  onEndCall: () => void;
}) {
  const [isMuted, setIsMuted] = useState(false);
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const connectionState = useConnectionState();

  const isConnected = connectionState === ConnectionState.Connected;
  const hasRemoteParticipant = remoteParticipants.length > 0;

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex flex-col items-center justify-center p-8">
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

      {/* Controls */}
      <div className="flex items-center gap-4">
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

        <button
          onClick={onEndCall}
          disabled={isEnding}
          className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all disabled:opacity-50 shadow-lg shadow-red-500/30"
          title="End Call"
        >
          {isEnding ? <Loader2 className="w-8 h-8 animate-spin" /> : <PhoneOff className="w-8 h-8" />}
        </button>
      </div>

      {isMuted && (
        <p className="mt-4 text-red-400 text-sm flex items-center gap-2">
          <MicOff className="w-4 h-4" />
          You are muted
        </p>
      )}
    </div>
  );
}

export default function VideoCallPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const callId = params.callId as string;

  const [callToken, setCallToken] = useState<CallToken | null>(null);
  const [callData, setCallData] = useState<CallData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [isEnding, setIsEnding] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Chat and tip state
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: string; senderName?: string; content: string; timestamp: number; type?: 'chat' | 'tip' | 'gift'; amount?: number; giftEmoji?: string }>>([]);
  const [messageInput, setMessageInput] = useState('');
  const [userBalance, setUserBalance] = useState(0);
  const [tipSending, setTipSending] = useState(false);
  const [showBuyCoinsModal, setShowBuyCoinsModal] = useState(false);
  const [totalTipsReceived, setTotalTipsReceived] = useState(0);
  const [gifts, setGifts] = useState<VirtualGift[]>([]);

  // Notify other party of connection error
  const notifyConnectionError = async (errorMessage: string) => {
    try {
      const ably = getAblyClient();
      const channel = ably.channels.get(`call:${callId}`);
      await channel.publish('connection_error', {
        userId: user?.id,
        error: errorMessage,
        timestamp: Date.now(),
      });
    } catch (e) {
      console.error('[CallPage] Failed to notify connection error:', e);
    }
  };

  // Fetch call token and data
  useEffect(() => {
    const fetchCallData = async () => {
      try {
        // Get LiveKit token
        const tokenRes = await fetch(`/api/calls/${callId}/token`);
        if (!tokenRes.ok) {
          const errorData = await tokenRes.json();
          const errorMsg = errorData.error || 'Failed to get call token';
          // Notify other party about the error
          await notifyConnectionError(errorMsg);
          throw new Error(errorMsg);
        }
        const tokenData = await tokenRes.json();
        setCallToken(tokenData);

        // Get call details
        const callRes = await fetch(`/api/calls/${callId}`);
        if (!callRes.ok) {
          const errorMsg = 'Failed to get call details';
          await notifyConnectionError(errorMsg);
          throw new Error(errorMsg);
        }
        const callDetails = await callRes.json();
        setCallData(callDetails.call);

        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching call data:', err);
        setError(err.message || 'Failed to load call');
        setLoading(false);
      }
    };

    fetchCallData();
  }, [callId]);

  // Start call when connected
  const handleConnected = async () => {
    // Use ref to avoid stale closure - check if already started
    if (hasStartedRef.current) {
      console.log('[CallPage] handleConnected called but already started, skipping');
      return;
    }

    console.log('[CallPage] Room connected! Starting timer for both parties');

    // Always start the local timer when connected - both parties should track time
    setHasStarted(true);

    // Try to notify backend that call has started (only one party will succeed, that's ok)
    try {
      const res = await fetch(`/api/calls/${callId}/start`, {
        method: 'POST',
      });

      if (!res.ok) {
        const errorData = await res.json();
        // This is expected for the second person to join - call already started
        console.log('[CallPage] Call start API response:', errorData.error || 'already started');
      } else {
        console.log('[CallPage] Call started successfully on backend');
      }
    } catch (err) {
      console.error('[CallPage] Error calling start API:', err);
      // Timer is already running locally, so this is fine
    }
  };

  // Timer for duration and cost
  useEffect(() => {
    if (!hasStarted) {
      console.log('[CallPage] Timer effect: hasStarted is false, not starting timer');
      return;
    }

    console.log('[CallPage] Timer effect: Starting timer! hasStarted =', hasStarted);

    const interval = setInterval(() => {
      setDuration((prev) => {
        const newDuration = prev + 1;
        if (newDuration % 10 === 0) {
          console.log('[CallPage] Timer tick: duration =', newDuration);
        }
        return newDuration;
      });
    }, 1000);

    return () => {
      console.log('[CallPage] Timer cleanup');
      clearInterval(interval);
    };
  }, [hasStarted]);

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate estimated cost
  const estimatedCost = callData
    ? Math.ceil(duration / 60) * callData.ratePerMinute
    : 0;

  // Fetch user balance
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await fetch('/api/wallet/balance');
        if (res.ok) {
          const data = await res.json();
          setUserBalance(data.balance || 0);
        }
      } catch (err) {
        console.error('Error fetching balance:', err);
      }
    };
    fetchBalance();
  }, []);

  // Fetch virtual gifts from API (same as live streams)
  useEffect(() => {
    const fetchGifts = async () => {
      try {
        const res = await fetch('/api/gifts');
        if (res.ok) {
          const data = await res.json();
          setGifts(data.gifts || []);
        }
      } catch (err) {
        console.error('Error fetching gifts:', err);
      }
    };
    fetchGifts();
  }, []);

  // Determine if current user is the fan (can send tips to creator)
  const isFan = user?.id && callData && user.id === callData.fanId;

  // Send tip to creator
  const handleSendTip = async (amount: number) => {
    if (!callData || tipSending || !user) return;

    if (userBalance < amount) {
      alert(`Insufficient balance. You need ${amount} coins but only have ${userBalance}.`);
      return;
    }

    setTipSending(true);
    try {
      const response = await fetch('/api/tips/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          receiverId: callData.creatorId,
          message: `Tip during video call`,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Use actual new balance from API
        setUserBalance(data.newBalance);
        console.log('[CallPage] Tip sent successfully, new balance:', data.newBalance);

        // Publish tip to Ably so both users see it
        try {
          const ably = getAblyClient();
          const channel = ably.channels.get(`call:${callId}`);
          const senderName = callData.fan?.displayName || callData.fan?.username || 'Fan';

          await channel.publish('tip_sent', {
            id: `tip-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            senderId: user.id,
            senderName,
            amount,
            timestamp: Date.now(),
          });
          console.log('[CallPage] Tip published to Ably');
        } catch (ablyErr) {
          console.error('[CallPage] Failed to publish tip to Ably:', ablyErr);
        }
      } else {
        alert(data.error || 'Failed to send tip');
      }
    } catch (err) {
      console.error('Error sending tip:', err);
      alert('Failed to send tip');
    } finally {
      setTipSending(false);
    }
  };

  // Quick tip handler (10 coins) - for double-tap gesture
  const handleQuickTip = useCallback(() => {
    if (userBalance >= 10 && !tipSending) {
      handleSendTip(10);
    }
  }, [userBalance, tipSending, handleSendTip]);

  // Send gift to creator
  const handleSendGift = async (gift: VirtualGift) => {
    if (!callData || tipSending || !user) return;

    if (userBalance < gift.coinCost) {
      alert(`Insufficient balance. You need ${gift.coinCost} coins but only have ${userBalance}.`);
      return;
    }

    setTipSending(true);
    try {
      const response = await fetch('/api/tips/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: gift.coinCost,
          receiverId: callData.creatorId,
          message: `Sent ${gift.emoji} ${gift.name} during video call`,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Use actual new balance from API response
        setUserBalance(data.newBalance);
        console.log('[CallPage] Gift sent successfully, new balance:', data.newBalance);

        // Publish gift to Ably so both users see it
        try {
          const ably = getAblyClient();
          const channel = ably.channels.get(`call:${callId}`);
          const senderName = callData.fan?.displayName || callData.fan?.username || 'Fan';

          await channel.publish('gift_sent', {
            id: `gift-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            senderId: user.id,
            senderName,
            giftName: gift.name,
            giftEmoji: gift.emoji,
            amount: gift.coinCost,
            timestamp: Date.now(),
          });
          console.log('[CallPage] Gift published to Ably');
        } catch (ablyErr) {
          console.error('[CallPage] Failed to publish gift to Ably:', ablyErr);
        }
      } else {
        alert(data.error || 'Failed to send gift');
      }
    } catch (err) {
      console.error('Error sending gift:', err);
      alert('Failed to send gift');
    } finally {
      setTipSending(false);
    }
  };

  // Send chat message via Ably so both users can see it
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !user) return;

    const msgContent = messageInput.trim();
    setMessageInput('');

    const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const timestamp = Date.now();

    // Determine sender name
    const senderName = callData?.fan?.id === user.id
      ? (callData.fan.displayName || callData.fan.username)
      : (callData?.creator?.displayName || callData?.creator?.username || 'Unknown');

    // Optimistically add message locally immediately for sender
    setChatMessages((prev) => [...prev, {
      id: msgId,
      sender: user.id,
      senderName: 'You',
      content: msgContent,
      timestamp,
      type: 'chat',
    }]);

    try {
      const ably = getAblyClient();
      const channel = ably.channels.get(`call:${callId}`);

      await channel.publish('chat_message', {
        id: msgId,
        senderId: user.id,
        senderName,
        content: msgContent,
        timestamp,
        type: 'chat',
      });
      console.log('[CallPage] Chat message published to Ably');
    } catch (err) {
      console.error('[CallPage] Failed to send message:', err);
      // Message was already added locally, so no fallback needed
    }
  };

  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [callEndedByOther, setCallEndedByOther] = useState(false);
  const [otherPartyError, setOtherPartyError] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState<string | null>(null);
  const [showCreatorSummary, setShowCreatorSummary] = useState(false);
  const [finalCallDuration, setFinalCallDuration] = useState(0);
  const [finalCallEarnings, setFinalCallEarnings] = useState(0);
  const [finalTipEarnings, setFinalTipEarnings] = useState(0);

  // Refs to track latest values for Ably callbacks
  const durationRef = useRef(duration);
  const totalTipsReceivedRef = useRef(totalTipsReceived);
  const hasStartedRef = useRef(hasStarted);

  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { totalTipsReceivedRef.current = totalTipsReceived; }, [totalTipsReceived]);
  useEffect(() => { hasStartedRef.current = hasStarted; }, [hasStarted]);

  // Subscribe to call events via Ably
  useEffect(() => {
    let channel: Ably.RealtimeChannel | null = null;
    let mounted = true;

    const setupChannel = async () => {
      try {
        const ably = getAblyClient();

        // Wait for connection
        if (ably.connection.state !== 'connected') {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000);
            ably.connection.once('connected', () => {
              clearTimeout(timeout);
              resolve();
            });
            ably.connection.once('failed', () => {
              clearTimeout(timeout);
              reject(new Error('Connection failed'));
            });
          });
        }

        if (!mounted) return;

        // Subscribe to call channel - explicitly attach first
        channel = ably.channels.get(`call:${callId}`);

        // Wait for channel to be attached before subscribing
        if (channel.state !== 'attached') {
          await Promise.race([
            channel.attach(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Channel attach timeout')), 10000))
          ]);
        }

        if (!mounted) return;

        console.log('[CallPage] Ably channel attached, subscribing to events');

        channel.subscribe('call_ended', (message) => {
          console.log('Call ended by other party:', message.data);

          // For creator, show summary; for fan, show simple ended modal
          const isCreator = user?.id && callData && user.id === callData.creatorId;
          if (isCreator && hasStartedRef.current) {
            // Save final stats for summary using refs for latest values
            const currentDuration = durationRef.current;
            const callEarnings = callData ? Math.ceil(currentDuration / 60) * callData.ratePerMinute : 0;
            setFinalCallDuration(currentDuration);
            setFinalCallEarnings(callEarnings);
            setFinalTipEarnings(totalTipsReceivedRef.current);
            setShowCreatorSummary(true);
          } else {
            setCallEndedByOther(true);
            // Navigate to dashboard after a short delay
            setTimeout(() => {
              router.push('/dashboard');
            }, 2000);
          }
        });

        channel.subscribe('call_accepted', (message) => {
          console.log('Call accepted:', message.data);
          // Could trigger UI update if needed
        });

        channel.subscribe('call_rejected', (message) => {
          console.log('Call rejected:', message.data);
          const reason = message.data?.reason;
          if (reason) {
            setDeclineReason(reason);
            setError(`Call declined: "${reason}"`);
          } else {
            setError('Call was declined');
          }
          setTimeout(() => {
            router.push('/dashboard');
          }, 3000);
        });

        channel.subscribe('connection_error', (message) => {
          console.log('Other party had connection error:', message.data);
          // Only show if it's from the other party (not ourselves)
          if (message.data.userId !== user?.id) {
            setOtherPartyError(message.data.error || 'Connection failed');
          }
        });

        // Subscribe to chat messages from other party
        channel.subscribe('chat_message', (message) => {
          const data = message.data;
          // Add message to chat
          setChatMessages((prev) => {
            // Check for duplicate
            if (prev.some(m => m.id === data.id)) return prev;
            return [...prev, {
              id: data.id,
              sender: data.senderId,
              senderName: data.senderId === user?.id ? 'You' : data.senderName,
              content: data.content,
              timestamp: data.timestamp,
              type: data.type || 'chat',
            }];
          });
        });

        // Subscribe to tip notifications
        channel.subscribe('tip_sent', (message) => {
          const data = message.data;
          setChatMessages((prev) => {
            if (prev.some(m => m.id === data.id)) return prev;
            return [...prev, {
              id: data.id || `tip-${Date.now()}`,
              sender: data.senderId,
              senderName: data.senderId === user?.id ? 'You' : data.senderName,
              content: `tipped ${data.amount} coins`,
              timestamp: data.timestamp || Date.now(),
              type: 'tip',
              amount: data.amount,
            }];
          });
          // Track tips received (for creator)
          if (data.senderId !== user?.id) {
            setTotalTipsReceived((prev) => prev + (data.amount || 0));
          }
        });

        // Subscribe to gift notifications
        channel.subscribe('gift_sent', (message) => {
          const data = message.data;
          // Track gifts received (for creator)
          if (data.senderId !== user?.id) {
            setTotalTipsReceived((prev) => prev + (data.amount || 0));
          }
          setChatMessages((prev) => {
            if (prev.some(m => m.id === data.id)) return prev;
            return [...prev, {
              id: data.id || `gift-${Date.now()}`,
              sender: data.senderId,
              senderName: data.senderId === user?.id ? 'You' : data.senderName,
              content: `sent ${data.giftName}`,
              timestamp: data.timestamp || Date.now(),
              type: 'gift',
              giftEmoji: data.giftEmoji,
            }];
          });
        });

      } catch (err) {
        console.error('[CallPage] Ably setup error:', err);
      }
    };

    setupChannel();

    return () => {
      mounted = false;
      if (channel) {
        channel.unsubscribe();
        // Only detach if the channel is actually attached
        // This prevents "Attach request superseded by subsequent detach request" errors
        if (channel.state === 'attached') {
          channel.detach().catch(() => {});
        }
      }
    };
  }, [callId, router]);

  // Handle remote participant disconnection (e.g., computer died, browser closed)
  const handleRemoteLeft = useCallback(() => {
    console.log('Remote participant disconnected unexpectedly');

    // Try to end the call on our side too
    fetch(`/api/calls/${callId}/end`, { method: 'POST' }).catch(() => {});

    // Check if current user is creator - show summary instead of auto-redirect
    const isCreator = user?.id && callData && user.id === callData.creatorId;
    if (isCreator && hasStartedRef.current) {
      // Show creator summary - no auto-redirect
      const currentDuration = durationRef.current;
      const callEarnings = callData ? Math.ceil(currentDuration / 60) * callData.ratePerMinute : 0;
      setFinalCallDuration(currentDuration);
      setFinalCallEarnings(callEarnings);
      setFinalTipEarnings(totalTipsReceivedRef.current);
      setShowCreatorSummary(true);
    } else {
      // Fan - show ended modal and redirect
      setCallEndedByOther(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    }
  }, [callId, router, user?.id, callData]);

  // End call
  const handleEndCall = async () => {
    if (isEnding) return;
    setShowEndConfirm(true);
  };

  const confirmEndCall = async () => {
    setIsEnding(true);
    setShowEndConfirm(false);

    // Check if current user is creator
    const isCreator = user?.id && callData && user.id === callData.creatorId;

    try {
      const res = await fetch(`/api/calls/${callId}/end`, {
        method: 'POST',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to end call');
      }

      const result = await res.json();
      console.log('Call ended:', result);

      // Show summary for creator, redirect for fan
      if (isCreator && hasStarted) {
        const callEarnings = callData ? Math.ceil(duration / 60) * callData.ratePerMinute : 0;
        setFinalCallDuration(duration);
        setFinalCallEarnings(callEarnings);
        setFinalTipEarnings(totalTipsReceived);
        setShowCreatorSummary(true);
        setIsEnding(false);
      } else {
        // Redirect to dashboard for fan
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error('Error ending call:', err);
      setIsEnding(false);
      // Show error but still try to redirect
      setTimeout(() => router.push('/dashboard'), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-96 h-96 -top-10 -left-10 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute w-96 h-96 bottom-10 right-10 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>

        <div className="text-center relative z-10">
          <div className="relative inline-block mb-6">
            <div className="absolute -inset-4 bg-cyan-500/30 rounded-full blur-xl animate-pulse"></div>
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center shadow-[0_0_40px_rgba(34,211,238,0.5)]">
              <Video className="w-10 h-10 text-white animate-pulse" />
            </div>
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-2">Connecting...</h2>
          <p className="text-gray-400">Setting up your video call</p>
          <div className="mt-6 flex justify-center gap-1">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    const isDeclined = error.includes('declined') || declineReason;
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute w-96 h-96 -top-10 -left-10 ${isDeclined ? 'bg-orange-500/10' : 'bg-red-500/10'} rounded-full blur-3xl`}></div>
        </div>

        <div className="text-center max-w-md mx-auto px-4 relative z-10">
          <div className={`backdrop-blur-2xl bg-gradient-to-br ${isDeclined ? 'from-orange-500/10 via-gray-900/60 to-black/40 border-orange-500/30 shadow-[0_0_50px_rgba(249,115,22,0.2)]' : 'from-red-500/10 via-gray-900/60 to-black/40 border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.2)]'} rounded-3xl p-8 border-2`}>
            <div className={`w-16 h-16 mx-auto mb-6 ${isDeclined ? 'bg-orange-500/20' : 'bg-red-500/20'} rounded-2xl flex items-center justify-center`}>
              <PhoneOff className={`w-8 h-8 ${isDeclined ? 'text-orange-400' : 'text-red-400'}`} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              {isDeclined ? 'Creator Unavailable' : 'Call Error'}
            </h2>
            {declineReason ? (
              <div className="mb-6">
                <p className="text-gray-400 mb-3">The creator left a message:</p>
                <div className="px-4 py-3 bg-white/5 rounded-xl border border-orange-500/20">
                  <p className="text-orange-300 italic">"{declineReason}"</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 mb-6">
                {isDeclined ? 'The creator is not available right now. Try again later!' : error}
              </p>
            )}
            <p className="text-gray-500 text-sm mb-4">Redirecting to dashboard...</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-semibold hover:scale-105 transition-all shadow-lg"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!callToken || !callData) {
    return null;
  }

  const isVoiceCall = callData.callType === 'voice';

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900 overflow-hidden" style={{ height: '100dvh', minHeight: '-webkit-fill-available' }}>
      {/* Static background effects - no animations to prevent glitching */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[600px] h-[600px] -top-20 -left-20 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute w-[500px] h-[500px] top-1/2 right-0 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute w-[400px] h-[400px] bottom-0 left-1/3 bg-pink-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Other Party Connection Error Modal */}
      {otherPartyError && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative backdrop-blur-2xl bg-gradient-to-br from-black/60 via-gray-900/80 to-black/60 rounded-3xl p-8 max-w-sm w-full border-2 border-orange-500/40 shadow-[0_0_60px_rgba(249,115,22,0.3)] animate-in zoom-in-95 duration-200">
            <div className="relative text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-orange-500/20 rounded-2xl flex items-center justify-center border border-orange-500/40">
                <X className="w-10 h-10 text-orange-400" />
              </div>

              <h3 className="text-2xl font-bold text-white mb-3">Connection Problem</h3>
              <p className="text-gray-400 mb-2">The other participant couldn't connect to the call.</p>
              <p className="text-sm text-orange-300 mb-6 bg-orange-500/10 rounded-lg p-3 border border-orange-500/20">
                {otherPartyError}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setOtherPartyError(null)}
                  className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all border border-white/20"
                >
                  Keep Waiting
                </button>
                <button
                  onClick={() => {
                    fetch(`/api/calls/${callId}/end`, { method: 'POST' }).catch(() => {});
                    router.push('/dashboard');
                  }}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold transition-all shadow-lg"
                >
                  End Call
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Call Ended by Other Party Modal */}
      {callEndedByOther && (
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
      )}

      {/* End Call Confirmation Modal */}
      {showEndConfirm && (
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
                  onClick={() => setShowEndConfirm(false)}
                  className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all border border-white/20"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmEndCall}
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
      )}

      {/* Creator Call Summary Modal */}
      {showCreatorSummary && (
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
              <p className="text-gray-400 mb-6">Here's your earnings summary</p>

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

                {/* Tips & Gifts */}
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-pink-400" />
                    <span className="text-gray-400 text-sm">Tips & Gifts</span>
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
                onClick={() => router.push('/dashboard')}
                className="w-full px-8 py-4 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white rounded-xl font-semibold transition-all shadow-lg shadow-emerald-500/30"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      <LiveKitRoom
        token={callToken.token}
        serverUrl={callToken.wsUrl}
        connect={true}
        onConnected={handleConnected}
        audio={true}
        video={false}
        className="h-full"
      >
        {/* Monitor for remote participant disconnection */}
        <RemoteParticipantMonitor onRemoteLeft={handleRemoteLeft} hasStarted={hasStarted} />

        {isVoiceCall ? (
          // Voice Call UI
          <>
            <VoiceCallUI
              callData={callData}
              duration={duration}
              estimatedCost={estimatedCost}
              isEnding={isEnding}
              onEndCall={handleEndCall}
            />
            <RoomAudioRenderer />
          </>
        ) : (
          // Video Call UI - FaceTime Style
          <>
            <FaceTimeVideoLayout
              callData={callData}
              onEndCall={handleEndCall}
              isEnding={isEnding}
              duration={duration}
              estimatedCost={estimatedCost}
              hasStarted={hasStarted}
              userBalance={userBalance}
              isFan={!!isFan}
              onSendTip={handleSendTip}
              onSendGift={handleSendGift}
              gifts={gifts}
              tipSending={tipSending}
              chatMessages={chatMessages}
              onSendMessage={handleSendMessage}
              messageInput={messageInput}
              setMessageInput={setMessageInput}
              onBuyCoins={() => setShowBuyCoinsModal(true)}
              totalTipsReceived={totalTipsReceived}
              onQuickTip={handleQuickTip}
            />
            <RoomAudioRenderer />
          </>
        )}
      </LiveKitRoom>

      {/* Custom LiveKit Styles */}
      <style jsx global>{`
        .livekit-container .lk-video-conference {
          --lk-bg: transparent !important;
          --lk-bg2: rgba(0, 0, 0, 0.4) !important;
          --lk-control-bg: rgba(0, 0, 0, 0.6) !important;
          --lk-control-hover-bg: rgba(34, 211, 238, 0.2) !important;
          --lk-accent-fg: rgb(34, 211, 238) !important;
          --lk-danger: rgb(239, 68, 68) !important;
          background: transparent !important;
        }

        .livekit-container .lk-focus-layout {
          background: transparent !important;
        }

        .livekit-container .lk-participant-tile {
          background: rgba(0, 0, 0, 0.6) !important;
          border: 2px solid rgba(34, 211, 238, 0.3) !important;
          border-radius: 1rem !important;
          box-shadow: 0 0 30px rgba(34, 211, 238, 0.2) !important;
        }

        .livekit-container .lk-participant-placeholder {
          background: linear-gradient(135deg, rgba(34, 211, 238, 0.1), rgba(168, 85, 247, 0.1)) !important;
        }

        .livekit-container .lk-control-bar {
          background: rgba(0, 0, 0, 0.8) !important;
          backdrop-filter: blur(20px) !important;
          border-top: 1px solid rgba(34, 211, 238, 0.3) !important;
          padding: 1rem !important;
        }

        .livekit-container .lk-button {
          background: rgba(255, 255, 255, 0.1) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          border-radius: 0.75rem !important;
          transition: all 0.2s !important;
        }

        .livekit-container .lk-button:hover {
          background: rgba(34, 211, 238, 0.2) !important;
          border-color: rgba(34, 211, 238, 0.5) !important;
          transform: scale(1.05) !important;
        }

        .livekit-container .lk-disconnect-button {
          background: linear-gradient(135deg, rgb(239, 68, 68), rgb(220, 38, 38)) !important;
          border: none !important;
        }

        .livekit-container .lk-disconnect-button:hover {
          background: linear-gradient(135deg, rgb(220, 38, 38), rgb(185, 28, 28)) !important;
        }

        .livekit-container .lk-participant-name {
          background: rgba(0, 0, 0, 0.7) !important;
          backdrop-filter: blur(10px) !important;
          border: 1px solid rgba(34, 211, 238, 0.3) !important;
          border-radius: 0.5rem !important;
          padding: 0.25rem 0.75rem !important;
        }

        /* Hide the local participant tile in 1:1 calls - show as small PIP instead */
        .livekit-container .lk-focus-layout .lk-carousel {
          position: absolute !important;
          bottom: 1rem !important;
          right: 1rem !important;
          width: 180px !important;
          height: auto !important;
          z-index: 20 !important;
        }

        .livekit-container .lk-focus-layout .lk-carousel .lk-participant-tile {
          width: 180px !important;
          height: 120px !important;
          border-radius: 0.75rem !important;
        }

        /* Make focus view take full space */
        .livekit-container .lk-focus-layout-wrapper {
          height: 100% !important;
        }

        /* Hide placeholder icon when no video */
        .livekit-container .lk-participant-placeholder svg {
          opacity: 0.3 !important;
          width: 48px !important;
          height: 48px !important;
        }

        /* Grid layout for when both participants are visible equally */
        .livekit-container .lk-grid-layout {
          gap: 0.5rem !important;
          padding: 0.5rem !important;
        }

        /* Center the video conference */
        .livekit-container {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .livekit-container .lk-video-conference {
          width: 100% !important;
          height: 100% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .livekit-container .lk-focus-layout {
          width: 100% !important;
          height: 100% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        /* Main participant takes center stage */
        .livekit-container .lk-focus-layout > .lk-participant-tile {
          max-width: 100% !important;
          max-height: 100% !important;
          width: auto !important;
          height: auto !important;
          aspect-ratio: 16/9 !important;
        }
      `}</style>

      {/* Buy Coins Modal */}
      <BuyCoinsModal
        isOpen={showBuyCoinsModal}
        onClose={() => setShowBuyCoinsModal(false)}
        onSuccess={async () => {
          // Refresh balance after purchase
          try {
            const res = await fetch('/api/wallet/balance');
            if (res.ok) {
              const data = await res.json();
              setUserBalance(data.balance || 0);
            }
          } catch (err) {
            console.error('Error refreshing balance:', err);
          }
          setShowBuyCoinsModal(false);
        }}
      />
    </div>
  );
}
