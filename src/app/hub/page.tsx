'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useHubData, HubItem } from '@/hooks/useHubData';
import { HubGrid } from '@/components/hub/HubGrid';
import { UploadModal } from '@/components/hub/UploadModal';
import { QuickSellModal } from '@/components/hub/QuickSellModal';
import { PricingDefaultsModal } from '@/components/hub/PricingDefaultsModal';
import { ItemDetailModal } from '@/components/hub/ItemDetailModal';
import { BulkActionsModal } from '@/components/hub/BulkActionsModal';
import { FreeUpStorageModal } from '@/components/hub/FreeUpStorageModal';
import { TagsModal } from '@/components/hub/TagsModal';
import { ScheduleDropsModal } from '@/components/hub/ScheduleDropsModal';
import { LockedMessageModal } from '@/components/hub/LockedMessageModal';
import {
  Upload,
  Zap,
  Settings,
  Lock,
  CheckSquare,
  Eye,
  LayoutGrid,
  Image,
  Film,
  DollarSign,
  ChevronDown,
  X,
  CheckCheck,
  Tag,
  Calendar,
  Send,
  Flame,
  HardDrive,
} from 'lucide-react';

const statusFilters = [
  { value: 'all', label: 'All', icon: LayoutGrid },
  { value: 'private', label: 'Private', icon: Lock },
  { value: 'ready', label: 'Ready', icon: CheckSquare },
  { value: 'live', label: 'Live', icon: Eye },
] as const;

export default function HubPage() {
  const { isCreator, loading: authLoading } = useAuth();
  const router = useRouter();

  const hub = useHubData();

  // Modals
  const [showUpload, setShowUpload] = useState(false);
  const [showQuickSell, setShowQuickSell] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [showScheduleDrops, setShowScheduleDrops] = useState(false);
  const [showLockedMessage, setShowLockedMessage] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showFreeStorage, setShowFreeStorage] = useState(false);
  const [selectedItem, setSelectedItem] = useState<HubItem | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);

  // Streak data
  const [streak, setStreak] = useState<{ currentStreak: number; longestStreak: number } | null>(null);
  useEffect(() => {
    fetch('/api/hub/streak').then(r => r.json()).then(data => {
      if (data.currentStreak !== undefined) setStreak(data);
    }).catch(() => {});
  }, []);

  // Redirect non-creators
  if (!authLoading && !isCreator) {
    router.push('/');
    return null;
  }

  if (authLoading || hub.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasNoPricing = !hub.pricingDefaults?.photoPriceCoins && !hub.pricingDefaults?.shortVideoPriceCoins && !hub.pricingDefaults?.longVideoPriceCoins;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900">
      <div className="max-w-6xl mx-auto px-4 pt-6 pb-28">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent">
              Drops
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {hub.total} items
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Streak badge */}
            {streak && streak.currentStreak > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-orange-400 text-sm font-bold">{streak.currentStreak}</span>
              </div>
            )}

            {/* Free up storage */}
            {hub.total > 0 && (
              <button
                onClick={() => setShowFreeStorage(true)}
                className="p-2.5 rounded-xl bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                title="Free up phone storage"
              >
                <HardDrive className="w-5 h-5" />
              </button>
            )}

            {/* Pricing settings */}
            <button
              onClick={() => setShowPricing(true)}
              className={`p-2.5 rounded-xl transition-colors ${
                hasNoPricing
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
              title="Default prices"
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* Upload button */}
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-black font-semibold hover:from-cyan-400 hover:to-cyan-500 transition-all"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Upload</span>
            </button>
          </div>
        </div>

        {/* First-time setup banner */}
        {hasNoPricing && hub.total === 0 && (
          <div className="mb-6 bg-gradient-to-r from-cyan-500/10 to-pink-500/10 border border-cyan-500/20 rounded-2xl p-6 text-center">
            <h2 className="text-lg font-bold text-white mb-2">Welcome to Drops</h2>
            <p className="text-gray-400 text-sm mb-4">
              Back up your content. Free up your phone. Start earning when you&apos;re ready.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setShowPricing(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors text-sm font-medium"
              >
                <DollarSign className="w-4 h-4" />
                Set your default prices
              </button>
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-black font-semibold hover:from-cyan-400 hover:to-cyan-500 transition-all text-sm"
              >
                <Upload className="w-4 h-4" />
                Upload your first content
              </button>
            </div>
          </div>
        )}

        {/* Suggested Actions */}
        {hub.total > 0 && hub.stats.unpriced > 0 && !hasNoPricing && (
          <div className="mb-6 bg-white/5 rounded-xl p-4 space-y-2">
            <p className="text-gray-400 text-sm font-medium">
              {hub.stats.unpriced} items not yet earning
            </p>
            <button
              onClick={async () => {
                const result = await hub.bulkPriceAll();
                if (!result.success) console.error(result.error);
              }}
              className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
            >
              <DollarSign className="w-4 h-4" />
              Price all at default prices
            </button>
          </div>
        )}

        {/* Filter bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1 bg-white/5 rounded-xl p-1">
            {statusFilters.map(filter => {
              const Icon = filter.icon;
              const isActive = hub.statusFilter === filter.value;
              const count = filter.value === 'all' ? hub.total
                : hub.items.filter(i => i.status === filter.value).length;
              return (
                <button
                  key={filter.value}
                  onClick={() => hub.setStatusFilter(filter.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{filter.label}</span>
                  {count > 0 && (
                    <span className={`text-xs ${isActive ? 'text-cyan-400' : 'text-gray-600'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selection mode toggle + Quick Sell */}
          <div className="flex items-center gap-2">
            {selectionMode ? (
              <>
                <span className="text-sm text-gray-400">
                  {hub.selectedItems.size} selected
                </span>
                {hub.selectedItems.size > 0 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setShowQuickSell(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-pink-500 to-pink-600 text-white text-sm font-medium hover:from-pink-400 hover:to-pink-500 transition-all"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Quick Drop
                    </button>
                    <button
                      onClick={() => setShowTags(true)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 text-sm transition-colors"
                      title="Tags"
                    >
                      <Tag className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setShowScheduleDrops(true)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 text-sm transition-colors"
                      title="Schedule drops"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setShowLockedMessage(true)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 text-sm transition-colors"
                      title="Send as locked message"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setShowBulkActions(true)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 text-sm transition-colors"
                      title="Bulk publish / price"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <button
                  onClick={hub.selectAll}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Select all"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setSelectionMode(false); hub.clearSelection(); }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setSelectionMode(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 text-sm transition-colors"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                Select
              </button>
            )}
          </div>
        </div>

        {/* Content Grid */}
        <HubGrid
          items={hub.items}
          selectedItems={hub.selectedItems}
          onToggleSelect={hub.toggleSelect}
          onItemClick={(item) => setSelectedItem(item)}
          selectionMode={selectionMode}
        />

        {/* Pagination */}
        {hub.total > 50 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={() => { hub.setPage(hub.page - 1); hub.fetchItems(hub.page - 1); }}
              disabled={hub.page <= 1}
              className="px-4 py-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 disabled:opacity-30 transition-colors"
            >
              Previous
            </button>
            <span className="text-gray-500 text-sm">
              Page {hub.page} of {Math.ceil(hub.total / 50)}
            </span>
            <button
              onClick={() => { hub.setPage(hub.page + 1); hub.fetchItems(hub.page + 1); }}
              disabled={hub.page >= Math.ceil(hub.total / 50)}
              className="px-4 py-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 disabled:opacity-30 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <UploadModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onUploadComplete={() => hub.fetchItems(1)}
      />

      <QuickSellModal
        isOpen={showQuickSell}
        onClose={() => setShowQuickSell(false)}
        selectedCount={hub.selectedItems.size}
        selectedItemIds={Array.from(hub.selectedItems)}
        pricingDefaults={hub.pricingDefaults}
        onQuickSell={hub.quickSell}
      />

      <PricingDefaultsModal
        isOpen={showPricing}
        onClose={() => setShowPricing(false)}
        defaults={hub.pricingDefaults}
        onSave={hub.savePricingDefaults}
      />

      <ItemDetailModal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        item={selectedItem}
        onUpdate={hub.updateItem}
        onDelete={hub.deleteItem}
      />

      <TagsModal
        isOpen={showTags}
        onClose={() => setShowTags(false)}
        selectedItemIds={Array.from(hub.selectedItems)}
        selectedCount={hub.selectedItems.size}
      />

      <ScheduleDropsModal
        isOpen={showScheduleDrops}
        onClose={() => setShowScheduleDrops(false)}
        selectedItemIds={Array.from(hub.selectedItems)}
        selectedCount={hub.selectedItems.size}
      />

      <LockedMessageModal
        isOpen={showLockedMessage}
        onClose={() => setShowLockedMessage(false)}
        selectedItemIds={Array.from(hub.selectedItems)}
        selectedCount={hub.selectedItems.size}
      />

      <BulkActionsModal
        isOpen={showBulkActions}
        onClose={() => setShowBulkActions(false)}
        selectedItemIds={Array.from(hub.selectedItems)}
        selectedCount={hub.selectedItems.size}
        onBulkSetStatus={hub.bulkSetStatus}
        onBulkSetPrice={hub.bulkSetPrice}
      />

      <FreeUpStorageModal
        isOpen={showFreeStorage}
        onClose={() => setShowFreeStorage(false)}
      />
    </div>
  );
}
