'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard, LoadingSpinner } from '@/components/ui';
import { Play, Image as ImageIcon, Download, Calendar } from 'lucide-react';

interface PurchasedContent {
  id: string;
  title: string;
  description: string | null;
  contentType: 'photo' | 'video' | 'gallery';
  thumbnailUrl: string;
  mediaUrl: string;
  viewCount: number;
  durationSeconds: number | null;
  purchasedAt: string;
  coinsSpent: number;
  creator: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    isCreatorVerified: boolean;
  };
}

export default function ContentLibraryPage() {
  const router = useRouter();
  const [content, setContent] = useState<PurchasedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'photo' | 'video'>('all');

  useEffect(() => {
    fetchLibrary();
  }, [filter]);

  const fetchLibrary = async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.set('contentType', filter);
      }

      const response = await fetch(`/api/content/library?${params}`);
      const data = await response.json();

      if (response.ok) {
        setContent(data.content);
      }
    } catch (error) {
      console.error('Error fetching library:', error);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold text-white">My Library 📚</h1>
            <button
              onClick={() => router.push('/content')}
              className="px-4 py-2 bg-gradient-to-r from-digis-cyan to-digis-pink rounded-lg font-semibold hover:scale-105 transition-transform"
            >
              Browse Content
            </button>
          </div>
          <p className="text-gray-400">Your purchased content collection</p>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              filter === 'all'
                ? 'bg-gradient-to-r from-digis-cyan to-digis-pink text-gray-900'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            All Content
          </button>
          <button
            onClick={() => setFilter('photo')}
            className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
              filter === 'photo'
                ? 'bg-gradient-to-r from-digis-cyan to-digis-pink text-gray-900'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Photos
          </button>
          <button
            onClick={() => setFilter('video')}
            className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
              filter === 'video'
                ? 'bg-gradient-to-r from-digis-cyan to-digis-pink text-gray-900'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            <Play className="w-4 h-4" />
            Videos
          </button>
        </div>

        {/* Stats Summary */}
        {content.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <GlassCard className="p-6">
              <div className="text-gray-400 text-sm mb-1">Total Items</div>
              <div className="text-3xl font-bold text-white">{content.length}</div>
            </GlassCard>
            <GlassCard className="p-6">
              <div className="text-gray-400 text-sm mb-1">Total Spent</div>
              <div className="text-3xl font-bold text-digis-cyan">
                {content.reduce((sum, item) => sum + item.coinsSpent, 0)} coins
              </div>
            </GlassCard>
            <GlassCard className="p-6">
              <div className="text-gray-400 text-sm mb-1">Creators Supported</div>
              <div className="text-3xl font-bold text-digis-pink">
                {new Set(content.map(item => item.creator.id)).size}
              </div>
            </GlassCard>
          </div>
        )}

        {/* Content Grid */}
        {content.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-bold text-white mb-2">No content yet</h3>
            <p className="text-gray-400 mb-6">Start building your collection by purchasing exclusive content!</p>
            <button
              onClick={() => router.push('/content')}
              className="px-6 py-3 bg-gradient-to-r from-digis-cyan to-digis-pink rounded-lg font-semibold hover:scale-105 transition-transform"
            >
              Browse Content
            </button>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {content.map((item) => (
              <div
                key={item.id}
                onClick={() => router.push(`/content/${item.id}`)}
                className="group cursor-pointer"
              >
                <GlassCard className="p-0 overflow-hidden hover:scale-105 transition-transform">
                  {/* Thumbnail */}
                  <div className="relative aspect-[3/4] overflow-hidden bg-black">
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    {/* Content Type Icon */}
                    <div className="absolute top-3 left-3">
                      <div className="bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-2 text-white text-sm">
                        {getContentIcon(item.contentType)}
                        {item.contentType === 'video' && item.durationSeconds && (
                          <span>{formatDuration(item.durationSeconds)}</span>
                        )}
                      </div>
                    </div>

                    {/* Owned Badge */}
                    <div className="absolute top-3 right-3">
                      <div className="bg-green-500/90 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1 text-white font-bold text-sm">
                        ✓ Owned
                      </div>
                    </div>

                    {/* Download Button - Shows on Hover */}
                    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(item.mediaUrl, '_blank');
                        }}
                        className="bg-white/20 backdrop-blur-sm p-3 rounded-full hover:bg-white/30 transition-colors"
                      >
                        <Download className="w-5 h-5 text-white" />
                      </button>
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

                      {/* Purchase Info */}
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(item.purchasedAt)}
                        </span>
                        <span>💰 {item.coinsSpent} coins</span>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
