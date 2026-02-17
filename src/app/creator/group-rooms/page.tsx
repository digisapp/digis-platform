'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard, GlassButton, LoadingSpinner } from '@/components/ui';
import { useToastContext } from '@/context/ToastContext';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Plus, Users, Clock, Coins, Play, Square } from 'lucide-react';

interface GroupRoom {
  id: string;
  title: string;
  description: string | null;
  roomType: string;
  status: string;
  maxParticipants: number;
  priceType: string;
  priceCoins: number;
  scheduledStart: string | null;
  actualStart: string | null;
  currentParticipants: number;
  totalParticipants: number;
  totalEarnings: number;
  createdAt: string;
  participants: { user: { displayName: string; avatarUrl: string | null } }[];
}

export default function CreatorGroupRoomsPage() {
  const router = useRouter();
  const { showError, showSuccess } = useToastContext();
  const [rooms, setRooms] = useState<GroupRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/group-rooms/creator');
      const data = await res.json();
      if (res.ok) setRooms(data.rooms);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (roomId: string) => {
    try {
      const res = await fetch(`/api/group-rooms/${roomId}/start`, { method: 'POST' });
      if (res.ok) {
        showSuccess('Room started!');
        router.push(`/group-rooms/${roomId}`);
      }
    } catch {
      showError('Failed to start room');
    }
  };

  const handleEnd = async (roomId: string) => {
    if (!confirm('End this room? All participants will be disconnected.')) return;
    try {
      const res = await fetch(`/api/group-rooms/${roomId}/end`, { method: 'POST' });
      if (res.ok) {
        showSuccess('Room ended');
        fetchRooms();
      }
    } catch {
      showError('Failed to end room');
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400';
      case 'waiting': return 'bg-yellow-500/20 text-yellow-400';
      case 'scheduled': return 'bg-blue-500/20 text-blue-400';
      case 'ended': return 'bg-gray-500/20 text-gray-400';
      case 'cancelled': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const totalEarnings = rooms.reduce((sum, r) => sum + r.totalEarnings, 0);
  const activeRooms = rooms.filter(r => r.status === 'active' || r.status === 'waiting');

  return (
    <div className="min-h-screen bg-black text-white">
      <MobileHeader />
      <div className="max-w-2xl mx-auto p-4 pt-20 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <GlassCard className="p-3 text-center">
            <div className="text-2xl font-bold text-yellow-400">{totalEarnings}</div>
            <div className="text-xs text-gray-400">Total Earnings</div>
          </GlassCard>
          <GlassCard className="p-3 text-center">
            <div className="text-2xl font-bold">{rooms.length}</div>
            <div className="text-xs text-gray-400">Total Rooms</div>
          </GlassCard>
          <GlassCard className="p-3 text-center">
            <div className="text-2xl font-bold text-green-400">{activeRooms.length}</div>
            <div className="text-xs text-gray-400">Active Now</div>
          </GlassCard>
        </div>

        <GlassButton
          onClick={() => router.push('/creator/group-rooms/new')}
          className="w-full flex items-center justify-center gap-2"
        >
          <Plus size={18} /> Create Room
        </GlassButton>

        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner /></div>
        ) : rooms.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <p className="text-gray-400 mb-2">No group rooms yet</p>
            <p className="text-sm text-gray-500">
              Create group video rooms for coaching sessions, fitness classes, hangouts, and more.
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {rooms.map((room) => (
              <GlassCard key={room.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{room.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded capitalize ${statusBadge(room.status)}`}>
                        {room.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Users size={12} /> {room.currentParticipants}/{room.maxParticipants}
                      </span>
                      <span className="capitalize">{room.roomType}</span>
                      {room.priceType !== 'free' && (
                        <span className="flex items-center gap-1 text-yellow-400">
                          <Coins size={12} /> {room.priceCoins} {room.priceType === 'per_minute' ? '/min' : 'flat'}
                        </span>
                      )}
                      {room.priceType === 'free' && (
                        <span className="text-green-400">Free</span>
                      )}
                    </div>
                    {room.scheduledStart && (
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(room.scheduledStart).toLocaleString()}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-yellow-400">{room.totalEarnings} coins</div>
                    <div className="text-xs text-gray-500">{room.totalParticipants} total</div>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  {(room.status === 'scheduled' || room.status === 'waiting') && (
                    <button
                      onClick={() => handleStart(room.id)}
                      className="text-xs px-3 py-1 rounded bg-green-500/20 hover:bg-green-500/30 text-green-400 flex items-center gap-1"
                    >
                      <Play size={12} /> Start
                    </button>
                  )}
                  {room.status === 'active' && (
                    <>
                      <button
                        onClick={() => router.push(`/group-rooms/${room.id}`)}
                        className="text-xs px-3 py-1 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 flex items-center gap-1"
                      >
                        <Play size={12} /> Join
                      </button>
                      <button
                        onClick={() => handleEnd(room.id)}
                        className="text-xs px-3 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 flex items-center gap-1"
                      >
                        <Square size={12} /> End
                      </button>
                    </>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
