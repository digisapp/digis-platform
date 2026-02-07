'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useLocalParticipant, useRemoteParticipants, useTracks, VideoTrack } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Loader2, Mic, MicOff, Video, VideoOff, X, Clock, Coins, User, Zap, Gift, Send, MessageCircle } from 'lucide-react';
import type { CallData, VirtualGift, ChatMessage } from './types';

interface FaceTimeVideoLayoutProps {
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
  chatMessages: ChatMessage[];
  onSendMessage: () => void;
  messageInput: string;
  setMessageInput: (value: string) => void;
  onBuyCoins: () => void;
  totalTipsReceived: number;
  onQuickTip: () => void;
}

export function FaceTimeVideoLayout({
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
}: FaceTimeVideoLayoutProps) {
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone]);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(true); // Default video OFF - users manually enable
  const [localPosition, setLocalPosition] = useState({ x: 16, y: 16 });
  const [isDragging, setIsDragging] = useState(false);
  const [showChat, setShowChat] = useState(true); // Chat open by default
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

  // Gift-specific sounds - unique sound for each gift type
  const GIFT_SPECIFIC_SOUNDS: Record<string, string> = {
    'Fire': '/sounds/gift-fire.mp3',
    'Heart': '/sounds/gift-heart.mp3',
    'Peach': '/sounds/gift-peach.mp3',
    'Pizza': '/sounds/gift-pizza.mp3',
    'Rocket': '/sounds/gift-rocket.mp3',
    'Rose': '/sounds/gift-rose.mp3',
    'Martini': '/sounds/gift-martini.mp3',
    'Cake': '/sounds/gift-cake.mp3',
    'Sushi': '/sounds/gift-sushi.mp3',
    'Steak': '/sounds/gift-steak.mp3',
    'Champagne': '/sounds/gift-champagne.mp3',
    'Gold Bar': '/sounds/gift-money.mp3',
    'Crown': '/sounds/gift-crown.mp3',
    'Designer Bag': '/sounds/gift-bag.mp3',
    'Diamond': '/sounds/gift-diamond.mp3',
    'Engagement Ring': '/sounds/gift-ring.mp3',
    'Sports Car': '/sounds/gift-sports-car.mp3',
    'Yacht': '/sounds/gift-yacht.mp3',
    'Jet': '/sounds/gift-jet.mp3',
    'Mansion': '/sounds/gift-mansion.mp3',
  };

  // Rarity-based fallback sounds for gifts
  const RARITY_SOUNDS: Record<string, string> = {
    common: '/sounds/coin-common.mp3',
    rare: '/sounds/coin-rare.mp3',
    epic: '/sounds/coin-epic.mp3',
    legendary: '/sounds/coin-legendary.mp3',
  };

  // Show gift animation when gift received
  useEffect(() => {
    const lastMsg = chatMessages[chatMessages.length - 1];
    if (lastMsg?.type === 'gift' && lastMsg.giftEmoji) {
      setShowGiftAnimation({ emoji: lastMsg.giftEmoji, id: lastMsg.id });
      // Play gift-specific sound, or fall back to rarity-based sound
      try {
        let soundFile = '/sounds/coin-common.mp3';
        if (lastMsg.giftName && GIFT_SPECIFIC_SOUNDS[lastMsg.giftName]) {
          soundFile = GIFT_SPECIFIC_SOUNDS[lastMsg.giftName];
        } else if (lastMsg.giftRarity && RARITY_SOUNDS[lastMsg.giftRarity]) {
          soundFile = RARITY_SOUNDS[lastMsg.giftRarity];
        }
        const audio = new Audio(soundFile);
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch {}
      setTimeout(() => setShowGiftAnimation(null), 2000);
    } else if (lastMsg?.type === 'tip' && lastMsg.amount) {
      try {
        const amount = lastMsg.amount;
        let soundFile = '/sounds/coin-common.mp3';
        if (amount >= 1000) {
          soundFile = '/sounds/coin-legendary.mp3';
        } else if (amount >= 500) {
          soundFile = '/sounds/coin-epic.mp3';
        } else if (amount >= 200) {
          soundFile = '/sounds/coin-rare.mp3';
        } else if (amount >= 50) {
          soundFile = '/sounds/coin-super.mp3';
        } else if (amount >= 10) {
          soundFile = '/sounds/coin-nice.mp3';
        }
        const audio = new Audio(soundFile);
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
                  <div className="relative w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                    {otherParticipant?.avatarUrl ? (
                      <Image src={otherParticipant.avatarUrl} alt="" fill className="rounded-full object-cover" unoptimized />
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
        <div className="absolute left-0 bottom-48 sm:bottom-52 z-30 w-72 sm:w-80 max-h-[40vh] overflow-hidden pointer-events-auto">
          {/* Gradient background for better readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent rounded-r-2xl pointer-events-none" />

          {/* Chat messages */}
          <div className="relative space-y-1.5 overflow-y-auto max-h-[calc(40vh-60px)] scrollbar-hide px-3 py-2">
            {chatMessages.slice(-10).map((msg) => (
              <div key={msg.id} className="animate-in slide-in-from-left duration-300">
                {msg.type === 'tip' ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-green-500/90 to-emerald-500/90 shadow-lg shadow-green-500/20">
                    <Coins className="w-3.5 h-3.5 text-emerald-200" />
                    <span className="text-white text-xs font-bold">{msg.senderName || 'You'}</span>
                    <span className="text-emerald-200 text-xs font-bold">+{msg.amount}</span>
                  </div>
                ) : msg.type === 'gift' ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-500/90 to-purple-500/90 shadow-lg shadow-pink-500/20">
                    <span className="text-lg">{msg.giftEmoji}</span>
                    <span className="text-white text-xs font-bold">{msg.senderName || 'You'}</span>
                  </div>
                ) : (
                  <div className="inline-flex items-start gap-1.5 px-2.5 py-1.5 rounded-xl bg-black/70 max-w-full shadow-sm">
                    <span className="text-cyan-300 text-xs font-bold shrink-0">{msg.senderName || 'You'}:</span>
                    <span className="text-white text-xs break-words">{msg.content}</span>
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input */}
          <div className="relative mt-2 flex gap-2 px-3 pb-2" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && onSendMessage()}
              placeholder="Say something..."
              className="flex-1 px-3 py-2 bg-black/70 border border-white/20 rounded-full text-white text-sm placeholder-white/50 focus:outline-none focus:border-cyan-400"
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
          <div className="bg-gray-900 rounded-2xl p-3 border border-white/20">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-white text-xs font-semibold">Send Tip</span>
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
          <div className="bg-gray-900 rounded-2xl p-3 border border-white/20">
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
              className="px-6 py-3 sm:px-8 sm:py-4 rounded-full bg-red-500 hover:bg-red-600 text-white font-bold text-sm sm:text-base transition-all shadow-lg shadow-red-500/30 disabled:opacity-50"
            >
              {isEnding ? <Loader2 className="w-5 h-5 animate-spin" /> : 'End'}
            </button>

            {/* Video toggle button - blinks when off to remind user to turn on */}
            <button
              onClick={toggleVideo}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                isVideoOff
                  ? 'bg-red-500 text-white animate-pulse'
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
