'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useCloudData, CloudItem } from '@/hooks/useCloudData';
import { CloudGrid } from '@/components/cloud/HubGrid';
import { UploadModal } from '@/components/cloud/UploadModal';
import { QuickSellModal } from '@/components/cloud/QuickSellModal';
import { PricingDefaultsModal } from '@/components/cloud/PricingDefaultsModal';
import { ItemDetailModal } from '@/components/cloud/ItemDetailModal';
import { BulkActionsModal } from '@/components/cloud/BulkActionsModal';
import { FreeUpStorageModal } from '@/components/cloud/FreeUpStorageModal';
import { TagsModal } from '@/components/cloud/TagsModal';
import { ScheduleDropsModal } from '@/components/cloud/ScheduleDropsModal';
import { LockedMessageModal } from '@/components/cloud/LockedMessageModal';
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

export default function CloudPage() {
  const { isCreator, loading: authLoading } = useAuth();
  const router = useRouter();

  const cloud = useCloudData();

  // Modals
  const [showUpload, setShowUpload] = useState(false);
  const [showQuickSell, setShowQuickSell] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [showScheduleDrops, setShowScheduleDrops] = useState(false);
  const [showLockedMessage, setShowLockedMessage] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showFreeStorage, setShowFreeStorage] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CloudItem | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);

  // Streak data
  const [streak, setStreak] = useState<{ currentStreak: number; longestStreak: number } | null>(null);
  useEffect(() => {
    fetch('/api/cloud/streak').then(r => r.json()).then(data => {
      if (data.currentStreak !== undefined) setStreak(data);
    }).catch(() => {});
  }, []);

  // Redirect non-creators
  if (!authLoading && !isCreator) {
    router.push('/');
    return null;
  }

  if (authLoading || cloud.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasNoPricing = !cloud.pricingDefaults?.photoPriceCoins && !cloud.pricingDefaults?.shortVideoPriceCoins && !cloud.pricingDefaults?.longVideoPriceCoins;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900">
      <div className="max-w-6xl mx-auto px-4 pt-6 pb-28">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent">
              Cloud
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {cloud.total} items
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
            {cloud.total > 0 && (
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
        {hasNoPricing && cloud.total === 0 && (
          <div className="mb-6 bg-gradient-to-r from-cyan-500/10 to-pink-500/10 border border-cyan-500/20 rounded-2xl p-6 text-center">
            <h2 className="text-lg font-bold text-white mb-2">Welcome to Cloud</h2>
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
        {cloud.total > 0 && cloud.stats.unpriced > 0 && !hasNoPricing && (
          <div className="mb-6 bg-white/5 rounded-xl p-4 space-y-2">
            <p className="text-gray-400 text-sm font-medium">
              {cloud.stats.unpriced} items not yet earning
            </p>
            <button
              onClick={async () => {
                const result = await cloud.bulkPriceAll();
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
              const isActive = cloud.statusFilter === filter.value;
              const count = filter.value === 'all' ? cloud.total
                : cloud.items.filter(i => i.status === filter.value).length;
              return (
                <button
                  key={filter.value}
                  onClick={() => cloud.setStatusFilter(filter.value)}
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
                  {cloud.selectedItems.size} selected
                </span>
                {cloud.selectedItems.size > 0 && (
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
                  onClick={cloud.selectAll}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Select all"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setSelectionMode(false); cloud.clearSelection(); }}
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
        <CloudGrid
          items={cloud.items}
          selectedItems={cloud.selectedItems}
          onToggleSelect={cloud.toggleSelect}
          onItemClick={(item) => setSelectedItem(item)}
          selectionMode={selectionMode}
        />

        {/* Pagination */}
        {cloud.total > 50 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={() => { cloud.setPage(cloud.page - 1); cloud.fetchItems(cloud.page - 1); }}
              disabled={cloud.page <= 1}
              className="px-4 py-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 disabled:opacity-30 transition-colors"
            >
              Previous
            </button>
            <span className="text-gray-500 text-sm">
              Page {cloud.page} of {Math.ceil(cloud.total / 50)}
            </span>
            <button
              onClick={() => { cloud.setPage(cloud.page + 1); cloud.fetchItems(cloud.page + 1); }}
              disabled={cloud.page >= Math.ceil(cloud.total / 50)}
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
        onUploadComplete={() => cloud.fetchItems(1)}
      />

      <QuickSellModal
        isOpen={showQuickSell}
        onClose={() => setShowQuickSell(false)}
        selectedCount={cloud.selectedItems.size}
        selectedItemIds={Array.from(cloud.selectedItems)}
        pricingDefaults={cloud.pricingDefaults}
        onQuickSell={cloud.quickSell}
      />

      <PricingDefaultsModal
        isOpen={showPricing}
        onClose={() => setShowPricing(false)}
        defaults={cloud.pricingDefaults}
        onSave={cloud.savePricingDefaults}
      />

      <ItemDetailModal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        item={selectedItem}
        onUpdate={cloud.updateItem}
        onDelete={cloud.deleteItem}
      />

      <TagsModal
        isOpen={showTags}
        onClose={() => setShowTags(false)}
        selectedItemIds={Array.from(cloud.selectedItems)}
        selectedCount={cloud.selectedItems.size}
      />

      <ScheduleDropsModal
        isOpen={showScheduleDrops}
        onClose={() => setShowScheduleDrops(false)}
        selectedItemIds={Array.from(cloud.selectedItems)}
        selectedCount={cloud.selectedItems.size}
      />

      <LockedMessageModal
        isOpen={showLockedMessage}
        onClose={() => setShowLockedMessage(false)}
        selectedItemIds={Array.from(cloud.selectedItems)}
        selectedCount={cloud.selectedItems.size}
      />

      <BulkActionsModal
        isOpen={showBulkActions}
        onClose={() => setShowBulkActions(false)}
        selectedItemIds={Array.from(cloud.selectedItems)}
        selectedCount={cloud.selectedItems.size}
        onBulkSetStatus={cloud.bulkSetStatus}
        onBulkSetPrice={cloud.bulkSetPrice}
      />

      <FreeUpStorageModal
        isOpen={showFreeStorage}
        onClose={() => setShowFreeStorage(false)}
      />
    </div>
  );
}
