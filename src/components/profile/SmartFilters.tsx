'use client';

import { useState } from 'react';
import { Image, Film, Radio, Lock, Sparkles, TrendingUp, Clock, Heart } from 'lucide-react';

export type ContentFilter = 'all' | 'photos' | 'videos' | 'live' | 'exclusive' | 'free';
export type SortOption = 'latest' | 'popular' | 'most_liked';

interface SmartFiltersProps {
  activeFilter: ContentFilter;
  activeSortOption: SortOption;
  onFilterChange: (filter: ContentFilter) => void;
  onSortChange: (sort: SortOption) => void;
  counts?: {
    all: number;
    photos: number;
    videos: number;
    live: number;
    exclusive: number;
    free: number;
  };
}

const FILTERS: { id: ContentFilter; label: string; icon: any }[] = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'photos', label: 'Photos', icon: Image },
  { id: 'videos', label: 'Videos', icon: Film },
  { id: 'live', label: 'Live', icon: Radio },
  { id: 'exclusive', label: 'Exclusive', icon: Lock },
  { id: 'free', label: 'Free', icon: Heart },
];

const SORT_OPTIONS: { id: SortOption; label: string; icon: any }[] = [
  { id: 'latest', label: 'Latest', icon: Clock },
  { id: 'popular', label: 'Popular', icon: TrendingUp },
  { id: 'most_liked', label: 'Most Liked', icon: Heart },
];

export function SmartFilters({
  activeFilter,
  activeSortOption,
  onFilterChange,
  onSortChange,
  counts,
}: SmartFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Content Type Filters */}
      <div>
        <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
          Content Type
        </h4>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => {
            const Icon = filter.icon;
            const count = counts?.[filter.id];
            const isActive = activeFilter === filter.id;

            return (
              <button
                key={filter.id}
                onClick={() => onFilterChange(filter.id)}
                className={`px-3 py-1.5 rounded-full font-semibold text-xs transition-all duration-200 flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-digis-cyan text-white shadow-lg border border-digis-cyan scale-105'
                    : 'bg-white/90 backdrop-blur-sm border border-purple-200 text-gray-700 hover:border-digis-cyan hover:bg-white hover:scale-105'
                }`}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
                <span>{filter.label}</span>
                {count !== undefined && count > 0 && (
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white/20' : 'bg-gray-200'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sort Options */}
      <div>
        <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
          Sort By
        </h4>
        <div className="flex flex-wrap gap-2">
          {SORT_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isActive = activeSortOption === option.id;

            return (
              <button
                key={option.id}
                onClick={() => onSortChange(option.id)}
                className={`px-3 py-1.5 rounded-full font-semibold text-xs transition-all duration-200 flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg border border-purple-500 scale-105'
                    : 'bg-white/90 backdrop-blur-sm border border-purple-200 text-gray-700 hover:border-purple-400 hover:bg-white hover:scale-105'
                }`}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
