'use client';

import { useState } from 'react';
import { Coins, List, X } from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  emoji: string | null;
  price: number;
  description: string | null;
  itemCategory?: string;
  fulfillmentType?: string;
}

interface MenuModalProps {
  creatorUsername: string;
  userBalance: number;
  menuItems: MenuItem[];
  onPurchase: (price: number, note: string | undefined, item: { id: string; label: string; price: number; fulfillmentType?: string }) => Promise<void>;
  onClose: () => void;
  onBuyCoins: () => void;
}

export function MenuModal({ creatorUsername, userBalance, menuItems, onPurchase, onClose, onBuyCoins }: MenuModalProps) {
  const [selectedMenuItem, setSelectedMenuItem] = useState<{ id: string; label: string; price: number; fulfillmentType?: string } | null>(null);
  const [menuNote, setMenuNote] = useState('');

  const handleClose = () => {
    setSelectedMenuItem(null);
    setMenuNote('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-safe" role="dialog" aria-modal="true" aria-label="Creator menu">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={handleClose}
      />
      {/* Modal */}
      <div className="relative w-full max-w-sm bg-gradient-to-br from-purple-900/95 via-black/98 to-pink-900/95 rounded-2xl border-2 border-pink-400/60 shadow-[0_0_60px_rgba(236,72,153,0.4)] p-6 animate-slideUp">
        {/* Corner accents - Pink style */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-pink-400 rounded-tl-xl" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-pink-400 rounded-tr-xl" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-pink-400 rounded-bl-xl" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-pink-400 rounded-br-xl" />

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex justify-center mb-4">
          <div className="px-4 py-1.5 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-pink-500/30">
            <List className="w-4 h-4" />
            MENU
          </div>
        </div>

        {/* Creator Name */}
        <p className="text-white/80 text-center text-sm mb-4">
          Purchase from <span className="font-bold text-pink-300">@{creatorUsername}</span>
        </p>

        {/* Balance Display */}
        <div className="flex items-center justify-center gap-2 mb-4 text-sm">
          <Coins className="w-4 h-4 text-yellow-400" />
          <span className="text-white">Your balance: <span className="font-bold text-yellow-400">{userBalance.toLocaleString()}</span></span>
        </div>

        {/* Menu Items Grid */}
        <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedMenuItem({ id: item.id, label: item.label, price: item.price, fulfillmentType: item.fulfillmentType })}
              disabled={userBalance < item.price}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                selectedMenuItem?.id === item.id
                  ? 'bg-pink-500/30 border-2 border-pink-400 shadow-[0_0_20px_rgba(236,72,153,0.3)]'
                  : 'bg-white/5 hover:bg-white/10 border-2 border-transparent'
              } ${userBalance < item.price ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <span className="text-2xl">{item.emoji || '🎁'}</span>
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium truncate">{item.label}</div>
                {item.description && (
                  <div className="text-gray-400 text-xs truncate">{item.description}</div>
                )}
              </div>
              <div className="flex items-center gap-1 text-yellow-400 font-bold">
                <Coins className="w-4 h-4" />
                {item.price}
              </div>
            </button>
          ))}
        </div>

        {/* Optional Note - shows when item is selected */}
        {selectedMenuItem && (
          <div className="mb-4">
            <label className="block text-pink-300 text-xs font-semibold mb-1.5">
              Message to Creator <span className="text-white/40">(optional)</span>
            </label>
            <textarea
              value={menuNote}
              onChange={(e) => setMenuNote(e.target.value.slice(0, 300))}
              placeholder={
                selectedMenuItem.fulfillmentType === 'manual'
                  ? "Add details (shipping address, special requests, etc.)..."
                  : "Say thanks or add a message..."
              }
              rows={2}
              className="w-full px-3 py-2 bg-white/10 border border-pink-400/40 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-pink-400 focus:shadow-[0_0_15px_rgba(236,72,153,0.2)] transition-all resize-none text-sm"
            />
            <div className="flex justify-end mt-1">
              <span className="text-xs text-white/40">{menuNote.length}/300</span>
            </div>
          </div>
        )}

        {/* Purchase Button */}
        <button
          onClick={async () => {
            if (selectedMenuItem && userBalance >= selectedMenuItem.price) {
              await onPurchase(selectedMenuItem.price, menuNote || undefined, selectedMenuItem);
              handleClose();
            }
          }}
          disabled={!selectedMenuItem || userBalance < (selectedMenuItem?.price || 0)}
          className="w-full py-4 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 hover:from-pink-400 hover:via-purple-400 hover:to-pink-400 rounded-xl font-bold text-white text-lg transition-all hover:scale-105 shadow-lg shadow-pink-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <Coins className="w-5 h-5" />
          {selectedMenuItem ? `Purchase for ${selectedMenuItem.price} Coins` : 'Select an Item'}
        </button>

        {/* Buy More Coins Link */}
        {selectedMenuItem && userBalance < selectedMenuItem.price && (
          <button
            onClick={() => {
              handleClose();
              onBuyCoins();
            }}
            className="w-full mt-2 text-center text-pink-400 hover:text-pink-300 text-sm"
          >
            Need more coins? Buy now →
          </button>
        )}

        {/* Cancel text */}
        <p className="text-center text-gray-500 text-xs mt-3">
          Tap outside to cancel
        </p>
      </div>
    </div>
  );
}
