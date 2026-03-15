'use client';

import { memo } from 'react';
import { Play, Lock, Check, Eye, DollarSign } from 'lucide-react';
import type { CloudItem } from '@/hooks/useCloudData';

interface CloudGridProps {
  items: CloudItem[];
  selectedItems: Set<string>;
  onToggleSelect: (id: string) => void;
  onItemClick: (item: CloudItem) => void;
  selectionMode: boolean;
}

const statusBadge = {
  private: { label: 'Private', color: 'bg-gray-500/80', icon: Lock },
  ready: { label: 'Ready', color: 'bg-yellow-500/80', icon: Check },
  live: { label: 'Live', color: 'bg-green-500/80', icon: Eye },
};

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const CloudGridItem = memo(({ item, selected, selectionMode, onToggleSelect, onItemClick }: {
  item: CloudItem;
  selected: boolean;
  selectionMode: boolean;
  onToggleSelect: (id: string) => void;
  onItemClick: (item: CloudItem) => void;
}) => {
  const badge = statusBadge[item.status];
  const BadgeIcon = badge.icon;

  return (
    <div
      className={`relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer group transition-all duration-200 ${
        selected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-black scale-[0.97]' : ''
      }`}
      onClick={() => selectionMode ? onToggleSelect(item.id) : onItemClick(item)}
    >
      {/* Thumbnail */}
      <img
        src={item.thumbnailUrl || item.fileUrl}
        alt=""
        className="w-full h-full object-cover"
        loading="lazy"
      />

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200" />

      {/* Selection checkbox */}
      {selectionMode && (
        <div className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
          selected
            ? 'bg-cyan-500 border-cyan-400'
            : 'bg-black/40 border-white/60 backdrop-blur-sm'
        }`}>
          {selected && <Check className="w-4 h-4 text-white" />}
        </div>
      )}

      {/* Video indicator */}
      {item.type === 'video' && (
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs text-white">
          <Play className="w-3 h-3 fill-white" />
          {item.durationSeconds && formatDuration(item.durationSeconds)}
        </div>
      )}

      {/* Bottom info bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-8">
        <div className="flex items-center justify-between">
          {/* Status badge */}
          <span className={`flex items-center gap-1 ${badge.color} rounded-full px-2 py-0.5 text-[10px] font-medium text-white`}>
            <BadgeIcon className="w-3 h-3" />
            {badge.label}
          </span>

          {/* Price */}
          {item.priceCoins ? (
            <span className="flex items-center gap-0.5 text-xs font-semibold text-yellow-400">
              <DollarSign className="w-3 h-3" />
              {item.priceCoins}
            </span>
          ) : (
            <span className="text-[10px] text-gray-400">No price</span>
          )}
        </div>
      </div>
    </div>
  );
});

CloudGridItem.displayName = 'CloudGridItem';

export function CloudGrid({ items, selectedItems, onToggleSelect, onItemClick, selectionMode }: CloudGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mb-4">
          <Eye className="w-8 h-8 text-gray-600" />
        </div>
        <p className="text-gray-400 text-lg font-medium">No content yet</p>
        <p className="text-gray-500 text-sm mt-1">Upload your first items to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
      {items.map(item => (
        <CloudGridItem
          key={item.id}
          item={item}
          selected={selectedItems.has(item.id)}
          selectionMode={selectionMode}
          onToggleSelect={onToggleSelect}
          onItemClick={onItemClick}
        />
      ))}
    </div>
  );
}
