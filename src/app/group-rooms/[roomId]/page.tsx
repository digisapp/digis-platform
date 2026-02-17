'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { GlassCard, GlassButton, LoadingSpinner } from '@/components/ui';
import { useToastContext } from '@/context/ToastContext';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Users, Lock, Unlock, UserMinus, LogOut, Play } from 'lucide-react';

interface Participant {
  id: string;
  userId: string;
  status: string;
  joinedAt: string;
  user: { id: string; displayName: string; username: string; avatarUrl: string | null };
}

interface Room {
  id: string;
  title: string;
  description: string | null;
  roomType: string;
  status: string;
  roomName: string | null;
  maxParticipants: number;
  priceType: string;
  priceCoins: number;
  currentParticipants: number;
  isLocked: boolean;
  creatorId: string;
  creator: { id: string; displayName: string; username: string; avatarUrl: string | null };
  participants: Participant[];
}

export default function GroupRoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId as string;
  const { showError, showSuccess } = useToastContext();

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);

  const fetchRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/group-rooms/${roomId}`);
      const data = await res.json();
      if (res.ok) {
        setRoom(data.room);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchRoom();
    const interval = setInterval(fetchRoom, 10000); // Poll for updates
    return () => clearInterval(interval);
  }, [fetchRoom]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      const res = await fetch(`/api/group-rooms/${roomId}/join`, { method: 'POST' });
      const data = await res.json();
      if (res.ok || data.alreadyJoined) {
        setHasJoined(true);
        // Get token
        const tokenRes = await fetch(`/api/group-rooms/${roomId}/token`);
        const tokenData = await tokenRes.json();
        if (tokenRes.ok) {
          setToken(tokenData.token);
          setWsUrl(tokenData.wsUrl);
          showSuccess('Joined room!');
          fetchRoom();
        } else {
          showError(tokenData.error || 'Failed to get token');
        }
      } else {
        showError(data.error || 'Failed to join');
      }
    } catch {
      showError('Failed to join room');
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    try {
      const res = await fetch(`/api/group-rooms/${roomId}/leave`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showSuccess(`Left room${data.charged ? `. Charged: ${data.charged} coins` : ''}`);
        router.push('/explore');
      }
    } catch {
      showError('Failed to leave');
    }
  };

  const handleStart = async () => {
    try {
      const res = await fetch(`/api/group-rooms/${roomId}/start`, { method: 'POST' });
      if (res.ok) {
        showSuccess('Room started!');
        fetchRoom();
      }
    } catch {
      showError('Failed to start');
    }
  };

  const handleEnd = async () => {
    if (!confirm('End this room for all participants?')) return;
    try {
      const res = await fetch(`/api/group-rooms/${roomId}/end`, { method: 'POST' });
      if (res.ok) {
        showSuccess('Room ended');
        router.push('/creator/group-rooms');
      }
    } catch {
      showError('Failed to end room');
    }
  };

  const handleToggleLock = async () => {
    try {
      const res = await fetch(`/api/group-rooms/${roomId}/lock`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showSuccess(data.locked ? 'Room locked' : 'Room unlocked');
        fetchRoom();
      }
    } catch {
      showError('Failed to toggle lock');
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      const res = await fetch(`/api/group-rooms/${roomId}/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        showSuccess('Participant removed');
        fetchRoom();
      }
    } catch {
      showError('Failed to remove participant');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Room not found</p>
      </div>
    );
  }

  const activeParticipants = room.participants.filter(p => p.status === 'joined');
  const priceLabel = room.priceType === 'free' ? 'Free' :
    room.priceType === 'flat' ? `${room.priceCoins} coins` :
    `${room.priceCoins} coins/min`;

  return (
    <div className="min-h-screen bg-black text-white">
      <MobileHeader />
      <div className="max-w-2xl mx-auto p-4 pt-20 space-y-6">
        {/* Room info */}
        <GlassCard className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold">{room.title}</h1>
              <p className="text-sm text-gray-400 mt-1">
                Hosted by {room.creator.displayName}
              </p>
              {room.description && (
                <p className="text-sm text-gray-300 mt-2">{room.description}</p>
              )}
            </div>
            <div className="text-right">
              <span className={`text-xs px-2 py-1 rounded capitalize ${
                room.status === 'active' ? 'bg-green-500/20 text-green-400' :
                room.status === 'waiting' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {room.status}
              </span>
              <div className="text-sm mt-2 text-yellow-400">{priceLabel}</div>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <Users size={14} /> {activeParticipants.length}/{room.maxParticipants}
            </span>
            <span className="capitalize">{room.roomType}</span>
            {room.isLocked && <span className="flex items-center gap-1 text-red-400"><Lock size={14} /> Locked</span>}
          </div>
        </GlassCard>

        {/* Video area placeholder */}
        {token && wsUrl && (
          <GlassCard className="p-4">
            <div className="bg-gray-900 rounded-lg aspect-video flex items-center justify-center">
              <p className="text-gray-500 text-sm text-center">
                LiveKit Room Connected<br />
                <span className="text-xs text-gray-600">Room: {room.roomName}</span>
              </p>
            </div>
          </GlassCard>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {!hasJoined && room.status !== 'ended' && (
            <GlassButton onClick={handleJoin} disabled={joining || room.isLocked} className="flex-1">
              {joining ? 'Joining...' : room.isLocked ? 'Room Locked' : `Join (${priceLabel})`}
            </GlassButton>
          )}

          {hasJoined && (
            <button
              onClick={handleLeave}
              className="flex-1 px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 flex items-center justify-center gap-2"
            >
              <LogOut size={16} /> Leave
            </button>
          )}
        </div>

        {/* Creator controls */}
        {isCreator && (
          <GlassCard className="p-4 space-y-3">
            <h3 className="font-semibold">Host Controls</h3>
            <div className="flex gap-2">
              {(room.status === 'scheduled' || room.status === 'waiting') && (
                <GlassButton onClick={handleStart} className="flex-1 flex items-center justify-center gap-2">
                  <Play size={16} /> Start Room
                </GlassButton>
              )}
              <button
                onClick={handleToggleLock}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 flex items-center gap-2"
              >
                {room.isLocked ? <Unlock size={16} /> : <Lock size={16} />}
                {room.isLocked ? 'Unlock' : 'Lock'}
              </button>
              {room.status === 'active' && (
                <button
                  onClick={handleEnd}
                  className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400"
                >
                  End Room
                </button>
              )}
            </div>
          </GlassCard>
        )}

        {/* Participants */}
        <GlassCard className="p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Users size={16} /> Participants ({activeParticipants.length})
          </h3>
          {activeParticipants.length === 0 ? (
            <p className="text-gray-500 text-sm">No one in the room yet</p>
          ) : (
            <div className="space-y-2">
              {activeParticipants.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden">
                    {p.user.avatarUrl ? (
                      <img src={p.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                        {p.user.displayName?.[0]}
                      </div>
                    )}
                  </div>
                  <span className="flex-1 text-sm">{p.user.displayName}</span>
                  {isCreator && p.userId !== room.creatorId && (
                    <button
                      onClick={() => handleRemove(p.userId)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <UserMinus size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
