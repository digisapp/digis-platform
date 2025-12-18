'use client';

import { useState, useEffect, useCallback } from 'react';
import { Video, Mic, UserPlus, X, Check, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { GlassButton } from '@/components/ui/GlassButton';

interface GuestRequest {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  requestType: 'video' | 'voice';
  status: string;
  requestedAt: string;
}

interface GuestRequestPanelProps {
  streamId: string;
  onGuestAccepted?: (guest: GuestRequest) => void;
  onGuestRemoved?: () => void;
}

export function GuestRequestPanel({
  streamId,
  onGuestAccepted,
  onGuestRemoved,
}: GuestRequestPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [guestRequestsEnabled, setGuestRequestsEnabled] = useState(false);
  const [requests, setRequests] = useState<GuestRequest[]>([]);
  const [activeGuest, setActiveGuest] = useState<GuestRequest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch(`/api/streams/${streamId}/guest`);
      if (res.ok) {
        const data = await res.json();
        setGuestRequestsEnabled(data.guestRequestsEnabled);
        setRequests(data.requests?.filter((r: GuestRequest) => r.status === 'pending') || []);

        // Find active guest
        const active = data.requests?.find((r: GuestRequest) =>
          r.status === 'accepted' || r.status === 'active'
        );
        setActiveGuest(active || null);
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    }
  }, [streamId]);

  useEffect(() => {
    fetchRequests();
    // Poll for new requests every 5 seconds
    const interval = setInterval(fetchRequests, 5000);
    return () => clearInterval(interval);
  }, [fetchRequests]);

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      const res = await fetch(`/api/streams/${streamId}/guest/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !guestRequestsEnabled }),
      });

      if (res.ok) {
        setGuestRequestsEnabled(!guestRequestsEnabled);
      }
    } catch (error) {
      console.error('Failed to toggle:', error);
    } finally {
      setIsToggling(false);
    }
  };

  const handleAccept = async (request: GuestRequest) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/streams/${streamId}/guest/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: request.id }),
      });

      if (res.ok) {
        setActiveGuest(request);
        setRequests((prev) => prev.filter((r) => r.id !== request.id));
        onGuestAccepted?.(request);
      }
    } catch (error) {
      console.error('Failed to accept:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      const res = await fetch(`/api/streams/${streamId}/guest/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      });

      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
      }
    } catch (error) {
      console.error('Failed to reject:', error);
    }
  };

  const handleRemoveGuest = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/streams/${streamId}/guest/remove`, {
        method: 'POST',
      });

      if (res.ok) {
        setActiveGuest(null);
        onGuestRemoved?.();
      }
    } catch (error) {
      console.error('Failed to remove guest:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const pendingCount = requests.length;

  return (
    <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-white">Guest Requests</span>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 bg-purple-500/30 text-purple-400 text-xs font-bold rounded-full animate-pulse">
              {pendingCount}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="p-3 pt-0 space-y-3">
          {/* Toggle */}
          <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
            <span className="text-xs text-gray-400">Allow Requests</span>
            <button
              onClick={handleToggle}
              disabled={isToggling}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                guestRequestsEnabled ? 'bg-purple-500' : 'bg-gray-600'
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  guestRequestsEnabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Active Guest */}
          {activeGuest && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-green-400">Active Guest</span>
                <button
                  onClick={handleRemoveGuest}
                  disabled={isLoading}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
              <div className="flex items-center gap-2">
                {activeGuest.avatarUrl ? (
                  <img
                    src={activeGuest.avatarUrl}
                    alt={activeGuest.username}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                    {activeGuest.username[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium text-white">
                    {activeGuest.displayName || activeGuest.username}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    {activeGuest.requestType === 'video' ? (
                      <Video className="w-3 h-3" />
                    ) : (
                      <Mic className="w-3 h-3" />
                    )}
                    {activeGuest.requestType === 'video' ? 'Video' : 'Voice'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pending Requests */}
          {guestRequestsEnabled && !activeGuest && requests.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs text-gray-400">Pending Requests</span>
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center gap-2 p-2 bg-white/5 rounded-lg"
                >
                  {request.avatarUrl ? (
                    <img
                      src={request.avatarUrl}
                      alt={request.username}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                      {request.username[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {request.displayName || request.username}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      {request.requestType === 'video' ? (
                        <Video className="w-3 h-3" />
                      ) : (
                        <Mic className="w-3 h-3" />
                      )}
                      {request.requestType === 'video' ? 'Video' : 'Voice'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleAccept(request)}
                      disabled={isLoading}
                      className="p-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleReject(request.id)}
                      className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {guestRequestsEnabled && !activeGuest && requests.length === 0 && (
            <div className="text-center py-4">
              <UserPlus className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-xs text-gray-500">No pending requests</p>
            </div>
          )}

          {/* Disabled State */}
          {!guestRequestsEnabled && !activeGuest && (
            <div className="text-center py-4">
              <p className="text-xs text-gray-500">Enable to allow viewers to request joining</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
