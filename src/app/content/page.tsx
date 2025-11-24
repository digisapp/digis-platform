'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard, LoadingSpinner } from '@/components/ui';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Lock, Play, Image as ImageIcon } from 'lucide-react';

interface ContentItem {
  id: string;
  title: string;
  description: string | null;
  contentType: 'photo' | 'video' | 'gallery';
  unlockPrice: number;
  isFree: boolean;
  thumbnailUrl: string;
  viewCount: number;
  purchaseCount: number;
  durationSeconds: number | null;
  createdAt: string;
  creator: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    isCreatorVerified: boolean;
  };
}

export default function ContentFeedPage() {
  const router = useRouter();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'photo' | 'video'>('all');

  useEffect(() => {
    fetchContent();
  }, [filter]);

  const fetchContent = async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.set('contentType', filter);
      }

      const response = await fetch(`/api/content/feed?${params}`);
      const data = await response.json();

      if (response.ok) {
        setContent(data.content);
      }
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setLoading(false);
    }
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Play className="w-5 h-5" />;
      case 'photo':
        return <ImageIcon className="w-5 h-5" />;
      default:
        return <ImageIcon className="w-5 h-5" />;
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20 relative overflow-hidden">
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 -top-10 -left-10 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute w-96 h-96 top-1/3 right-10 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute w-96 h-96 bottom-10 left-1/3 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <MobileHeader />

      <div className="container mx-auto px-4 pt-14 md:pt-10 pb-24 md:pb-8 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent">Exclusive Content 🔥</h1>
            <button
              onClick={() => router.push('/content/library')}
              className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 text-white rounded-2xl font-bold hover:scale-105 transition-all shadow-lg"
            >
              My Library
            </button>
          </div>
          <p className="text-gray-400">Unlock exclusive photos and videos from your favorite creators</p>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              filter === 'all'
                ? 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-lg'
                : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-cyan-500/30'
            }`}
          >
            All Content
          </button>
          <button
            onClick={() => setFilter('photo')}
            className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
              filter === 'photo'
                ? 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-lg'
                : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-cyan-500/30'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Photos
          </button>
          <button
            onClick={() => setFilter('video')}
            className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
              filter === 'video'
                ? 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-lg'
                : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-cyan-500/30'
            }`}
          >
            <Play className="w-4 h-4" />
            Videos
          </button>
        </div>

        {/* Content Grid */}
        {content.length === 0 ? (
          <div className="backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-3xl border-2 border-cyan-500/30 p-12 text-center shadow-[0_0_50px_rgba(34,211,238,0.3)]">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent mb-3">No content yet</h3>
            <p className="text-gray-400">Check back soon for exclusive content!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {content.map((item) => (
              <div
                key={item.id}
                onClick={() => router.push(`/content/${item.id}`)}
                className="group cursor-pointer"
              >
                <div className="backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-2xl border-2 border-cyan-500/30 p-0 overflow-hidden hover:scale-105 hover:border-cyan-500/50 transition-all shadow-[0_0_30px_rgba(34,211,238,0.2)]">
                  {/* Thumbnail */}
                  <div className="relative aspect-[3/4] overflow-hidden bg-black">
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                    {/* Content Type Icon */}
                    <div className="absolute top-3 left-3">
                      <div className="bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-2 text-white text-sm">
                        {getContentIcon(item.contentType)}
                        {item.contentType === 'video' && item.durationSeconds && (
                          <span>{formatDuration(item.durationSeconds)}</span>
                        )}
                      </div>
                    </div>

                    {/* Price Badge */}
                    <div className="absolute top-3 right-3">
                      <div className="bg-yellow-500/90 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1 text-black font-bold text-sm">
                        <Lock className="w-3 h-3" />
                        {item.isFree ? 'FREE' : `${item.unlockPrice} coins`}
                      </div>
                    </div>

                    {/* Bottom Info */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      {/* Creator */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center">
                          {item.creator.avatarUrl ? (
                            <img
                              src={item.creator.avatarUrl}
                              alt={item.creator.displayName || item.creator.username}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-white text-xs font-bold">
                              {(item.creator.displayName || item.creator.username)[0].toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span className="text-white text-sm font-medium">
                          {item.creator.displayName || item.creator.username}
                        </span>
                        {item.creator.isCreatorVerified && (
                          <span className="text-digis-cyan">✓</span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-white font-bold text-lg line-clamp-2 mb-1">
                        {item.title}
                      </h3>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>👁 {item.viewCount}</span>
                        <span>🔓 {item.purchaseCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
