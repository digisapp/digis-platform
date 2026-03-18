'use client';

import { useState, memo } from 'react';
import Image from 'next/image';
import { Sparkles, UserCircle, BadgeCheck } from 'lucide-react';
import type { Creator } from './types';

export function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden animate-pulse bg-white/5">
      <div className="aspect-[3/4] bg-white/10" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-white/10 rounded w-3/4" />
      </div>
    </div>
  );
}

export function LiveCreatorCard({ creator, onClick }: { creator: Creator; onClick: () => void }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={onClick}
      className="relative rounded-2xl overflow-hidden cursor-pointer group border-2 border-red-500/50 hover:border-red-500 transition-all"
    >
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2.5 py-1 bg-red-500 rounded-full">
        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        <span className="text-xs font-bold text-white">LIVE</span>
      </div>

      <div className="relative aspect-[3/4] overflow-hidden">
        {creator.avatarUrl && !imgError ? (
          <Image
            src={creator.avatarUrl}
            alt={creator.username}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-pink-500/20 flex items-center justify-center">
            <UserCircle className="w-16 h-16 text-gray-400" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="flex items-center gap-1.5">
          <p className="font-bold text-white truncate">{creator.displayName || creator.username}</p>
          {creator.isCreatorVerified && (
            <BadgeCheck className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          )}
        </div>
      </div>
    </div>
  );
}

export const CreatorCard = memo(function CreatorCard({ creator, onClick }: { creator: Creator; onClick: () => void }) {
  const [imgError, setImgError] = useState(false);

  const isNew = creator.createdAt &&
    Math.floor((Date.now() - new Date(creator.createdAt).getTime()) / (1000 * 60 * 60 * 24)) <= 30;

  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer group bg-white/[0.03] border border-white/[0.06] hover:border-cyan-500/30 transition-all"
      onClick={onClick}
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        {creator.avatarUrl && !imgError ? (
          <Image
            src={creator.avatarUrl}
            alt={creator.username}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 flex items-center justify-center">
            <UserCircle className="w-12 h-12 text-gray-500" />
          </div>
        )}

        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
          {creator.isLive && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500 rounded-full text-xs font-bold text-white">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </span>
          )}
          {creator.isOnline && !creator.isLive && (
            <span className="px-2 py-0.5 bg-green-500/80 rounded-full text-xs font-medium text-white">
              Online
            </span>
          )}
          {isNew && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/80 rounded-full text-xs font-medium text-white">
              <Sparkles className="w-3 h-3" />
              New
            </span>
          )}
        </div>

        {creator.primaryCategory && (
          <div className="absolute top-2 right-2 z-10">
            <span className="px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded-full text-[10px] font-medium text-gray-300">
              {creator.primaryCategory}
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      </div>

      <div className="p-3">
        <div className="flex items-center gap-1.5">
          <p className="font-semibold text-white truncate text-sm">{creator.displayName || creator.username}</p>
          {creator.isCreatorVerified && (
            <BadgeCheck className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          )}
        </div>
      </div>
    </div>
  );
});
