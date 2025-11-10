'use client';

import { useState, useEffect } from 'react';

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
};

export function ViewerList({ streamId, currentViewers }: ViewerListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors border border-white/20"
        title="View Viewers"
      >
        <span className="text-2xl">👤</span>
        <span className="text-white font-semibold">{currentViewers}</span>
        <span className="text-gray-400 text-sm">viewers</span>
      </button>

      {/* Viewer List Panel */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-12 w-80 bg-black/95 backdrop-blur-xl rounded-xl border-2 border-white/20 z-50 shadow-2xl max-h-[500px] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-bold text-white">Viewers</h3>
                <p className="text-sm text-gray-400">{viewers.length} watching</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Viewer List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading && viewers.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  Loading viewers...
                </div>
              ) : viewers.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No viewers yet
                </div>
              ) : (
                viewers.map((viewer) => (
                  <div
                    key={viewer.id}
                    className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors"
                  >
                    {/* Avatar */}
                    {viewer.avatarUrl ? (
                      <img
                        src={viewer.avatarUrl}
                        alt={viewer.displayName || viewer.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-sm font-bold">
                        {(viewer.displayName || viewer.username)[0]?.toUpperCase()}
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white truncate">
                        {viewer.displayName || viewer.username}
                      </div>
                      <div className="text-sm text-gray-400">
                        @{viewer.username}
                      </div>
                    </div>

                    {/* Join Time */}
                    <div className="text-xs text-gray-500">
                      {formatJoinTime(viewer.joinedAt)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
