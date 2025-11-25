'use client';

import { useState, useEffect } from 'react';
import { GlassModal, GlassButton, LoadingSpinner } from '@/components/ui';

interface BankingInfo {
  id: string;
  accountHolderName: string;
  accountType: string;
  bankName: string | null;
  lastFourDigits: string;
  isVerified: boolean;
}

interface BankingInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  existingInfo?: BankingInfo | null;
}

export function BankingInfoModal({ isOpen, onClose, onSuccess, existingInfo }: BankingInfoModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    accountHolderName: '',
    accountType: 'checking',
    routingNumber: '',
    accountNumber: '',
    confirmAccountNumber: '',
    bankName: '',
  });

  // Populate form if editing
  useEffect(() => {
    if (existingInfo) {
      setFormData({
        accountHolderName: existingInfo.accountHolderName,
        accountType: existingInfo.accountType,
        routingNumber: '',
        accountNumber: '',
        confirmAccountNumber: '',
        bankName: existingInfo.bankName || '',
      });
    } else {
      setFormData({
        accountHolderName: '',
        accountType: 'checking',
        routingNumber: '',
        accountNumber: '',
        confirmAccountNumber: '',
        bankName: '',
      });
    }
    setError('');
  }, [existingInfo, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.accountHolderName.trim()) {
      setError('Account holder name is required');
      return;
    }

    if (!formData.routingNumber.trim() || formData.routingNumber.length !== 9) {
      setError('Routing number must be 9 digits');
      return;
    }

    if (!formData.accountNumber.trim() || formData.accountNumber.length < 4) {
      setError('Account number must be at least 4 digits');
      return;
    }

    if (formData.accountNumber !== formData.confirmAccountNumber) {
      setError('Account numbers do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/wallet/banking-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountHolderName: formData.accountHolderName,
          accountType: formData.accountType,
          routingNumber: formData.routingNumber,
          accountNumber: formData.accountNumber,
          bankName: formData.bankName || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save banking information');
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title={existingInfo ? 'Update Banking Information' : 'Add Banking Information'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center text-5xl mx-auto mb-4">
            🏦
          </div>
          <p className="text-gray-300">
            Add your bank account to receive payouts from your Digis earnings
          </p>
        </div>

        {/* Security Notice */}
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 text-sm text-blue-300">
          <p className="font-medium mb-2">🔒 Your information is secure</p>
          <p className="text-xs">
            Your banking details are encrypted and used only for processing payouts.
            We never share your information with third parties.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 rounded-lg bg-red-500/20 border border-red-500 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Account Holder Name */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Account Holder Name *
            </label>
            <input
              type="text"
              value={formData.accountHolderName}
              onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
              className="w-full px-4 py-3 glass rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-digis-cyan"
              placeholder="John Doe"
              required
            />
          </div>

          {/* Account Type */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Account Type *
            </label>
            <select
              value={formData.accountType}
              onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
              className="w-full px-4 py-3 glass rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-digis-cyan"
              required
            >
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
            </select>
          </div>

          {/* Bank Name */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Bank Name (Optional)
            </label>
            <input
              type="text"
              value={formData.bankName}
              onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              className="w-full px-4 py-3 glass rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-digis-cyan"
              placeholder="Chase, Bank of America, etc."
            />
          </div>

          {/* Routing Number */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Routing Number *
            </label>
            <input
              type="text"
              value={formData.routingNumber}
              onChange={(e) => setFormData({ ...formData, routingNumber: e.target.value.replace(/\D/g, '').slice(0, 9) })}
              className="w-full px-4 py-3 glass rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-digis-cyan font-mono"
              placeholder="123456789"
              maxLength={9}
              required
            />
            <p className="text-xs text-gray-400 mt-1">9-digit number found at the bottom of your check</p>
          </div>

          {/* Account Number */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Account Number *
            </label>
            <input
              type="text"
              value={formData.accountNumber}
              onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value.replace(/\D/g, '') })}
              className="w-full px-4 py-3 glass rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-digis-cyan font-mono"
              placeholder="••••••••••"
              required
            />
          </div>

          {/* Confirm Account Number */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Confirm Account Number *
            </label>
            <input
              type="text"
              value={formData.confirmAccountNumber}
              onChange={(e) => setFormData({ ...formData, confirmAccountNumber: e.target.value.replace(/\D/g, '') })}
              className="w-full px-4 py-3 glass rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-digis-cyan font-mono"
              placeholder="••••••••••"
              required
            />
          </div>

          {/* Existing Info Notice */}
          {existingInfo && (
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm text-yellow-300">
              <p className="font-medium mb-1">Updating Banking Information</p>
              <p className="text-xs">
                Current account ending in ••••{existingInfo.lastFourDigits}
                <br />
                Your verification status will be reset after updating.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <GlassButton
            type="button"
            variant="ghost"
            size="lg"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </GlassButton>
          <GlassButton
            type="submit"
            variant="gradient"
            size="lg"
            className="flex-1"
            disabled={loading}
          >
            {loading ? (
              <LoadingSpinner size="sm" />
            ) : (
              existingInfo ? 'Update Information' : 'Add Banking Info'
            )}
          </GlassButton>
        </div>

        {/* Disclaimer */}
        <div className="text-center text-xs text-gray-400">
          By adding your banking information, you agree to our terms and confirm
          that you are authorized to use this account for payouts.
        </div>
      </form>
    </GlassModal>
  );
}
