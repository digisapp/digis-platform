'use client';

import React from 'react';
import Image from 'next/image';
import { Coins, Ticket } from 'lucide-react';

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  content: string;
  timestamp: number;
  isCreator?: boolean;
  isModerator?: boolean;
  messageType?: 'chat' | 'tip' | 'gift' | 'ticket_purchase' | 'menu_purchase' | 'menu_order' | 'menu_tip';
  tipAmount?: number;
  giftEmoji?: string;
  giftName?: string;
  giftQuantity?: number;
  ticketPrice?: number;
  showTitle?: string;
}

interface ViewerChatMessagesProps {
  messages: ChatMessage[];
  chatContainerRef: React.RefObject<HTMLDivElement>;
  variant: 'mobile' | 'desktop';
}

function MessageAvatar({ msg, size, variant }: { msg: ChatMessage; size: 'sm' | 'md'; variant: 'mobile' | 'desktop' }) {
  const px = size === 'sm' ? 24 : 32;
  const cls = size === 'sm' ? 'w-6 h-6' : 'w-8 h-8';

  if (msg.avatarUrl) {
    return (
      <Image
        src={msg.avatarUrl}
        alt={msg.username}
        width={px}
        height={px}
        className={`${cls} rounded-full object-cover flex-shrink-0 ${variant === 'desktop' && size === 'md' ? 'ring-2 ring-cyan-400/30' : ''}`}
        unoptimized
      />
    );
  }

  return null;
}

function TipMessage({ msg, variant }: { msg: ChatMessage; variant: 'mobile' | 'desktop' }) {
  const px = variant === 'mobile' ? 24 : 24;
  const cls = variant === 'mobile'
    ? 'flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30'
    : 'p-3 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/40 shadow-[0_0_15px_rgba(34,197,94,0.2)]';

  return (
    <div key={msg.id} className={cls}>
      <div className={variant === 'desktop' ? 'flex items-center gap-2' : 'contents'}>
        {msg.avatarUrl ? (
          <Image src={msg.avatarUrl} alt={msg.username} width={px} height={px} className="w-6 h-6 rounded-full object-cover" unoptimized />
        ) : (
          <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${variant === 'mobile' ? 'bg-green-400 text-[10px] text-green-900' : 'bg-gradient-to-br from-green-400 to-emerald-400 text-xs'}`}>
            {msg.username?.[0]?.toUpperCase() || '?'}
          </div>
        )}
        <span className={`font-bold text-green-300 ${variant === 'mobile' ? 'text-xs' : ''}`}>@{msg.username}</span>
        <Coins className={`${variant === 'mobile' ? 'w-3 h-3' : 'w-4 h-4'} text-green-400`} />
        <span className={`font-bold text-green-400 ${variant === 'mobile' ? 'text-xs' : ''}`}>{msg.tipAmount}</span>
      </div>
    </div>
  );
}

function GiftMessage({ msg, variant }: { msg: ChatMessage; variant: 'mobile' | 'desktop' }) {
  const px = 24;
  const cls = variant === 'mobile'
    ? 'flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30'
    : 'p-3 rounded-xl bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/40 shadow-[0_0_15px_rgba(236,72,153,0.2)]';

  return (
    <div key={msg.id} className={cls}>
      <div className={variant === 'desktop' ? 'flex items-center gap-2' : 'contents'}>
        {msg.avatarUrl ? (
          <Image src={msg.avatarUrl} alt={msg.username} width={px} height={px} className="w-6 h-6 rounded-full object-cover" unoptimized />
        ) : (
          <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${variant === 'mobile' ? 'bg-pink-400 text-[10px] text-pink-900' : 'bg-gradient-to-br from-pink-400 to-purple-400 text-xs'}`}>
            {msg.username?.[0]?.toUpperCase() || '?'}
          </div>
        )}
        <span className={`font-bold text-pink-300 ${variant === 'mobile' ? 'text-xs' : ''}`}>@{msg.username}</span>
        {msg.giftName ? (
          <>
            <span className={`text-white/70 ${variant === 'mobile' ? 'text-xs' : ''}`}>sent</span>
            {msg.giftQuantity && msg.giftQuantity > 1 && (
              <span className={`font-bold text-pink-400 ${variant === 'mobile' ? 'text-xs' : ''}`}>{msg.giftQuantity}x</span>
            )}
            <span className={variant === 'mobile' ? 'text-base' : 'text-xl'}>{msg.giftEmoji}</span>
            <span className={`font-bold ${variant === 'mobile' ? 'text-pink-200 text-xs' : 'text-pink-400'}`}>{msg.giftName}</span>
          </>
        ) : (
          <span className={`text-white/90 ${variant === 'mobile' ? 'text-xs' : ''}`}>{msg.content}</span>
        )}
      </div>
    </div>
  );
}

function TicketPurchaseMessage({ msg, variant }: { msg: ChatMessage; variant: 'mobile' | 'desktop' }) {
  const px = 24;
  const cls = variant === 'mobile'
    ? 'flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30'
    : 'p-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]';

  return (
    <div key={msg.id} className={cls}>
      <div className={variant === 'desktop' ? 'flex items-center gap-2' : 'contents'}>
        {msg.avatarUrl ? (
          <Image src={msg.avatarUrl} alt={msg.username} width={px} height={px} className="w-6 h-6 rounded-full object-cover" unoptimized />
        ) : (
          <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${variant === 'mobile' ? 'bg-amber-400 text-[10px] text-amber-900' : 'bg-gradient-to-br from-amber-400 to-yellow-400 text-xs text-black'}`}>
            {msg.username?.[0]?.toUpperCase() || '?'}
          </div>
        )}
        <span className={`font-bold text-amber-300 ${variant === 'mobile' ? 'text-xs' : ''}`}>@{msg.username}</span>
        <span className={`text-white/70 ${variant === 'mobile' ? 'text-xs' : ''}`}>bought a ticket</span>
        <Ticket className={`${variant === 'mobile' ? 'w-3 h-3' : 'w-4 h-4'} text-amber-400`} />
        {variant === 'desktop' && msg.ticketPrice && (
          <>
            <Coins className="w-3 h-3 text-amber-400" />
            <span className="font-bold text-amber-400">{msg.ticketPrice}</span>
          </>
        )}
      </div>
    </div>
  );
}

function MenuPurchaseMessage({ msg, variant }: { msg: ChatMessage; variant: 'mobile' | 'desktop' }) {
  if (variant === 'mobile') {
    // Mobile: simplified inline display (matches existing mobile chat style)
    return (
      <div key={msg.id} className="flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
        {msg.avatarUrl ? (
          <Image src={msg.avatarUrl} alt={msg.username} width={24} height={24} className="w-6 h-6 rounded-full object-cover" unoptimized />
        ) : (
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-[10px] font-bold">
            {msg.username?.[0]?.toUpperCase() || '?'}
          </div>
        )}
        <span className="font-bold text-purple-300 text-xs">@{msg.username}</span>
        <span className="text-white/90 text-xs truncate">{msg.content}</span>
      </div>
    );
  }

  // Desktop: richer layout
  return (
    <div key={msg.id} className="p-3 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
      <div className="flex items-start gap-2">
        {msg.avatarUrl ? (
          <Image src={msg.avatarUrl} alt={msg.username} width={24} height={24} className="w-6 h-6 rounded-full object-cover" unoptimized />
        ) : (
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-xs font-bold">
            {msg.username?.[0]?.toUpperCase() || '?'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <span className="font-bold text-purple-300">@{msg.username}</span>
          <p className="text-sm text-white/90 mt-0.5">{msg.content}</p>
          {msg.tipAmount && (
            <div className="flex items-center gap-1 mt-1">
              <Coins className="w-3 h-3 text-purple-400" />
              <span className="font-bold text-purple-400">{msg.tipAmount}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RegularMessage({ msg, variant }: { msg: ChatMessage; variant: 'mobile' | 'desktop' }) {
  if (variant === 'mobile') {
    return (
      <div key={msg.id} className="flex gap-2">
        {msg.avatarUrl ? (
          <Image src={msg.avatarUrl} alt={msg.username} width={24} height={24} className="w-6 h-6 rounded-full object-cover flex-shrink-0" unoptimized />
        ) : (
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-pink-400 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
            {msg.username?.[0]?.toUpperCase() || '?'}
          </div>
        )}
        <div className="min-w-0">
          <span className={`font-bold text-xs ${msg.isCreator ? 'text-yellow-400' : 'text-cyan-300'}`}>
            @{msg.username}
          </span>
          {msg.isCreator && (
            <span className="ml-1 text-[9px] px-1 py-0.5 bg-yellow-500/30 text-yellow-300 rounded">Creator</span>
          )}
          <p className="text-white text-xs break-words">{msg.content}</p>
        </div>
      </div>
    );
  }

  // Desktop
  return (
    <div key={msg.id} className="flex gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors">
      {msg.avatarUrl ? (
        <Image
          src={msg.avatarUrl}
          alt={msg.username}
          width={32}
          height={32}
          className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-2 ring-cyan-400/30"
          unoptimized
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-lg shadow-cyan-500/30">
          {msg.username?.[0]?.toUpperCase() || '?'}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-bold ${
              msg.isCreator ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'text-cyan-100'
            }`}
          >
            @{msg.username}
          </span>
          {msg.isCreator && (
            <span className="text-xs px-1.5 py-0.5 bg-gradient-to-r from-yellow-500/30 to-amber-500/30 text-yellow-300 rounded border border-yellow-400/30 font-semibold">
              Creator
            </span>
          )}
          {msg.isModerator && (
            <span className="text-xs px-1.5 py-0.5 bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-purple-300 rounded border border-purple-400/30 font-semibold">
              Mod
            </span>
          )}
        </div>
        <p className="text-sm text-white/95 break-words leading-relaxed">
          {msg.content}
        </p>
      </div>
    </div>
  );
}

function ChatMessageItem({ msg, variant }: { msg: ChatMessage; variant: 'mobile' | 'desktop' }) {
  switch (msg.messageType) {
    case 'tip':
      return <TipMessage msg={msg} variant={variant} />;
    case 'gift':
      return <GiftMessage msg={msg} variant={variant} />;
    case 'ticket_purchase':
      return <TicketPurchaseMessage msg={msg} variant={variant} />;
    case 'menu_purchase':
    case 'menu_order':
    case 'menu_tip':
      return <MenuPurchaseMessage msg={msg} variant={variant} />;
    default:
      return <RegularMessage msg={msg} variant={variant} />;
  }
}

export function ViewerChatMessages({ messages, chatContainerRef, variant }: ViewerChatMessagesProps) {
  const containerClass = variant === 'mobile'
    ? 'flex-1 overflow-y-auto px-3 py-2 space-y-2 max-h-[35dvh] min-h-[150px] landscape:max-h-[45dvh] landscape:min-h-[120px]'
    : 'flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-cyan-500/5 to-transparent';

  const emptyClass = variant === 'mobile'
    ? 'text-center text-gray-400 text-xs py-4'
    : 'text-center text-gray-400 text-sm mt-10 font-medium';

  return (
    <div ref={chatContainerRef} className={containerClass}>
      {messages.length === 0 ? (
        <div className={emptyClass}>
          No messages yet. Be the first to chat!
        </div>
      ) : (
        messages.map((msg) => (
          <ChatMessageItem key={msg.id} msg={msg} variant={variant} />
        ))
      )}
    </div>
  );
}
