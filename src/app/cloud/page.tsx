'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useRouter } from 'next/navigation';
import { useCloudData, CloudItem } from '@/hooks/useCloudData';
import { CloudGrid } from '@/components/cloud/HubGrid';
import { UploadModal } from '@/components/cloud/UploadModal';
import { QuickSellModal } from '@/components/cloud/QuickSellModal';
import { ItemDetailModal } from '@/components/cloud/ItemDetailModal';
import { BulkActionsModal } from '@/components/cloud/BulkActionsModal';
import { TagsModal } from '@/components/cloud/TagsModal';
import { ScheduleDropsModal } from '@/components/cloud/ScheduleDropsModal';
import { LockedMessageModal } from '@/components/cloud/LockedMessageModal';
import {
  Upload,
  Zap,
  EyeOff,
  CheckSquare,
  Eye,
  Image,
  Film,
  X,
  CheckCheck,
  Tag,
  Calendar,
  Send,
  Flame,
  LayoutGrid,
} from 'lucide-react';

const statusFilters = [
  { value: 'all', label: 'All', icon: LayoutGrid },
  { value: 'private', label: 'Hidden', icon: EyeOff },
  { value: 'live', label: 'Live', icon: Eye },
] as const;

export default function CloudPage() {
  const { isCreator, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();

  const cloud = useCloudData();

  const translatedStatusFilters = statusFilters.map(f => ({
    ...f,
    label: f.value === 'all' ? t.cloud.all : f.value === 'private' ? t.cloud.hidden : t.cloud.live,
  }));

  // Modals
  const [showUpload, setShowUpload] = useState(false);
  const [showQuickSell, setShowQuickSell] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [showScheduleDrops, setShowScheduleDrops] = useState(false);
  const [showLockedMessage, setShowLockedMessage] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900">
      <div className="max-w-6xl mx-auto px-4 pt-6 pb-28">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent">
                {t.cloud.cloud}
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {cloud.total} {t.cloud.items}
              </p>
            </div>
            {/* Streak badge */}
            {streak && streak.currentStreak > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-orange-400 text-sm font-bold">{streak.currentStreak}</span>
              </div>
            )}
          </div>

          {/* Upload button */}
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 hover:border-cyan-500/50 transition-all hover:scale-[1.02] active:scale-[0.98] flex-shrink-0"
          >
            <Upload className="w-5 h-5 text-cyan-400" />
            <span className="text-sm sm:text-base font-semibold text-white">{t.cloud.upload}</span>
          </button>
        </div>

        {/* Welcome banner for empty state */}
        {cloud.total === 0 && (
          <div className="mb-6 bg-gradient-to-r from-cyan-500/10 to-pink-500/10 border border-cyan-500/20 rounded-2xl p-6 text-center">
            <h2 className="text-lg font-bold text-white mb-2">{t.cloud.welcomeToCloud}</h2>
            <p className="text-gray-400 text-sm mb-4">
              {t.cloud.uploadDesc}
            </p>
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-black font-semibold hover:from-cyan-400 hover:to-cyan-500 transition-all text-sm"
            >
              <Upload className="w-4 h-4" />
              {t.cloud.uploadFirst}
            </button>
          </div>
        )}

        {/* Filter bar */}
        <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
          <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 overflow-x-auto scrollbar-hide">
            {translatedStatusFilters.map(filter => {
              const Icon = filter.icon;
              const isActive = cloud.statusFilter === filter.value;
              return (
                <button
                  key={filter.value}
                  onClick={() => cloud.setStatusFilter(filter.value)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{filter.label}</span>
                </button>
              );
            })}

            <div className="w-px h-5 bg-white/10 mx-1 flex-shrink-0" />

            <button
              onClick={() => cloud.setTypeFilter(cloud.typeFilter === 'photo' ? 'all' : 'photo')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                cloud.typeFilter === 'photo'
                  ? 'bg-white/10 text-cyan-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Image className="w-4 h-4" />
              <span>{t.cloud.photos}</span>
            </button>
            <button
              onClick={() => cloud.setTypeFilter(cloud.typeFilter === 'video' ? 'all' : 'video')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                cloud.typeFilter === 'video'
                  ? 'bg-white/10 text-cyan-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Film className="w-4 h-4" />
              <span>{t.cloud.videos}</span>
            </button>
          </div>

          {/* Selection mode toggle */}
          <div className="flex items-center gap-2">
            {selectionMode ? (
              <>
                <span className="text-sm text-gray-400">
                  {cloud.selectedItems.size} {t.cloud.selected}
                </span>
                <button
                  onClick={cloud.selectAll}
                  className="p-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  title={t.cloud.selectAll}
                >
                  <CheckCheck className="w-5 h-5" />
                </button>
                <button
                  onClick={() => { setSelectionMode(false); cloud.clearSelection(); }}
                  className="p-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setSelectionMode(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 text-sm transition-colors"
              >
                <CheckSquare className="w-4 h-4" />
                {t.cloud.select}
              </button>
            )}
          </div>
        </div>

        {/* Bulk action bar — shown when items are selected */}
        {selectionMode && cloud.selectedItems.size > 0 && (
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setShowQuickSell(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-pink-600 text-white text-sm font-medium hover:from-pink-400 hover:to-pink-500 transition-all whitespace-nowrap flex-shrink-0"
            >
              <Zap className="w-4 h-4" />
              {t.cloud.quickDrop}
            </button>
            <button
              onClick={() => setShowTags(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 text-sm transition-colors whitespace-nowrap flex-shrink-0"
            >
              <Tag className="w-4 h-4" />
              {t.cloud.tags}
            </button>
            <button
              onClick={() => setShowScheduleDrops(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 text-sm transition-colors whitespace-nowrap flex-shrink-0"
            >
              <Calendar className="w-4 h-4" />
              {t.cloud.schedule}
            </button>
            <button
              onClick={() => setShowLockedMessage(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 text-sm transition-colors whitespace-nowrap flex-shrink-0"
            >
              <Send className="w-4 h-4" />
              {t.cloud.send}
            </button>
            <button
              onClick={() => setShowBulkActions(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 text-sm transition-colors whitespace-nowrap flex-shrink-0"
            >
              <Eye className="w-4 h-4" />
              {t.cloud.publish}
            </button>
          </div>
        )}

        {/* Tag filter pills */}
        {cloud.tags.length > 0 && (
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
            <Tag className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
            <button
              onClick={() => cloud.setTagFilter(null)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                cloud.tagFilter === null
                  ? 'bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/30'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-300'
              }`}
            >
              {t.cloud.all}
            </button>
            {cloud.tags.map(tag => (
              <button
                key={tag.id}
                onClick={() => cloud.setTagFilter(cloud.tagFilter === tag.name ? null : tag.name)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  cloud.tagFilter === tag.name
                    ? 'bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/30'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-300'
                }`}
              >
                {tag.name}
                <span className="ml-1 text-gray-600">{tag.itemCount}</span>
              </button>
            ))}
          </div>
        )}

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
              className="px-5 py-2.5 rounded-xl bg-white/5 text-gray-400 hover:bg-white/10 disabled:opacity-30 transition-colors text-sm font-medium"
            >
              {t.cloud.previous}
            </button>
            <span className="text-gray-500 text-sm">
              {cloud.page} / {Math.ceil(cloud.total / 50)}
            </span>
            <button
              onClick={() => { cloud.setPage(cloud.page + 1); cloud.fetchItems(cloud.page + 1); }}
              disabled={cloud.page >= Math.ceil(cloud.total / 50)}
              className="px-5 py-2.5 rounded-xl bg-white/5 text-gray-400 hover:bg-white/10 disabled:opacity-30 transition-colors text-sm font-medium"
            >
              {t.cloud.next}
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
        onQuickSell={cloud.quickSell}
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
        onTagsChanged={cloud.fetchTags}
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

    </div>
  );
}
