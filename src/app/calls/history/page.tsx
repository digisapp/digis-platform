'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, Clock, Coins, Calendar, TrendingUp, User } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';

interface CallHistoryItem {
  id: string;
  fanId: string;
  creatorId: string;
  status: string;
  ratePerMinute: number;
  estimatedCoins: number;
  actualCoins: number | null;
  durationSeconds: number | null;
  requestedAt: string;
  startedAt: string | null;
  endedAt: string | null;
  fan: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  creator: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

interface Stats {
  totalCalls: number;
  totalMinutes: number;
  totalCoinsSpent: number;
  totalCoinsEarned: number;
}

export default function CallHistoryPage() {
  const router = useRouter();
  const [calls, setCalls] = useState<CallHistoryItem[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalCalls: 0,
    totalMinutes: 0,
    totalCoinsSpent: 0,
    totalCoinsEarned: 0,
  });
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchCallHistory();
  }, []);

  const fetchCallHistory = async () => {
    try {
      const res = await fetch('/api/calls/history');
      if (!res.ok) throw new Error('Failed to fetch call history');
      
      const data = await res.json();
      setCalls(data.calls);
      
      // Calculate stats
      const completedCalls = data.calls.filter((call: CallHistoryItem) => call.status === 'completed');
      const totalMinutes = completedCalls.reduce((sum: number, call: CallHistoryItem) => {
        return sum + (call.durationSeconds ? Math.ceil(call.durationSeconds / 60) : 0);
      }, 0);
      
      // Determine current user ID from first call
      if (data.calls.length > 0) {
        const firstCall = data.calls[0];
        // The user making the request is the one viewing the history
        setUserId(firstCall.fanId);
      }
      
      const totalCoinsSpent = completedCalls
        .filter((call: CallHistoryItem) => call.fanId === data.calls[0]?.fanId)
        .reduce((sum: number, call: CallHistoryItem) => sum + (call.actualCoins || 0), 0);
      
      const totalCoinsEarned = completedCalls
        .filter((call: CallHistoryItem) => call.creatorId === data.calls[0]?.creatorId)
        .reduce((sum: number, call: CallHistoryItem) => sum + (call.actualCoins || 0), 0);
      
      setStats({
        totalCalls: completedCalls.length,
        totalMinutes,
        totalCoinsSpent,
        totalCoinsEarned,
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching call history:', error);
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.ceil(seconds / 60);
    return `${mins} min`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'active':
        return 'text-digis-cyan';
      case 'rejected':
      case 'cancelled':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-pastel-gradient py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-gray-700">Loading call history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pastel-gradient py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Phone className="w-5 h-5 text-digis-cyan" />
              <span className="text-gray-600 text-sm">Total Calls</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{stats.totalCalls}</p>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-purple-400" />
              <span className="text-gray-600 text-sm">Total Minutes</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{stats.totalMinutes}</p>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <span className="text-gray-600 text-sm">Coins Earned</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{stats.totalCoinsEarned}</p>
          </GlassCard>
        </div>

        {/* Call List */}
        {calls.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <Phone className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">No calls yet</h3>
            <p className="text-gray-600 mb-6">Your call history will appear here</p>
            <GlassButton onClick={() => router.push('/explore')}>
              Browse Creators
            </GlassButton>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {calls.map((call) => {
              const otherUser = call.fan.id === userId ? call.creator : call.fan;
              const isCreator = call.creator.id === userId;
              
              return (
                <GlassCard key={call.id} className="p-6 hover:bg-white/5 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-digis-cyan to-purple-500 flex items-center justify-center text-white font-bold">
                        {otherUser.avatarUrl ? (
                          <img
                            src={otherUser.avatarUrl}
                            alt={otherUser.displayName || otherUser.username}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-6 h-6" />
                        )}
                      </div>

                      {/* Call Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-gray-800">
                            {otherUser.displayName || otherUser.username}
                          </h3>
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(call.status)}`}>
                            {call.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(call.requestedAt)}
                          </span>
                          {call.durationSeconds && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatDuration(call.durationSeconds)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Coins */}
                    <div className="text-right">
                      {call.actualCoins !== null ? (
                        <div className={`text-2xl font-bold ${isCreator ? 'text-green-600' : 'text-yellow-600'}`}>
                          {isCreator ? '+' : '-'}{call.actualCoins}
                          <span className="text-sm text-gray-600 ml-1">coins</span>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-600">
                          {call.status === 'pending' ? 'Pending' : 'No charge'}
                        </div>
                      )}
                      <div className="text-xs text-gray-600 mt-1">
                        {call.ratePerMinute} coins/min
                      </div>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
