'use client';

import { useState, useEffect } from 'react';
import { Users, Video, Mic, Loader2, Check } from 'lucide-react';

type Viewer = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  joinedAt: Date;
};

type ViewerListProps = {
  streamId: string;
  currentViewers: number;
  activeGuestId?: string | null;
  onInviteSent?: () => void;
};

export function ViewerList({ streamId, currentViewers, activeGuestId, onInviteSent }: ViewerListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [loading, setLoading] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [showInviteOptions, setShowInviteOptions] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchViewers();
      // Refresh every 10 seconds while open
      const interval = setInterval(fetchViewers, 10000);
      return () => clearInterval(interval);
    }
  }, [isOpen, streamId]);

  const fetchViewers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/streams/${streamId}/viewers`);
      const data = await response.json();
      if (response.ok) {
        setViewers(data.viewers || []);
      }
    } catch (error) {
      console.error('Error fetching viewers:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatJoinTime = (date: Date) => {
    const now = new Date();
    const joined = new Date(date);
    const diffMinutes = Math.floor((now.getTime() - joined.getTime()) / 60000);

    if (diffMinutes < 1) return 'Just joined';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const hours = Math.floor(diffMinutes / 60);
    return `${hours}h ago`;
  };

  const handleInvite = async (viewerId: string, inviteType: 'video' | 'voice') => {
    setInvitingId(viewerId);
    setShowInviteOptions(null);

    try {
      const response = await fetch(`/api/streams/${streamId}/guest/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewerId, inviteType }),
      });

      if (response.ok) {
        setInvitedIds(prev => new Set([...prev, viewerId]));
        onInviteSent?.();
      } else {
        const data = await response.json();
        console.error('Failed to invite viewer:', data.error);
      }
    } catch (error) {
      console.error('Error inviting viewer:', error);
    } finally {
      setInvitingId(null);
    }
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 backdrop-blur-xl bg-cyan-500/20 rounded-full border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.3)] hover:bg-cyan-500/30 transition-all"
        title="View Viewers"
      >
        <Users className="w-4 h-4 text-cyan-400" />
        <span className="text-cyan-400 font-bold text-sm">{currentViewers}</span>
      </button>

      {/* Viewer List Panel */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-12 w-72 sm:w-80 bg-black/95 backdrop-blur-xl rounded-xl border-2 border-white/20 z-50 shadow-2xl max-h-[70vh] overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white">Viewers</h3>
                <p className="text-sm text-gray-400">{viewers.length} watching</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                ✕
              </button>
            </div>

            {/* Viewer List */}
            <div className="p-3 space-y-2 overflow-y-auto max-h-[calc(70vh-60px)]">
              {loading && viewers.length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  Loading viewers...
                </div>
              ) : viewers.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-400 text-sm">
                    {currentViewers > 0
                      ? `${currentViewers} ${currentViewers === 1 ? 'person is' : 'people are'} watching`
                      : 'No one watching yet'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {viewers.map((viewer) => (
                    <div
                      key={viewer.id}
                      className="flex items-center gap-3 p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      {/* Avatar */}
                      <a
                        href={`/${viewer.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0"
                      >
                        {viewer.avatarUrl ? (
                          <img
                            src={viewer.avatarUrl}
                            alt={viewer.displayName || viewer.username}
                            className="w-9 h-9 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-sm font-bold">
                            {(viewer.displayName || viewer.username)?.[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                      </a>

                      {/* Info */}
                      <a
                        href={`/${viewer.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 min-w-0"
                      >
                        <div className="font-semibold text-white truncate text-sm">
                          {viewer.displayName || viewer.username}
                        </div>
                        <div className="text-xs text-gray-400 truncate">
                          @{viewer.username}
                        </div>
                      </a>

                      {/* Invite Button or Status */}
                      <div className="flex-shrink-0 relative">
                        {activeGuestId === viewer.id ? (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded-full">
                            Live
                          </span>
                        ) : invitedIds.has(viewer.id) ? (
                          <span className="flex items-center gap-1 px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs font-semibold rounded-full">
                            <Check className="w-3 h-3" />
                            Invited
                          </span>
                        ) : invitingId === viewer.id ? (
                          <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                        ) : (
                          <>
                            <button
                              onClick={() => setShowInviteOptions(showInviteOptions === viewer.id ? null : viewer.id)}
                              className="px-2 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-xs font-semibold rounded-full transition-colors"
                            >
                              Invite
                            </button>

                            {/* Invite Type Options */}
                            {showInviteOptions === viewer.id && (
                              <div className="absolute right-0 top-8 w-36 bg-gray-900 rounded-xl border border-white/20 shadow-xl z-10 overflow-hidden">
                                <button
                                  onClick={() => handleInvite(viewer.id, 'video')}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/10 transition-colors"
                                >
                                  <Video className="w-4 h-4 text-cyan-400" />
                                  <span className="text-sm text-white">Video</span>
                                </button>
                                <button
                                  onClick={() => handleInvite(viewer.id, 'voice')}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/10 transition-colors border-t border-white/10"
                                >
                                  <Mic className="w-4 h-4 text-purple-400" />
                                  <span className="text-sm text-white">Voice Only</span>
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
