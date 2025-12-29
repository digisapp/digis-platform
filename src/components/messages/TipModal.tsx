'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Gift, Coins, Sparkles, Zap, Crown, Star } from 'lucide-react';

interface VirtualGift {
  id: string;
  name: string;
  emoji: string;
  coinCost: number;
  animationType: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface TipModalProps {
  onClose: () => void;
  onSend: (amount: number, message: string, giftId?: string, giftEmoji?: string, giftName?: string) => Promise<void>;
  receiverName: string;
}

export function TipModal({ onClose, onSend, receiverName }: TipModalProps) {
  const [customAmount, setCustomAmount] = useState('');
  const [selectedGift, setSelectedGift] = useState<VirtualGift | null>(null);
  const [message, setMessage] = useState('');
  const [balance, setBalance] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [gifts, setGifts] = useState<VirtualGift[]>([]);
  const [loadingGifts, setLoadingGifts] = useState(true);

  useEffect(() => {
    setMounted(true);
    fetchBalance();
    fetchGifts();
  }, []);

  const fetchBalance = async () => {
    try {
      const response = await fetch('/api/user/me');
      const data = await response.json();
      if (response.ok && data.wallet) {
        setBalance(data.wallet.balance);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const fetchGifts = async () => {
    try {
      const response = await fetch('/api/gifts');
      const data = await response.json();
      setGifts(data.gifts || []);
    } catch (error) {
      console.error('Error fetching gifts:', error);
    } finally {
      setLoadingGifts(false);
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
      case 'rare': return <Zap className="w-2.5 h-2.5" />;
      case 'epic': return <Sparkles className="w-2.5 h-2.5" />;
      case 'legendary': return <Crown className="w-2.5 h-2.5" />;
      default: return <Star className="w-2.5 h-2.5" />;
    }
  };

  const handleSend = async () => {
    // Determine the amount: if gift selected use gift cost, otherwise use custom amount
    const finalAmount = selectedGift ? selectedGift.coinCost : parseInt(customAmount) || 0;

    if (finalAmount < 1) {
      setError('Please enter an amount or select a gift');
      return;
    }

    if (finalAmount > balance) {
      setError('Insufficient balance');
      return;
    }

    setSending(true);
    setError('');

    try {
      await onSend(
        finalAmount,
        message,
        selectedGift?.id,
        selectedGift?.emoji,
        selectedGift?.name
      );
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send gift');
    } finally {
      setSending(false);
    }
  };

  const finalAmount = selectedGift ? selectedGift.coinCost : parseInt(customAmount) || 0;
  const canAfford = finalAmount > 0 && finalAmount <= balance;

  if (!mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-3xl p-6 max-w-md w-full border-2 border-yellow-500/30 shadow-[0_0_50px_rgba(234,179,8,0.3)] animate-in zoom-in-95 duration-200 mx-auto max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated gradient border effect */}
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/20 to-yellow-500/0 animate-shimmer" style={{animation: 'shimmer 3s infinite'}} />
        </div>

        <div className="relative flex flex-col flex-1 min-h-0">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-0 right-0 text-gray-400 hover:text-white transition-colors z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Header - Send Gift to Username */}
          <div className="text-center mb-4">
            <div className="relative inline-block mb-3">
              <div className="absolute -inset-2 bg-yellow-500/30 rounded-full blur-xl"></div>
              <div className="relative w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-[0_0_30px_rgba(234,179,8,0.4)]">
                <Gift className="w-7 h-7 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-white via-yellow-100 to-white bg-clip-text text-transparent">
              Send Gift
            </h3>
            <p className="text-gray-400 text-sm">to {receiverName}</p>
          </div>

          {/* Balance Display */}
          <div className="flex items-center justify-center gap-2 mb-4 py-2 px-4 bg-white/5 rounded-xl border border-white/10">
            <Coins className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-gray-400">Balance:</span>
            <span className="text-sm font-bold text-yellow-500">{balance.toLocaleString()}</span>
          </div>

          {/* Coin Gift Input */}
          <div className="mb-4">
            <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">🪙 Coin Gift</label>
            <div className="relative">
              <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-500/70" />
              <input
                type="number"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setSelectedGift(null); // Clear gift selection when typing custom amount
                }}
                placeholder="Enter any amount..."
                className={`w-full bg-white/5 border rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none transition-colors ${
                  selectedGift ? 'border-white/10' : 'border-yellow-500/50'
                }`}
                min="1"
              />
            </div>
          </div>

          {/* Virtual Gifts Section */}
          <div className="mb-4 flex-1 min-h-0 flex flex-col">
            <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">🎁 Virtual Gifts</label>

            {loadingGifts ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2 overflow-y-auto max-h-[180px] pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {gifts.map((gift) => {
                  const styles = getRarityStyles(gift.rarity);
                  const isSelected = selectedGift?.id === gift.id;
                  const canAffordGift = gift.coinCost <= balance;

                  return (
                    <button
                      key={gift.id}
                      onClick={() => {
                        if (canAffordGift) {
                          setSelectedGift(gift);
                          setCustomAmount(''); // Clear custom amount when selecting gift
                        }
                      }}
                      disabled={!canAffordGift}
                      className={`relative p-2 rounded-xl border-2 transition-all duration-200 ${
                        isSelected
                          ? 'border-yellow-500 bg-yellow-500/20 scale-105 shadow-lg shadow-yellow-500/30'
                          : `${styles.border} ${styles.bg} ${canAffordGift ? `hover:scale-105 ${styles.glow}` : 'opacity-40 cursor-not-allowed'}`
                      }`}
                    >
                      {/* Rarity Badge */}
                      <div className={`absolute -top-1 -right-1 px-1 py-0.5 rounded-full text-[8px] font-bold flex items-center ${styles.badge}`}>
                        {getRarityIcon(gift.rarity)}
                      </div>

                      {/* Emoji */}
                      <div className="text-2xl mb-1">{gift.emoji}</div>

                      {/* Name */}
                      <div className="text-[10px] font-medium text-white truncate mb-0.5">
                        {gift.name}
                      </div>

                      {/* Price */}
                      <div className={`text-[10px] font-bold ${canAffordGift ? 'text-yellow-500' : 'text-red-400'}`}>
                        {gift.coinCost.toLocaleString()}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add Message (smaller) */}
          <div className="mb-4">
            <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Add Message (optional)</label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Say something nice..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition-colors"
              maxLength={200}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          {/* Send Gift Button (no cancel button) */}
          <button
            onClick={handleSend}
            disabled={sending || !canAfford}
            className="w-full py-4 rounded-xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-black hover:scale-[1.02] transition-all shadow-lg shadow-yellow-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                <span>Sending...</span>
              </>
            ) : !canAfford ? (
              finalAmount > balance ? 'Insufficient Balance' : 'Select Gift or Enter Amount'
            ) : (
              <>
                <Gift className="w-5 h-5" />
                <span>
                  Send {selectedGift ? `${selectedGift.emoji} ${selectedGift.name}` : `${finalAmount.toLocaleString()} Coins`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
