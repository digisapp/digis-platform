'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, Calendar, User } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MobileHeader } from '@/components/layout/MobileHeader';

interface Call {
  id: string;
  fanId: string;
  creatorId: string;
  status: string;
  ratePerMinute: number;
  durationSeconds: number | null;
  requestedAt: string;
  creator: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export default function CallsPage() {
  const router = useRouter();
  const [activeRequests, setActiveRequests] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCalls();
  }, []);

  const fetchCalls = async () => {
    try {
      const res = await fetch('/api/calls/history');
      if (!res.ok) throw new Error('Failed to fetch calls');

      const data = await res.json();
      const allCalls = data.calls || [];

      // Only show pending/accepted/active calls (things that need fan's attention)
      const active = allCalls.filter((call: Call) =>
        call.status === 'pending' || call.status === 'accepted' || call.status === 'active'
      );

      setActiveRequests(active);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching calls:', error);
      setLoading(false);
    }
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
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
      case 'accepted':
        return 'bg-blue-100 text-blue-700 border border-blue-200';
      case 'active':
        return 'bg-purple-100 text-purple-700 border border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Waiting for response';
      case 'accepted':
        return 'Ready to join';
      case 'active':
        return 'In progress';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-cyan-50 md:pl-20 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-cyan-50 md:pl-20">
      <MobileHeader />

      <div className="container mx-auto px-4 pt-14 md:pt-10 pb-24 md:pb-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Call Requests</h1>
          <p className="text-gray-600">Track your active call requests with creators</p>
        </div>

        {/* Active Requests */}
        {activeRequests.length > 0 ? (
          <div className="space-y-4">
            {activeRequests.map((call) => (
                <div
                  key={call.id}
                  onClick={() => {
                    if (call.status === 'accepted' || call.status === 'active') {
                      router.push(`/calls/${call.id}`);
                    }
                  }}
                  className={`backdrop-blur-xl bg-white/80 rounded-2xl border border-gray-200 p-6 transition-all shadow-sm ${
                    call.status === 'accepted' || call.status === 'active'
                      ? 'hover:border-purple-500/50 cursor-pointer'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Avatar */}
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {call.creator.avatarUrl ? (
                          <img
                            src={call.creator.avatarUrl}
                            alt={call.creator.displayName || call.creator.username}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-7 h-7" />
                        )}
                      </div>

                      {/* Call Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">
                            {call.creator.displayName || call.creator.username}
                          </h3>
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getStatusColor(call.status)}`}>
                            {getStatusText(call.status)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Requested {formatDate(call.requestedAt)}
                          </span>
                          <span className="text-gray-600">
                            {call.ratePerMinute} coins/min
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Join Button for Accepted/Active */}
                    {(call.status === 'accepted' || call.status === 'active') && (
                      <div>
                        <button
                          className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:scale-105 transition-all shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/calls/${call.id}`);
                          }}
                        >
                          {call.status === 'active' ? 'Rejoin Call' : 'Join Call'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="backdrop-blur-xl bg-white/80 rounded-3xl border border-gray-200 p-12 text-center shadow-sm">
            <Phone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No active call requests</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Request 1-on-1 video or voice calls with your favorite creators. Visit a creator's profile to get started!
            </p>
            <button
              onClick={() => router.push('/explore')}
              className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 text-white rounded-2xl font-bold hover:scale-105 transition-all shadow-sm"
            >
              Explore Creators
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
