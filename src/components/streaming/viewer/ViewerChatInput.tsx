'use client';

import React from 'react';
import { Send, Coins, Ticket } from 'lucide-react';

interface ViewerChatInputProps {
  messageInput: string;
  onMessageChange: (msg: string) => void;
  onSend: () => void;
  sendingMessage: boolean;
  currentUser: any;
  userBalance: number;
  ticketedModeActive: boolean;
  hasTicket: boolean;
  onBuyCoins: () => void;
  onLogin: () => void;
  variant: 'mobile' | 'desktop';
}

export function ViewerChatInput({
  messageInput,
  onMessageChange,
  onSend,
  sendingMessage,
  currentUser,
  userBalance,
  ticketedModeActive,
  hasTicket,
  onBuyCoins,
  onLogin,
  variant,
}: ViewerChatInputProps) {
  if (variant === 'mobile') {
    return (
      <div className="px-3 py-2 border-t border-cyan-400/20 bg-black/60 pb-[calc(60px+env(safe-area-inset-bottom))]">
        {/* Ticketed Mode - Chat disabled for non-ticket holders */}
        {ticketedModeActive && !hasTicket ? (
          <div className="flex items-center justify-center gap-3 py-3">
            <Ticket className="w-5 h-5 text-amber-400" />
            <span className="text-amber-300 font-medium">Buy a ticket to chat</span>
          </div>
        ) : currentUser ? (
          userBalance > 0 ? (
            <div className="space-y-2">
              {/* Balance indicator */}
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] text-white/50">Chat is free for coin holders</span>
                <button
                  onClick={onBuyCoins}
                  className="flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300"
                >
                  <Coins className="w-3 h-3" />
                  <span className="font-semibold">{userBalance.toLocaleString()}</span>
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => onMessageChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onSend()}
                  placeholder="Say something..."
                  disabled={sendingMessage}
                  className="flex-1 px-4 py-3 bg-white/10 border border-cyan-400/30 rounded-full text-white placeholder-white/50 focus:outline-none focus:border-cyan-400 disabled:opacity-50 text-[16px]"
                />
                <button
                  onClick={onSend}
                  disabled={!messageInput.trim() || sendingMessage}
                  className="min-w-[48px] min-h-[48px] p-3 bg-gradient-to-r from-digis-cyan to-digis-pink rounded-full disabled:opacity-50 flex items-center justify-center shadow-lg shadow-cyan-500/30"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 py-2">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                <span className="text-amber-300 font-medium text-sm">Buy coins to chat</span>
              </div>
              <button
                onClick={onBuyCoins}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold rounded-full text-sm shadow-lg"
              >
                Get Coins
              </button>
            </div>
          )
        ) : (
          <div className="flex items-center justify-center gap-2 py-3 text-sm">
            <button
              onClick={onLogin}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-full shadow-lg"
            >
              Sign in
            </button>{' '}
            to chat
          </div>
        )}
      </div>
    );
  }

  // Desktop variant
  return (
    <div className="p-4 pb-20 lg:pb-4 border-t border-cyan-400/20 bg-gradient-to-r from-cyan-500/5 to-pink-500/5 backdrop-blur-xl">
      {/* Ticketed Mode - Chat disabled for non-ticket holders */}
      {ticketedModeActive && !hasTicket ? (
        <div className="text-center py-3">
          <div className="px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <p className="text-amber-300 font-medium">
              <Ticket className="w-4 h-4 inline mr-1" />
              Buy a ticket to chat
            </p>
          </div>
        </div>
      ) : currentUser ? (
        userBalance > 0 ? (
          <div className="space-y-2">
            {/* Balance indicator - desktop */}
            <div className="hidden lg:flex items-center justify-between px-1">
              <span className="text-xs text-white/50">Chat is free for coin holders</span>
              <button
                onClick={onBuyCoins}
                className="flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
              >
                <Coins className="w-3 h-3" />
                <span className="font-semibold">{userBalance.toLocaleString()}</span>
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => onMessageChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onSend()}
                placeholder="Send a message..."
                disabled={sendingMessage}
                className="flex-1 px-4 py-3 bg-white/10 border border-cyan-400/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(34,211,238,0.3)] disabled:opacity-50 backdrop-blur-sm transition-all text-base"
              />
              <button
                onClick={onSend}
                disabled={!messageInput.trim() || sendingMessage}
                className="px-4 py-3 bg-gradient-to-r from-digis-cyan to-digis-pink rounded-lg font-semibold hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center text-sm pb-12 lg:pb-0">
            <div className="px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-amber-300 font-medium">
                <Coins className="w-4 h-4 inline mr-1" />
                Buy coins to chat
              </p>
              <button
                onClick={onBuyCoins}
                className="mt-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold rounded-full text-sm transition-all hover:scale-105"
              >
                Get Coins
              </button>
            </div>
          </div>
        )
      ) : (
        <div className="text-center py-3">
          <button
            onClick={onLogin}
            className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-full shadow-lg hover:scale-105 transition-all"
          >
            Sign in to chat
          </button>
        </div>
      )}
    </div>
  );
}
