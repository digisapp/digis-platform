'use client';

import React from 'react';
import { List, Coins } from 'lucide-react';

interface MenuItem {
  id: string;
  label: string;
  emoji: string | null;
  price: number;
  description: string | null;
  itemCategory?: string;
  fulfillmentType?: string;
}

interface PinnedMenuPreviewProps {
  menuItems: MenuItem[];
  onOpenMenu: () => void;
  variant: 'mobile' | 'desktop';
}

export function PinnedMenuPreview({ menuItems, onOpenMenu, variant }: PinnedMenuPreviewProps) {
  if (variant === 'mobile') {
    return (
      <div className="px-3 pt-2 flex-shrink-0">
        <div
          className="p-3 rounded-xl bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-pink-500/20 border border-pink-400/40 cursor-pointer hover:border-pink-400/60 transition-all"
          onClick={onOpenMenu}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
              <List className="w-3 h-3 text-white" />
            </div>
            <span className="font-bold text-pink-300 text-xs">Menu</span>
          </div>
          <div className="space-y-1 ml-8">
            {menuItems.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-white/90 truncate">
                  {item.emoji || '🎁'} {item.label}
                </span>
                <span className="text-yellow-400 font-bold ml-2 flex items-center gap-0.5">
                  <Coins className="w-3 h-3" />
                  {item.price}
                </span>
              </div>
            ))}
          </div>
          {menuItems.length > 3 && (
            <div className="text-white/50 text-[10px] ml-8 mt-1">{menuItems.length - 3} more item{menuItems.length - 3 > 1 ? 's' : ''} available...</div>
          )}
        </div>
      </div>
    );
  }

  // Desktop variant
  return (
    <div className="p-3 flex-shrink-0 border-b border-pink-400/20">
      <div
        className="p-3 rounded-xl bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-pink-500/20 border border-pink-400/40 cursor-pointer hover:border-pink-400/60 transition-all"
        onClick={onOpenMenu}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center shadow-lg shadow-pink-500/30">
            <List className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-pink-300">Menu</span>
        </div>
        <div className="space-y-2 ml-10">
          {menuItems.slice(0, 3).map((item, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <span className="text-white/90 truncate">
                {item.emoji || '🎁'} {item.label}
              </span>
              <span className="text-yellow-400 font-bold ml-3 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5" />
                {item.price}
              </span>
            </div>
          ))}
        </div>
        {menuItems.length > 3 && (
          <div className="text-white/50 text-xs ml-10 mt-1">{menuItems.length - 3} more item{menuItems.length - 3 > 1 ? 's' : ''} available...</div>
        )}
      </div>
    </div>
  );
}
