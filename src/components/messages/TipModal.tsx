'use client';

import { useState, useEffect } from 'react';
import { GlassButton } from '@/components/ui/GlassButton';

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

  useEffect(() => {
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

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-gray-900 to-black border border-white/20 rounded-2xl p-6 max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Send Tip 💰</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Receiver */}
        <div className="mb-6">
          <p className="text-gray-400 text-sm mb-2">Sending to</p>
          <p className="text-white font-semibold text-lg">{receiverName}</p>
        </div>

        {/* Balance */}
        <div className="bg-white/5 rounded-lg p-3 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Your Balance</span>
            <span className="text-yellow-400 font-bold">{balance} coins</span>
          </div>
        </div>

        {/* Preset Amounts */}
        <div className="mb-6">
          <p className="text-gray-400 text-sm mb-3">Choose amount</p>
          <div className="grid grid-cols-3 gap-2">
            {PRESET_AMOUNTS.map((preset) => (
              <button
                key={preset}
                onClick={() => {
                  setAmount(preset);
                  setCustomAmount('');
                }}
                className={`py-3 rounded-lg font-semibold transition-all ${
                  amount === preset && !customAmount
                    ? 'bg-gradient-to-r from-digis-cyan to-digis-pink text-black'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Amount */}
        <div className="mb-6">
          <p className="text-gray-400 text-sm mb-2">Or enter custom amount</p>
          <input
            type="number"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder="Enter amount..."
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-digis-cyan transition-colors"
            min="1"
          />
        </div>

        {/* Optional Message */}
        <div className="mb-6">
          <p className="text-gray-400 text-sm mb-2">Add a message (optional)</p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Say something nice..."
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-digis-cyan transition-colors resize-none"
            rows={3}
            maxLength={200}
          />
          <p className="text-xs text-gray-500 mt-1 text-right">{message.length}/200</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-white/10 rounded-lg font-semibold hover:bg-white/20 transition-colors"
          >
            Cancel
          </button>
          <GlassButton
            variant="gradient"
            size="lg"
            onClick={handleSend}
            disabled={sending || (!customAmount && !amount) || (!!customAmount && parseInt(customAmount) < 1)}
            className="flex-1"
            shimmer
          >
            {sending ? 'Sending...' : `Send ${customAmount || amount} coins`}
          </GlassButton>
        </div>
      </div>
    </div>
  );
}
