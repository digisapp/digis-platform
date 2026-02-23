'use client';

import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui';
import { UserCircle, Video, Ticket, Clock, Lock, Play, Heart, Scissors, Eye, Sparkles, Image, Film } from 'lucide-react';
import type { ContentItem, StreamItem, ClipItem } from './types';

interface ProfileContentTabsProps {
  activeTab: 'photos' | 'video' | 'streams' | 'about';
  onTabChange: (tab: 'photos' | 'video' | 'streams' | 'about') => void;
  streamsSubTab: 'vods' | 'clips';
  onStreamsSubTabChange: (tab: 'vods' | 'clips') => void;
  content: ContentItem[];
  streams: StreamItem[];
  clips: ClipItem[];
  contentLoading: boolean;
  hasMoreContent: boolean;
  hasMoreStreams: boolean;
  loadingMoreContent: boolean;
  loadingMoreStreams: boolean;
  onLoadMoreContent: (type?: 'photo' | 'video') => void;
  onLoadMoreVods: () => void;
  user: { id: string; username: string; displayName: string | null; bio: string | null; role: string; createdAt: string };
  isFollowing: boolean;
  onFollowToggle: () => void;
  onContentClick: (item: ContentItem) => void;
  onLikeContent: (contentId: string, e: React.MouseEvent) => void;
}

export function ProfileContentTabs({
  activeTab,
  onTabChange,
  streamsSubTab,
  onStreamsSubTabChange,
  content,
  streams,
  clips,
  contentLoading,
  hasMoreContent,
  hasMoreStreams,
  loadingMoreContent,
  loadingMoreStreams,
  onLoadMoreContent,
  onLoadMoreVods,
  user,
  isFollowing,
  onFollowToggle,
  onContentClick,
  onLikeContent,
}: ProfileContentTabsProps) {
  const router = useRouter();

  const photos = content.filter(c => c.type === 'photo');
  const videos = content.filter(c => c.type === 'video');

  return (
    <div className="mb-8">
      {/* Tab Pills */}
      <div className="mb-6 flex flex-wrap gap-2 overflow-x-auto pt-2 pb-2 px-1">
        <button
          onClick={() => onTabChange('photos')}
          className={`group relative px-3 py-1.5 rounded-full font-medium text-xs transition-all duration-300 flex items-center gap-1.5 ${
            activeTab === 'photos'
              ? 'bg-gradient-to-r from-digis-cyan to-blue-500 text-white shadow-md shadow-cyan-500/40'
              : 'bg-white/10 backdrop-blur-md border border-white/20 text-white hover:border-digis-cyan/50'
          }`}
        >
          <Image className="w-3.5 h-3.5 relative z-10" />
          <span className="relative z-10">Photos</span>
        </button>
        <button
          onClick={() => onTabChange('video')}
          className={`group relative px-3 py-1.5 rounded-full font-medium text-xs transition-all duration-300 flex items-center gap-1.5 ${
            activeTab === 'video'
              ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md shadow-pink-500/40'
              : 'bg-white/10 backdrop-blur-md border border-white/20 text-white hover:border-pink-500/50'
          }`}
        >
          <Film className="w-3.5 h-3.5 relative z-10" />
          <span className="relative z-10">Video</span>
        </button>
        <button
          onClick={() => onTabChange('streams')}
          className={`group relative px-3 py-1.5 rounded-full font-medium text-xs transition-all duration-300 flex items-center gap-1.5 ${
            activeTab === 'streams'
              ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-md shadow-red-500/40'
              : 'bg-white/10 backdrop-blur-md border border-white/20 text-white hover:border-red-500/50'
          }`}
        >
          <Video className="w-3.5 h-3.5 relative z-10" />
          <span className="relative z-10">Streams</span>
        </button>
        <button
          onClick={() => onTabChange('about')}
          className={`group relative px-3 py-1.5 rounded-full font-medium text-xs transition-all duration-300 flex items-center gap-1.5 ${
            activeTab === 'about'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/40'
              : 'bg-white/10 backdrop-blur-md border border-white/20 text-white hover:border-purple-500/50'
          }`}
        >
          <UserCircle className="w-3.5 h-3.5 relative z-10" />
          <span className="relative z-10">About</span>
        </button>
      </div>

      {/* Content Card */}
      <div className="backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
        <div className="p-4 sm:p-6">
          {contentLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <>
              {/* Photos Tab */}
              {activeTab === 'photos' && (
                <PhotosTab
                  content={content}
                  hasMoreContent={hasMoreContent}
                  loadingMoreContent={loadingMoreContent}
                  onLoadMore={() => onLoadMoreContent('photo')}
                  onContentClick={onContentClick}
                  onLikeContent={onLikeContent}
                />
              )}

              {/* Video Tab */}
              {activeTab === 'video' && (
                <VideoTab
                  content={content}
                  hasMoreContent={hasMoreContent}
                  loadingMoreContent={loadingMoreContent}
                  onLoadMore={() => onLoadMoreContent('video')}
                  onContentClick={onContentClick}
                  onLikeContent={onLikeContent}
                />
              )}

              {/* Streams Tab */}
              {activeTab === 'streams' && (
                <StreamsTab
                  streamsSubTab={streamsSubTab}
                  onStreamsSubTabChange={onStreamsSubTabChange}
                  streams={streams}
                  clips={clips}
                  hasMoreStreams={hasMoreStreams}
                  loadingMoreStreams={loadingMoreStreams}
                  onLoadMoreVods={onLoadMoreVods}
                  user={user}
                  isFollowing={isFollowing}
                  onFollowToggle={onFollowToggle}
                  router={router}
                />
              )}

              {/* About Tab */}
              {activeTab === 'about' && (
                <AboutTab user={user} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Sub-components ---

function PhotosTab({ content, hasMoreContent, loadingMoreContent, onLoadMore, onContentClick, onLikeContent }: {
  content: ContentItem[];
  hasMoreContent: boolean;
  loadingMoreContent: boolean;
  onLoadMore: () => void;
  onContentClick: (item: ContentItem) => void;
  onLikeContent: (contentId: string, e: React.MouseEvent) => void;
}) {
  const photos = content.filter(c => c.type === 'photo');

  if (photos.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full blur-xl opacity-50"></div>
          <Image className="relative w-20 h-20 mx-auto text-gray-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">No photos yet</h3>
        <p className="text-gray-400 px-4">Check back later for photo uploads</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {photos.map((item) => (
          <div
            key={item.id}
            onClick={() => onContentClick(item)}
            className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 hover:scale-105 border border-white/10 hover:border-cyan-500/50"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-2xl opacity-0 group-hover:opacity-75 blur transition duration-500"></div>
            <div className="relative w-full h-full rounded-2xl overflow-hidden bg-slate-900">
              {item.thumbnail ? (
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 group-hover:rotate-1"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement?.querySelector('.photo-placeholder')?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`absolute inset-0 bg-gradient-to-br from-cyan-900 via-purple-900 to-slate-900 flex items-center justify-center photo-placeholder ${item.thumbnail ? 'hidden' : ''}`}>
                <Image className="w-16 h-16 text-gray-600" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity pointer-events-none" />
              {item.isLocked && (
                <div className="absolute inset-0 flex flex-col items-center justify-center backdrop-blur-md bg-black/60 pointer-events-none">
                  <div className="relative mb-3">
                    <div className="absolute -inset-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full blur opacity-75"></div>
                    <div className="relative p-4 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
                      <Lock className="w-8 h-8 text-yellow-400" />
                    </div>
                  </div>
                  {item.unlockPrice && item.unlockPrice > 0 && (
                    <div className="px-4 py-2 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold text-sm shadow-lg">
                      {item.unlockPrice} coins
                    </div>
                  )}
                </div>
              )}
              {!item.isLocked && (
                <button
                  onClick={(e) => onLikeContent(item.id, e)}
                  className="absolute top-2 right-2 z-10 p-2 rounded-full bg-black/50 backdrop-blur-md hover:bg-black/70 transition-all group/heart"
                >
                  <Heart
                    className={`w-5 h-5 transition-all ${
                      item.isLiked
                        ? 'text-red-500 fill-red-500 scale-110'
                        : 'text-white group-hover/heart:text-red-400'
                    }`}
                  />
                </button>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-0 group-hover:backdrop-blur-md transition-all pointer-events-none">
                <h3 className="text-white font-bold text-sm line-clamp-1 drop-shadow-lg">
                  {item.title}
                </h3>
              </div>
            </div>
          </div>
        ))}
      </div>
      {hasMoreContent && photos.length > 0 && (
        <div className="flex justify-center mt-8">
          <button
            onClick={onLoadMore}
            disabled={loadingMoreContent}
            className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white rounded-xl font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
          >
            {loadingMoreContent ? (
              <>
                <LoadingSpinner size="sm" />
                Loading...
              </>
            ) : (
              'Load More Photos'
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function VideoTab({ content, hasMoreContent, loadingMoreContent, onLoadMore, onContentClick, onLikeContent }: {
  content: ContentItem[];
  hasMoreContent: boolean;
  loadingMoreContent: boolean;
  onLoadMore: () => void;
  onContentClick: (item: ContentItem) => void;
  onLikeContent: (contentId: string, e: React.MouseEvent) => void;
}) {
  const videos = content.filter(c => c.type === 'video');

  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <Film className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold text-white mb-2">No videos yet</h3>
        <p className="text-gray-400 px-4">Check back later for video content</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {videos.map((item) => (
          <div
            key={item.id}
            onClick={() => onContentClick(item)}
            className="group relative aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-purple-100 to-pink-100 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
          >
            {item.thumbnail ? (
              <img
                src={item.thumbnail}
                alt={item.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.parentElement?.querySelector('.video-placeholder')?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`absolute inset-0 bg-gradient-to-br from-digis-cyan/30 via-digis-purple/30 to-digis-pink/30 flex items-center justify-center video-placeholder ${item.thumbnail ? 'hidden' : ''}`}>
              <Film className="w-12 h-12 text-gray-400" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="p-4 rounded-full bg-black/60 backdrop-blur-md group-hover:scale-110 transition-transform">
                <Play className="w-8 h-8 text-white" fill="white" />
              </div>
            </div>
            {item.isLocked && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-2xl z-20">
                <div className="p-3 rounded-full bg-black/60 backdrop-blur-md mb-2">
                  <Lock className="w-6 h-6 text-white" />
                </div>
                {item.unlockPrice && item.unlockPrice > 0 && (
                  <div className="px-3 py-1.5 rounded-full bg-amber-500 text-white font-bold text-xs">
                    {item.unlockPrice} coins
                  </div>
                )}
              </div>
            )}
            {!item.isLocked && (
              <button
                onClick={(e) => onLikeContent(item.id, e)}
                className="absolute top-2 right-2 z-10 p-2 rounded-full bg-black/50 backdrop-blur-md hover:bg-black/70 transition-all group/heart"
              >
                <Heart
                  className={`w-5 h-5 transition-all ${
                    item.isLiked
                      ? 'text-red-500 fill-red-500 scale-110'
                      : 'text-white group-hover/heart:text-red-400'
                  }`}
                />
              </button>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
              <h3 className="text-white font-bold text-sm line-clamp-1">{item.title}</h3>
            </div>
          </div>
        ))}
      </div>
      {hasMoreContent && videos.length > 0 && (
        <div className="flex justify-center mt-8">
          <button
            onClick={onLoadMore}
            disabled={loadingMoreContent}
            className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white rounded-xl font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
          >
            {loadingMoreContent ? (
              <>
                <LoadingSpinner size="sm" />
                Loading...
              </>
            ) : (
              'Load More Videos'
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function StreamsTab({ streamsSubTab, onStreamsSubTabChange, streams, clips, hasMoreStreams, loadingMoreStreams, onLoadMoreVods, user, isFollowing, onFollowToggle, router }: {
  streamsSubTab: 'vods' | 'clips';
  onStreamsSubTabChange: (tab: 'vods' | 'clips') => void;
  streams: StreamItem[];
  clips: ClipItem[];
  hasMoreStreams: boolean;
  loadingMoreStreams: boolean;
  onLoadMoreVods: () => void;
  user: { id: string; username: string; displayName: string | null; role: string };
  isFollowing: boolean;
  onFollowToggle: () => void;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => onStreamsSubTabChange('vods')}
          className={`px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
            streamsSubTab === 'vods'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
              : 'bg-white/10 text-gray-400 hover:text-white hover:bg-white/20'
          }`}
        >
          <Video className="w-4 h-4" />
          VODs
          {streams.length > 0 && (
            <span className="px-1.5 py-0.5 bg-white/20 rounded text-xs">{streams.length}</span>
          )}
        </button>
        <button
          onClick={() => onStreamsSubTabChange('clips')}
          className={`px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
            streamsSubTab === 'clips'
              ? 'bg-gradient-to-r from-green-500 to-cyan-500 text-white shadow-lg'
              : 'bg-white/10 text-gray-400 hover:text-white hover:bg-white/20'
          }`}
        >
          <Scissors className="w-4 h-4" />
          Clips
          {clips.length > 0 && (
            <span className="px-1.5 py-0.5 bg-white/20 rounded text-xs">{clips.length}</span>
          )}
        </button>
      </div>

      {/* VODs */}
      {streamsSubTab === 'vods' && (
        <>
          {streams.length === 0 ? (
            <div className="text-center py-12">
              <Video className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-white mb-2">No streams yet</h3>
              <p className="text-gray-400 mb-4 px-4">
                {isFollowing
                  ? "You'll be notified when they go live"
                  : 'Follow to get notified when they go live'}
              </p>
              {!isFollowing && (
                <button
                  onClick={onFollowToggle}
                  className="px-6 py-2.5 bg-gradient-to-r from-digis-cyan to-digis-pink text-gray-900 rounded-xl font-semibold hover:scale-105 transition-transform shadow-fun"
                >
                  Follow {user.displayName || user.username}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {streams.map((stream) => (
                <button
                  key={stream.id}
                  onClick={() => router.push(stream.isTicketed ? `/streams/${stream.id}` : `/vod/${stream.id}`)}
                  className={`group relative aspect-video rounded-xl overflow-hidden transition-all hover:shadow-2xl hover:scale-105 ${
                    stream.isTicketed
                      ? 'border-2 border-purple-500/50 hover:border-purple-500 bg-gradient-to-br from-purple-900/40 to-pink-900/40'
                      : 'border-2 border-cyan-500/30 hover:border-cyan-500 bg-gray-900'
                  }`}
                >
                  {stream.thumbnailUrl ? (
                    <img src={stream.thumbnailUrl} alt={stream.title} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className={`absolute inset-0 flex items-center justify-center ${
                      stream.isTicketed
                        ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20'
                        : 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20'
                    }`}>
                      {stream.isTicketed ? (
                        <Ticket className="w-12 h-12 text-purple-400 group-hover:scale-110 transition-transform" />
                      ) : (
                        <Video className="w-12 h-12 text-cyan-400 group-hover:scale-110 transition-transform" />
                      )}
                    </div>
                  )}
                  {stream.isTicketed && (
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold rounded-lg shadow-lg">
                      <Ticket className="w-3.5 h-3.5" />
                      <span>Ticketed</span>
                    </div>
                  )}
                  {stream.isTicketed && stream.status === 'live' && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-lg animate-pulse">
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      LIVE
                    </div>
                  )}
                  {!stream.isTicketed && stream.priceCoins && stream.priceCoins > 0 && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold rounded-lg flex items-center gap-1">
                      {stream.isLocked && <Lock className="w-3 h-3" />}
                      {stream.priceCoins} coins
                    </div>
                  )}
                  {stream.isLocked && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                      <div className="text-center">
                        <Lock className="w-8 h-8 text-white/80 mx-auto mb-2" />
                        <p className="text-white text-xs font-medium">Unlock for {stream.priceCoins} coins</p>
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent p-3 sm:p-4">
                    <h4 className="text-white font-semibold text-sm sm:text-base line-clamp-1 mb-1">{stream.title}</h4>
                    <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-300">
                      {stream.isTicketed ? (
                        <>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(stream.scheduledStart!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          <span className="text-yellow-400 font-bold">
                            {stream.ticketPrice?.toLocaleString()} coins
                          </span>
                        </>
                      ) : (
                        <span>{new Date(stream.endedAt || stream.startedAt!).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {hasMoreStreams && streams.filter(s => s.isVod).length > 0 && (
            <div className="flex justify-center mt-8">
              <button
                onClick={onLoadMoreVods}
                disabled={loadingMoreStreams}
                className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white rounded-xl font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
              >
                {loadingMoreStreams ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Loading...
                  </>
                ) : (
                  'Load More VODs'
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* Clips */}
      {streamsSubTab === 'clips' && (
        <>
          {clips.length === 0 ? (
            <div className="text-center py-12">
              <Scissors className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-white mb-2">No clips yet</h3>
              <p className="text-gray-400 px-4">30-second highlights from streams will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {clips.map((clip) => (
                <button
                  key={clip.id}
                  onClick={() => router.push(`/clip/${clip.id}`)}
                  className="group relative aspect-[9/16] rounded-xl overflow-hidden transition-all hover:shadow-2xl hover:scale-105 border-2 border-green-500/30 hover:border-green-500 bg-gray-900"
                >
                  {clip.thumbnailUrl ? (
                    <img src={clip.thumbnailUrl} alt={clip.title} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-green-500/20 to-cyan-500/20">
                      <Scissors className="w-10 h-10 text-green-400 group-hover:scale-110 transition-transform" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 text-white text-xs font-bold rounded-lg">
                    0:{(clip.duration || 30).toString().padStart(2, '0')}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                    <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
                      <Play className="w-8 h-8 text-white" fill="white" />
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent p-3">
                    <h4 className="text-white font-semibold text-xs line-clamp-2 mb-1">{clip.title}</h4>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {clip.viewCount || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {clip.likeCount || 0}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AboutTab({ user }: {
  user: { bio: string | null };
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-digis-cyan" />
          About
        </h3>
        {user.bio ? (
          <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{user.bio}</p>
        ) : (
          <p className="text-gray-400 italic">No bio yet</p>
        )}
      </div>
    </div>
  );
}
