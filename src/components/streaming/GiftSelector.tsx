'use client';

import { useState, useEffect, useRef } from 'react';
import type { VirtualGift } from '@/db/schema';
import { Sparkles, Zap, Crown, Star, Coins, User } from 'lucide-react';
import { useToastContext } from '@/context/ToastContext';

// Spotlighted creator info
type SpotlightedCreator = {
  creatorId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

type GiftSelectorProps = {
  streamId: string;
  onSendGift: (giftId: string, quantity: number, recipientCreatorId?: string, recipientUsername?: string) => Promise<void>;
  onSendTip?: (amount: number, recipientCreatorId?: string, recipientUsername?: string, message?: string) => Promise<void>;
  userBalance: number;
  spotlightedCreator?: SpotlightedCreator | null;
  hostName?: string; // Stream host's display name
};

export function GiftSelector({ streamId, onSendGift, onSendTip, userBalance, spotlightedCreator, hostName }: GiftSelectorProps) {
  const { showError, showInfo } = useToastContext();
  const [gifts, setGifts] = useState<VirtualGift[]>([]);
  const [selectedGift, setSelectedGift] = useState<VirtualGift | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isSending, setIsSending] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [tipAmount, setTipAmount] = useState<number | null>(null);
  const [customTipAmount, setCustomTipAmount] = useState('');
  const [tipMessage, setTipMessage] = useState('');
  // Track who receives the gift/tip: 'host' or 'spotlighted'
  const [recipient, setRecipient] = useState<'host' | 'spotlighted'>(spotlightedCreator ? 'spotlighted' : 'host');

  // Ref to scroll to send section when gift is selected
  const sendSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchGifts();
  }, []);

  // Update recipient when spotlighted creator changes
  useEffect(() => {
    if (spotlightedCreator) {
      setRecipient('spotlighted');
    } else {
      setRecipient('host');
    }
  }, [spotlightedCreator?.creatorId]);

  const fetchGifts = async () => {
    try {
      const response = await fetch('/api/gifts');
      const data = await response.json();
      setGifts(data.gifts || []);
    } catch (error) {
      console.error('Error fetching gifts:', error);
    }
  };

  const getRarityStyles = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return {
          border: 'border-gray-500/50',
          bg: 'bg-gray-500/10',
          glow: '',
          badge: 'bg-gray-500/20 text-gray-300'
        };
      case 'rare':
        return {
          border: 'border-blue-500/50',
          bg: 'bg-blue-500/10',
          glow: 'hover:shadow-blue-500/20',
          badge: 'bg-blue-500/20 text-blue-300'
        };
      case 'epic':
        return {
          border: 'border-purple-500/50',
          bg: 'bg-purple-500/10',
          glow: 'hover:shadow-purple-500/30',
          badge: 'bg-purple-500/20 text-purple-300'
        };
      case 'legendary':
        return {
          border: 'border-yellow-500/50',
          bg: 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20',
          glow: 'hover:shadow-yellow-500/40 shadow-lg shadow-yellow-500/20',
          badge: 'bg-gradient-to-r from-yellow-500/30 to-orange-500/30 text-yellow-200'
        };
      default:
        return {
          border: 'border-gray-500/50',
          bg: 'bg-gray-500/10',
          glow: '',
          badge: 'bg-gray-500/20 text-gray-300'
        };
    }
  };

  const getRarityIcon = (rarity: string) => {
    switch (rarity) {
      case 'rare': return <Zap className="w-3 h-3" />;
      case 'epic': return <Sparkles className="w-3 h-3" />;
      case 'legendary': return <Crown className="w-3 h-3" />;
      default: return <Star className="w-3 h-3" />;
    }
  };

  const handleSendGift = async () => {
    if (!selectedGift || isSending) return;

    const totalCost = selectedGift.coinCost * quantity;

    if (totalCost > userBalance) {
      showInfo('Insufficient balance! Please purchase more coins.');
      return;
    }

    setIsSending(true);
    try {
      // If recipient is spotlighted creator, pass their info
      if (recipient === 'spotlighted' && spotlightedCreator) {
        await onSendGift(selectedGift.id, quantity, spotlightedCreator.creatorId, spotlightedCreator.username);
      } else {
        await onSendGift(selectedGift.id, quantity);
      }
      setSelectedGift(null);
      setQuantity(1);
    } catch (error: any) {
      showError(error.message || 'Failed to send gift');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendTip = async () => {
    const amount = tipAmount || parseInt(customTipAmount) || 0;
    if (!amount || isSending || !onSendTip) return;

    if (amount > userBalance) {
      showInfo('Insufficient balance! Please purchase more coins.');
      return;
    }

    setIsSending(true);
    try {
      // If recipient is spotlighted creator, pass their info
      const message = tipMessage.trim() || undefined;
      if (recipient === 'spotlighted' && spotlightedCreator) {
        await onSendTip(amount, spotlightedCreator.creatorId, spotlightedCreator.username, message);
      } else {
        await onSendTip(amount, undefined, undefined, message);
      }
      setTipAmount(null);
      setCustomTipAmount('');
      setTipMessage('');
    } catch (error: any) {
      showError(error.message || 'Failed to send gift');
    } finally {
      setIsSending(false);
    }
  };

  const totalCost = selectedGift ? selectedGift.coinCost * quantity : 0;
  const canAfford = totalCost <= userBalance;
  const currentTipAmount = tipAmount || parseInt(customTipAmount) || 0;
  const canAffordTip = currentTipAmount > 0 && currentTipAmount <= userBalance;

  // Group gifts by rarity for filtering
  const categories = ['tip', 'all', 'common', 'rare', 'epic', 'legendary'];
  const filteredGifts = activeCategory === 'all' || activeCategory === 'tip'
    ? gifts
    : gifts.filter(g => g.rarity === activeCategory);

  return (
    <div className="space-y-4">
      {/* Recipient Selector - Only show when there's a spotlighted creator */}
      {spotlightedCreator && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Send to:</p>
          <div className="grid grid-cols-2 gap-2">
            {/* Spotlighted Creator Option */}
            <button
              onClick={() => setRecipient('spotlighted')}
              className={`p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                recipient === 'spotlighted'
                  ? 'border-yellow-500 bg-yellow-500/20 shadow-lg shadow-yellow-500/20'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              {spotlightedCreator.avatarUrl ? (
                <img
                  src={spotlightedCreator.avatarUrl}
                  alt={spotlightedCreator.username}
                  className="w-10 h-10 rounded-full object-cover border-2 border-yellow-500"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500/30 to-orange-500/30 flex items-center justify-center border-2 border-yellow-500">
                  <User className="w-5 h-5 text-yellow-400" />
                </div>
              )}
              <div className="text-left flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  <span className="text-xs text-yellow-400 font-bold uppercase">Spotlight</span>
                </div>
                <div className="font-semibold text-white text-sm truncate">
                  {spotlightedCreator.displayName || spotlightedCreator.username}
                </div>
              </div>
            </button>

            {/* Host Option */}
            <button
              onClick={() => setRecipient('host')}
              className={`p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                recipient === 'host'
                  ? 'border-cyan-500 bg-cyan-500/20 shadow-lg shadow-cyan-500/20'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30 flex items-center justify-center border-2 border-cyan-500">
                <Crown className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <Crown className="w-3 h-3 text-cyan-400" />
                  <span className="text-xs text-cyan-400 font-bold uppercase">Host</span>
                </div>
                <div className="font-semibold text-white text-sm truncate">
                  {hostName || 'Stream Host'}
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => {
              setActiveCategory(cat);
              setSelectedGift(null);
              setTipAmount(null);
              setCustomTipAmount('');
              setTipMessage('');
            }}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeCategory === cat
                ? cat === 'tip'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                  : 'bg-gradient-to-r from-digis-cyan to-digis-pink text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            {cat === 'tip' && <Coins className="w-4 h-4" />}
            {cat === 'tip' ? 'Coin Gift' : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Coin Gift UI */}
      {activeCategory === 'tip' && onSendTip && (
        <div className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl border-2 border-green-500/30 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-bold text-white">Send Coins</div>
              <div className="text-sm text-green-400">Gift the creator directly</div>
            </div>
          </div>

          {/* Quick Gift Amounts */}
          <div className="grid grid-cols-4 gap-2">
            {[10, 50, 100, 500].map(amount => (
              <button
                key={amount}
                onClick={() => {
                  setTipAmount(amount);
                  setCustomTipAmount('');
                }}
                disabled={amount > userBalance}
                className={`py-3 rounded-xl font-bold text-sm transition-all ${
                  tipAmount === amount
                    ? 'bg-green-500 text-white scale-105 shadow-lg shadow-green-500/30'
                    : amount <= userBalance
                      ? 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                      : 'bg-white/5 text-gray-500 cursor-not-allowed'
                }`}
              >
                {amount}
              </button>
            ))}
          </div>

          {/* Custom Amount */}
          <div className="flex gap-2">
            <input
              type="number"
              value={customTipAmount}
              onChange={(e) => {
                setCustomTipAmount(e.target.value);
                setTipAmount(null);
              }}
              placeholder="Custom amount..."
              className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50"
            />
          </div>

          {/* Optional Message */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1">
              💬 Add a message <span className="text-gray-500">(optional)</span>
            </label>
            <textarea
              value={tipMessage}
              onChange={(e) => setTipMessage(e.target.value)}
              placeholder="Say something to the creator..."
              maxLength={200}
              rows={2}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 resize-none"
            />
            {tipMessage && (
              <div className="text-xs text-amber-400 flex items-center gap-1">
                ✨ Your message will be highlighted in chat!
              </div>
            )}
          </div>

          {/* Send Gift Button */}
          <button
            onClick={handleSendTip}
            disabled={!canAffordTip || isSending}
            className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-xl font-bold text-white hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-green-500/30"
          >
            <Coins className="w-5 h-5" />
            {isSending ? 'Sending...' : !canAffordTip ? (currentTipAmount > userBalance ? 'Insufficient Balance' : 'Enter Amount') : `Send ${currentTipAmount} Coins`}
          </button>
        </div>
      )}

      {/* Gift Grid - hide when on tip tab */}
      {activeCategory !== 'tip' && (
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[300px] overflow-y-auto pr-1">
        {filteredGifts.map((gift) => {
          const styles = getRarityStyles(gift.rarity);
          const isSelected = selectedGift?.id === gift.id;
          const canAffordGift = gift.coinCost <= userBalance;

          return (
            <button
              key={gift.id}
              onClick={() => {
                if (canAffordGift) {
                  setSelectedGift(gift);
                  // Auto-scroll to send section after a brief delay for render
                  setTimeout(() => {
                    sendSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }, 100);
                }
              }}
              disabled={!canAffordGift}
              className={`relative p-3 rounded-xl border-2 transition-all duration-200 ${
                isSelected
                  ? 'border-digis-cyan bg-digis-cyan/20 scale-105 shadow-lg shadow-digis-cyan/30'
                  : `${styles.border} ${styles.bg} ${canAffordGift ? `hover:scale-105 ${styles.glow}` : 'opacity-40 cursor-not-allowed'}`
              }`}
            >
              {/* Rarity Badge */}
              <div className={`absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-0.5 ${styles.badge}`}>
                {getRarityIcon(gift.rarity)}
              </div>

              {/* Emoji */}
              <div className="text-3xl mb-2">{gift.emoji}</div>

              {/* Name */}
              <div className="text-xs font-semibold text-white truncate mb-1">
                {gift.name}
              </div>

              {/* Price */}
              <div className={`text-xs font-bold ${canAffordGift ? 'text-digis-cyan' : 'text-red-400'}`}>
                {gift.coinCost.toLocaleString()}
              </div>
            </button>
          );
        })}
      </div>
      )}

      {/* Selected Gift & Quantity */}
      {selectedGift && activeCategory !== 'tip' && (
        <div ref={sendSectionRef} className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-4">
          {/* Selected Gift Preview */}
          <div className="flex items-center gap-4">
            <div className="text-4xl">{selectedGift.emoji}</div>
            <div className="flex-1">
              <div className="font-bold text-white">{selectedGift.name}</div>
              <div className="text-sm text-digis-cyan">{selectedGift.coinCost} coins each</div>
            </div>
          </div>

          {/* Quantity Selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">Qty:</span>
            <div className="flex items-center gap-2 flex-1">
              {[1, 5, 10, 25].map(q => (
                <button
                  key={q}
                  onClick={() => setQuantity(q)}
                  className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${
                    quantity === q
                      ? 'bg-digis-cyan text-black'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Total & Send */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <div>
              <div className="text-sm text-gray-400">Total</div>
              <div className={`text-xl font-bold ${canAfford ? 'text-digis-cyan' : 'text-red-400'}`}>
                {totalCost.toLocaleString()} coins
              </div>
            </div>
            <button
              onClick={handleSendGift}
              disabled={!canAfford || isSending}
              className="px-6 py-3 bg-gradient-to-r from-digis-pink to-digis-purple rounded-xl font-bold text-white hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
            >
              {isSending ? 'Sending...' : !canAfford ? 'Insufficient' : `Send ${selectedGift.emoji}`}
            </button>
          </div>
        </div>
      )}

      {/* No gift selected hint */}
      {!selectedGift && activeCategory !== 'tip' && (
        <div className="text-center py-4 text-gray-500 text-sm">
          Select a gift above to send
        </div>
      )}
    </div>
  );
}
