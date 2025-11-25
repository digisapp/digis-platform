'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard, LoadingSpinner } from '@/components/ui';
import { MobileHeader } from '@/components/layout/MobileHeader';
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

      if (response.ok && data.library) {
        setContent(data.library);
      } else {
        // Handle error or empty response
        setContent([]);
      }
    } catch (error) {
      console.error('Error fetching library:', error);
      setContent([]); // Set empty array on error
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

      {/* Mobile Header */}
      <MobileHeader />

      {/* Spacer for fixed mobile header */}
      <div className="md:hidden" style={{ height: 'calc(48px + env(safe-area-inset-top, 0px))' }} />

      <div className="container mx-auto px-4 pt-2 md:pt-10 pb-24 md:pb-8 relative z-10">

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

        {/* Stats Summary */}
        {content && content.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-2xl border-2 border-cyan-500/30 p-6 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
              <div className="text-gray-400 text-sm mb-1">Total Items</div>
              <div className="text-3xl font-bold text-white">{content.length}</div>
            </div>
            <div className="backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-2xl border-2 border-cyan-500/30 p-6 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
              <div className="text-gray-400 text-sm mb-1">Total Spent</div>
              <div className="text-3xl font-bold text-cyan-400">
                {content.reduce((sum, item) => sum + (item.coinsSpent || 0), 0)} coins
              </div>
            </div>
            <div className="backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-2xl border-2 border-cyan-500/30 p-6 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
              <div className="text-gray-400 text-sm mb-1">Creators Supported</div>
              <div className="text-3xl font-bold text-pink-400">
                {new Set(content.map(item => item.creator?.id).filter(Boolean)).size}
              </div>
            </div>
          </div>
        )}

        {/* Content Grid */}
        {content.length === 0 ? (
          <div className="backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-3xl border-2 border-cyan-500/30 p-12 text-center shadow-[0_0_50px_rgba(34,211,238,0.3)]">
            <div className="mb-4">
              <svg className="w-16 h-16 text-cyan-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent mb-2">No content yet</h3>
            <p className="text-gray-400 mb-6">Start building your collection by purchasing exclusive content!</p>
            <button
              onClick={() => router.push('/content')}
              className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 text-white rounded-lg font-semibold hover:scale-105 transition-transform shadow-lg"
            >
              Browse Content
            </button>
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
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Owned
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
                          <svg className="w-4 h-4 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
