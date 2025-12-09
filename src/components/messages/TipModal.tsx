'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface TipModalProps {
  onClose: () => void;
  onSend: (amount: number, message: string) => Promise<void>;
  receiverName: string;
}

const PRESET_AMOUNTS = [10, 25, 50, 100, 200, 500];

export function TipModal({ onClose, onSend, receiverName }: TipModalProps) {
  const [amount, setAmount] = useState(25);
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [balance, setBalance] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchBalance();
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

  const handleSend = async () => {
    const finalAmount = customAmount ? parseInt(customAmount) : amount;

    if (finalAmount < 1) {
      setError('Tip amount must be at least 1 coin');
      return;
    }

    if (finalAmount > balance) {
      setError('Insufficient balance');
      return;
    }

    setSending(true);
    setError('');

    try {
      await onSend(finalAmount, message);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send tip');
    } finally {
      setSending(false);
    }
  };

  if (!mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm bg-black/95 rounded-2xl p-5 border border-yellow-500/50 shadow-[0_0_40px_rgba(234,179,8,0.3),inset_0_0_30px_rgba(234,179,8,0.05)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated glow */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-yellow-500/10 blur-xl -z-10" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 hover:bg-yellow-500/20 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-yellow-400" />
        </button>

        {/* Header */}
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
            Send Tip
          </h2>
          <p className="text-gray-400 text-sm mt-1">to {receiverName}</p>
        </div>

        {/* Preset Amounts */}
        <div className="mb-4">
          <div className="grid grid-cols-3 gap-2">
            {PRESET_AMOUNTS.map((preset) => (
              <button
                key={preset}
                onClick={() => {
                  setAmount(preset);
                  setCustomAmount('');
                }}
                className={`py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  amount === preset && !customAmount
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)]'
                    : 'bg-white/5 text-white border border-white/10 hover:border-yellow-500/50'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Amount */}
        <div className="mb-4">
          <input
            type="number"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder="Custom amount..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition-colors"
            min="1"
          />
        </div>

        {/* Optional Message */}
        <div className="mb-4">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a message (optional)"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition-colors resize-none"
            rows={2}
            maxLength={200}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs text-center">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl font-semibold text-sm text-gray-300 hover:bg-white/10 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || (!customAmount && !amount) || (!!customAmount && parseInt(customAmount) < 1)}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl font-semibold text-sm text-black hover:scale-[1.02] transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)] disabled:opacity-50 disabled:hover:scale-100"
          >
            {sending ? 'Sending...' : `Send ${customAmount || amount} coins`}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
