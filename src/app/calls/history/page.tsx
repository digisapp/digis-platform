'use client';

import { useState, useEffect } from 'react';
import { GlassCard, GlassButton, LoadingSpinner } from '@/components/ui';

interface Call {
  id: string;
  status: string;
  creatorId: string;
  fanId: string;
  ratePerMinute: number;
  requestedAt: string;
  startedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  actualCoins?: number;
}

export default function CallHistoryPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCallHistory();
  }, []);

  const fetchCallHistory = async () => {
    try {
      // TODO: Create API route
      // For now, using mock data
      setCalls([]);
    } catch (error) {
      console.error('Error fetching call history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCallIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'active':
        return '📞';
      case 'cancelled':
        return '❌';
      case 'rejected':
        return '🚫';
      case 'pending':
        return '⏳';
      default:
        return '📱';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'active':
        return 'text-blue-400';
      case 'cancelled':
      case 'rejected':
        return 'text-red-400';
      case 'pending':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 -top-10 -left-10 bg-digis-cyan opacity-20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute w-96 h-96 top-1/3 right-10 bg-digis-pink opacity-20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">Call History</h1>
          <p className="text-gray-400">View your past video calls and stats</p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <GlassCard glow="cyan" padding="md">
            <p className="text-gray-400 mb-2">Total Calls</p>
            <p className="text-3xl font-bold text-white">0</p>
          </GlassCard>
          <GlassCard glow="pink" padding="md">
            <p className="text-gray-400 mb-2">Total Minutes</p>
            <p className="text-3xl font-bold text-white">0</p>
          </GlassCard>
          <GlassCard glow="purple" padding="md">
            <p className="text-gray-400 mb-2">Coins Spent</p>
            <p className="text-3xl font-bold text-white">0</p>
          </GlassCard>
        </div>

        {/* Call History */}
        <GlassCard glow="none" padding="lg">
          <h2 className="text-2xl font-bold text-white mb-6">Recent Calls</h2>

          {calls.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📞</div>
              <p className="text-gray-400 mb-4">No calls yet</p>
              <GlassButton variant="cyan" onClick={() => window.location.href = '/'}>
                Browse Creators
              </GlassButton>
            </div>
          ) : (
            <div className="space-y-4">
              {calls.map((call) => (
                <div
                  key={call.id}
                  className="glass glass-hover p-4 rounded-xl flex items-center justify-between"
                >
                  <div className="flex items-center space-x-4">
                    <div className="text-4xl">{getCallIcon(call.status)}</div>
                    <div>
                      <p className="text-white font-medium">
                        Call with Creator
                      </p>
                      <p className="text-sm text-gray-400">
                        {new Date(call.requestedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold capitalize ${getStatusColor(call.status)}`}>
                      {call.status}
                    </p>
                    {call.durationSeconds && (
                      <p className="text-sm text-gray-400">
                        {Math.ceil(call.durationSeconds / 60)} min • {call.actualCoins} coins
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
