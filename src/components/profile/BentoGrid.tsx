'use client';

import { useState } from 'react';
import { Video, Image as ImageIcon, Lock, Heart, TrendingUp, Clock, Play } from 'lucide-react';

interface ContentItem {
  id: string;
  type: 'photo' | 'video' | 'live' | 'exclusive';
  title: string;
  thumbnail?: string;
  likes?: number;
  views?: number;
  isLocked?: boolean;
  timestamp?: string;
  featured?: boolean;
  unlockPrice?: number;
  isFree?: boolean;
}

interface BentoGridProps {
  content: ContentItem[];
}

export function BentoGrid({ content }: BentoGridProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Organize content by priority
  const featuredContent = content.find(c => c.featured || c.type === 'live') || content[0];
  const recentContent = content.slice(1, 4);
  const exclusiveContent = content.filter(c => c.isLocked).slice(0, 2);

  const ContentCard = ({ item, size = 'medium' }: { item: ContentItem; size?: 'large' | 'medium' | 'small' | 'wide' | 'tall' }) => {
    const sizeClasses = {
      large: 'col-span-2 md:col-span-4 row-span-[30]',
      wide: 'col-span-2 md:col-span-3 row-span-[18]',
      tall: 'col-span-1 md:col-span-2 row-span-[24]',
      medium: 'col-span-1 md:col-span-2 row-span-[18]',
      small: 'col-span-1 md:col-span-1 row-span-[12]',
    };

    return (
      <div
        className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${sizeClasses[size]}`}
        onMouseEnter={() => setHoveredId(item.id)}
        onMouseLeave={() => setHoveredId(null)}
      >
        {/* Thumbnail or Gradient */}
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-digis-cyan/30 via-digis-purple/30 to-digis-pink/30" />
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

        {/* Content type badge */}
        <div className="absolute top-3 left-3 z-10">
          {item.type === 'live' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">
              <span className="w-2 h-2 bg-white rounded-full" />
              LIVE
            </div>
          )}
          {item.type === 'video' && (
            <div className="p-2 rounded-full bg-black/50 backdrop-blur-sm">
              <Play className="w-4 h-4 text-white" fill="white" />
            </div>
          )}
          {item.type === 'exclusive' && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-500/90 text-white text-xs font-bold">
              <Lock className="w-3 h-3" />
              VIP
            </div>
          )}
        </div>

        {/* Lock indicator for locked content */}
        {item.isLocked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/30 backdrop-blur-sm">
            <div className="p-4 rounded-full bg-black/60 backdrop-blur-md mb-2">
              <Lock className="w-8 h-8 text-white" />
            </div>
            {item.unlockPrice !== undefined && item.unlockPrice > 0 && (
              <div className="px-4 py-2 rounded-full bg-amber-500 text-white font-bold text-sm shadow-lg">
                {item.unlockPrice} coins to unlock
              </div>
            )}
          </div>
        )}

        {/* Content info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
          <h3 className="text-white font-bold text-sm md:text-base line-clamp-2 mb-2">
            {item.title}
          </h3>

          <div className="flex items-center gap-3 text-xs text-white/90">
            {item.likes !== undefined && (
              <div className="flex items-center gap-1">
                <Heart className="w-3.5 h-3.5" fill="white" />
                <span>{item.likes}</span>
              </div>
            )}
            {item.views !== undefined && (
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{item.views} views</span>
              </div>
            )}
            {item.timestamp && (
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{item.timestamp}</span>
              </div>
            )}
          </div>
        </div>

        {/* Hover effect */}
        {hoveredId === item.id && (
          <div className="absolute inset-0 border-4 border-digis-cyan rounded-2xl transition-all duration-300" />
        )}
      </div>
    );
  };

  // Skeleton for loading state
  const SkeletonCard = ({ size = 'medium' }: { size?: 'large' | 'medium' | 'small' | 'wide' | 'tall' }) => {
    const sizeClasses = {
      large: 'col-span-2 md:col-span-4 row-span-[30]',
      wide: 'col-span-2 md:col-span-3 row-span-[18]',
      tall: 'col-span-1 md:col-span-2 row-span-[24]',
      medium: 'col-span-1 md:col-span-2 row-span-[18]',
      small: 'col-span-1 md:col-span-1 row-span-[12]',
    };

    return (
      <div className={`rounded-2xl bg-white/60 backdrop-blur-sm animate-pulse ${sizeClasses[size]}`}>
        <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
      </div>
    );
  };

  if (!content || content.length === 0) {
    return (
      <div className="grid gap-3 grid-cols-2 md:grid-cols-6 auto-rows-[8px]">
        <SkeletonCard size="large" />
        <SkeletonCard size="wide" />
        <SkeletonCard size="tall" />
        <SkeletonCard size="small" />
        <SkeletonCard size="small" />
      </div>
    );
  }

  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-6 auto-rows-[8px]">
      {/* Featured - Large tile */}
      {featuredContent && <ContentCard item={featuredContent} size="large" />}

      {/* Recent content - Medium tiles */}
      {recentContent.map((item, idx) => (
        <ContentCard
          key={item.id}
          item={item}
          size={idx === 0 ? 'wide' : idx === 1 ? 'tall' : 'medium'}
        />
      ))}

      {/* Exclusive content - Small tiles */}
      {exclusiveContent.map((item) => (
        <ContentCard key={item.id} item={item} size="small" />
      ))}
    </div>
  );
}
