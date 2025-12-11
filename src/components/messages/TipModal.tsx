'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Gift } from 'lucide-react';

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
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-3xl p-8 max-w-sm w-full border-2 border-yellow-500/30 shadow-[0_0_50px_rgba(234,179,8,0.3)] animate-in zoom-in-95 duration-200 mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated gradient border effect */}
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/20 to-yellow-500/0 animate-shimmer" style={{animation: 'shimmer 3s infinite'}} />
        </div>

        <div className="relative">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-0 right-0 text-gray-400 hover:text-white transition-colors z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Icon and Title */}
          <div className="text-center mb-6">
            <div className="relative inline-block mb-4">
              <div className="absolute -inset-2 bg-yellow-500/30 rounded-full blur-xl"></div>
              <div className="relative w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-[0_0_30px_rgba(234,179,8,0.4)]">
                <Gift className="w-8 h-8 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-white via-yellow-100 to-white bg-clip-text text-transparent mb-1">
              Send Tip
            </h3>
            <p className="text-gray-400 text-sm">to {receiverName}</p>
          </div>

          {/* Preset Amounts - Tron Style */}
          <div className="mb-4">
            <div className="grid grid-cols-3 gap-2">
              {PRESET_AMOUNTS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    setAmount(preset);
                    setCustomAmount('');
                  }}
                  className={`py-3 rounded-xl font-semibold text-sm transition-all ${
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
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition-colors"
              min="1"
            />
          </div>

          {/* Optional Message */}
          <div className="mb-4">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a message (optional)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition-colors resize-none"
              rows={2}
              maxLength={200}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          {/* Action Buttons - Tron Style */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl font-semibold bg-white/5 hover:bg-white/10 text-gray-300 transition-all border border-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || (!customAmount && !amount) || (!!customAmount && parseInt(customAmount) < 1)}
              className="flex-1 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-yellow-500 to-orange-500 text-black hover:scale-105 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {sending ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  <span>Sending...</span>
                </div>
              ) : (
                `Send ${customAmount || amount}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
