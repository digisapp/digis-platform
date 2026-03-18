'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  DollarSign, Settings, Users, Save, Plus,
} from 'lucide-react';

interface PlatformFee {
  id: string;
  key: string;
  feePercent: string;
  description: string | null;
  isActive: boolean;
}

interface CreatorSplit {
  id: string;
  creatorId: string;
  platformFeePercent: string | null;
  agencyId: string | null;
  agencyFeePercent: string | null;
  agencyName: string | null;
  effectiveFrom: string;
  effectiveUntil: string | null;
  isActive: boolean;
  notes: string | null;
  creatorUsername: string;
  creatorDisplayName: string | null;
}

interface LedgerStats {
  totalTransactions: number;
  totalGross: number;
  totalPlatformFees: number;
  totalAgencyFees: number;
  totalCreatorNet: number;
}

export default function AdminRevenueSplitsPage() {
  const router = useRouter();
  const [platformFees, setPlatformFees] = useState<PlatformFee[]>([]);
  const [creatorSplits, setCreatorSplits] = useState<CreatorSplit[]>([]);
  const [ledgerStats, setLedgerStats] = useState<LedgerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editedFees, setEditedFees] = useState<Record<string, string>>({});

  // New split form
  const [showNewSplit, setShowNewSplit] = useState(false);
  const [newSplit, setNewSplit] = useState({
    creatorId: '',
    platformFeePercent: '',
    agencyFeePercent: '',
    agencyName: '',
    notes: '',
  });

  useEffect(() => {
    fetch('/api/admin/revenue-splits')
      .then(r => {
        if (r.status === 401 || r.status === 403) { router.push('/'); return null; }
        return r.json();
      })
      .then(data => {
        if (data) {
          setPlatformFees(data.platformFees || []);
          setCreatorSplits(data.creatorSplits || []);
          setLedgerStats(data.ledgerStats);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router]);

  const handleUpdateFee = async (key: string) => {
    const feePercent = parseFloat(editedFees[key]);
    if (isNaN(feePercent) || feePercent < 0 || feePercent > 100) return;
    setSaving(key);
    try {
      await fetch('/api/admin/revenue-splits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_platform_fee', key, feePercent }),
      });
      setPlatformFees(prev => prev.map(f => f.key === key ? { ...f, feePercent: String(feePercent) } : f));
      setEditedFees(prev => { const n = { ...prev }; delete n[key]; return n; });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(null);
    }
  };

  const handleCreateSplit = async () => {
    if (!newSplit.creatorId) return;
    setSaving('new');
    try {
      await fetch('/api/admin/revenue-splits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_creator_split',
          creatorId: newSplit.creatorId,
          platformFeePercent: newSplit.platformFeePercent ? parseFloat(newSplit.platformFeePercent) : undefined,
          agencyFeePercent: newSplit.agencyFeePercent ? parseFloat(newSplit.agencyFeePercent) : undefined,
          agencyName: newSplit.agencyName || undefined,
          notes: newSplit.notes || undefined,
        }),
      });
      setShowNewSplit(false);
      setNewSplit({ creatorId: '', platformFeePercent: '', agencyFeePercent: '', agencyName: '', notes: '' });
      // Refresh
      const res = await fetch('/api/admin/revenue-splits');
      const data = await res.json();
      setCreatorSplits(data.creatorSplits || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20">
      <div className="container mx-auto px-4 pt-6 md:pt-10 pb-24 md:pb-10 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <DollarSign className="w-6 h-6 text-green-400" />
          <h1 className="text-2xl font-bold text-white">Revenue Splits</h1>
        </div>

        {/* Ledger Stats */}
        {ledgerStats && ledgerStats.totalTransactions > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <p className="text-lg font-bold text-white">{ledgerStats.totalGross.toLocaleString()}</p>
              <p className="text-xs text-gray-400">Total Gross</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <p className="text-lg font-bold text-green-400">{ledgerStats.totalPlatformFees.toLocaleString()}</p>
              <p className="text-xs text-gray-400">Platform Fees</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <p className="text-lg font-bold text-purple-400">{ledgerStats.totalAgencyFees.toLocaleString()}</p>
              <p className="text-xs text-gray-400">Agency Fees</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <p className="text-lg font-bold text-cyan-400">{ledgerStats.totalCreatorNet.toLocaleString()}</p>
              <p className="text-xs text-gray-400">Creator Net</p>
            </div>
          </div>
        )}

        {/* Platform Fees */}
        <div className="mb-6 rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
            <Settings className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-white">Global Platform Fees</h2>
          </div>
          <div className="divide-y divide-white/5">
            {platformFees.map(fee => (
              <div key={fee.key} className="flex items-center gap-4 px-4 py-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-white capitalize">{fee.key}</p>
                  {fee.description && <p className="text-xs text-gray-500">{fee.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={editedFees[fee.key] ?? fee.feePercent}
                    onChange={e => setEditedFees(prev => ({ ...prev, [fee.key]: e.target.value }))}
                    className="w-20 px-2 py-1 bg-white/5 rounded-lg text-sm text-white text-right border border-white/10 focus:border-green-500/50 outline-none"
                  />
                  <span className="text-sm text-gray-400">%</span>
                  {editedFees[fee.key] != null && editedFees[fee.key] !== fee.feePercent && (
                    <button
                      onClick={() => handleUpdateFee(fee.key)}
                      disabled={saving === fee.key}
                      className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                    >
                      <Save className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Creator Overrides */}
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-white">Creator Overrides</h2>
            </div>
            <button
              onClick={() => setShowNewSplit(!showNewSplit)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 text-xs font-medium hover:bg-purple-500/30 transition-colors"
            >
              <Plus className="w-3 h-3" /> Add Override
            </button>
          </div>

          {showNewSplit && (
            <div className="p-4 border-b border-white/10 bg-white/5">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input
                  placeholder="Creator ID (UUID)"
                  value={newSplit.creatorId}
                  onChange={e => setNewSplit(p => ({ ...p, creatorId: e.target.value }))}
                  className="px-3 py-2 bg-black/30 rounded-lg text-sm text-white placeholder-gray-500 border border-white/10 outline-none"
                />
                <input
                  placeholder="Platform fee % (e.g. 15)"
                  value={newSplit.platformFeePercent}
                  onChange={e => setNewSplit(p => ({ ...p, platformFeePercent: e.target.value }))}
                  className="px-3 py-2 bg-black/30 rounded-lg text-sm text-white placeholder-gray-500 border border-white/10 outline-none"
                />
                <input
                  placeholder="Agency fee % (optional)"
                  value={newSplit.agencyFeePercent}
                  onChange={e => setNewSplit(p => ({ ...p, agencyFeePercent: e.target.value }))}
                  className="px-3 py-2 bg-black/30 rounded-lg text-sm text-white placeholder-gray-500 border border-white/10 outline-none"
                />
                <input
                  placeholder="Agency name (optional)"
                  value={newSplit.agencyName}
                  onChange={e => setNewSplit(p => ({ ...p, agencyName: e.target.value }))}
                  className="px-3 py-2 bg-black/30 rounded-lg text-sm text-white placeholder-gray-500 border border-white/10 outline-none"
                />
              </div>
              <input
                placeholder="Notes (optional)"
                value={newSplit.notes}
                onChange={e => setNewSplit(p => ({ ...p, notes: e.target.value }))}
                className="w-full px-3 py-2 bg-black/30 rounded-lg text-sm text-white placeholder-gray-500 border border-white/10 outline-none mb-3"
              />
              <button
                onClick={handleCreateSplit}
                disabled={!newSplit.creatorId || saving === 'new'}
                className="px-4 py-2 rounded-lg bg-purple-500 text-white text-sm font-medium hover:bg-purple-400 disabled:opacity-50 transition-colors"
              >
                {saving === 'new' ? 'Saving...' : 'Create Override'}
              </button>
            </div>
          )}

          {creatorSplits.length > 0 ? (
            <div className="divide-y divide-white/5">
              {creatorSplits.map(split => (
                <div key={split.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white">
                      {split.creatorDisplayName || split.creatorUsername}
                    </span>
                    <div className="flex items-center gap-3 text-xs">
                      {split.platformFeePercent && (
                        <span className="text-green-400">Platform: {split.platformFeePercent}%</span>
                      )}
                      {split.agencyFeePercent && (
                        <span className="text-purple-400">
                          Agency: {split.agencyFeePercent}% ({split.agencyName || 'Unknown'})
                        </span>
                      )}
                    </div>
                  </div>
                  {split.notes && <p className="text-xs text-gray-500">{split.notes}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-gray-500">No creator overrides — all using global rates</p>
          )}
        </div>
      </div>
    </div>
  );
}
