'use client';

import { useState, useEffect } from 'react';
import { GlassCard, GlassButton, LoadingSpinner } from '@/components/ui';
import { Phone, CheckCircle, XCircle, Clock } from 'lucide-react';

interface PendingCall {
  id: string;
  fanId: string;
  ratePerMinute: number;
  estimatedCoins: number;
  requestedAt: string;
  fan: {
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export function PendingCalls() {
  const [calls, setCalls] = useState<PendingCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingCalls();

    // Poll for new calls every 30 seconds
    const interval = setInterval(fetchPendingCalls, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPendingCalls = async () => {
    try {
      const response = await fetch('/api/calls/pending');
      const data = await response.json();

      if (response.ok) {
        setCalls(data.calls);
      }
    } catch (err) {
      console.error('Error fetching pending calls:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (callId: string) => {
    setProcessingId(callId);

    try {
      const response = await fetch(`/api/calls/${callId}/accept`, {
        method: 'POST',
      });

      if (response.ok) {
        // Remove from pending list
        setCalls(calls.filter((call) => call.id !== callId));
        alert('Call accepted! Fan has been notified.');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to accept call');
      }
    } catch (err) {
      alert('Failed to accept call');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (callId: string) => {
    if (!confirm('Are you sure you want to reject this call request?')) {
      return;
    }

    setProcessingId(callId);

    try {
      const response = await fetch(`/api/calls/${callId}/reject`, {
        method: 'POST',
      });

      if (response.ok) {
        // Remove from pending list
        setCalls(calls.filter((call) => call.id !== callId));
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to reject call');
      }
    } catch (err) {
      alert('Failed to reject call');
    } finally {
      setProcessingId(null);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <GlassCard className="p-8">
        <div className="flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-digis-pink/20 rounded-lg">
          <Phone className="w-6 h-6 text-digis-pink" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white">Pending Call Requests</h2>
          <p className="text-sm text-gray-400">
            {calls.length === 0 ? 'No pending requests' : `${calls.length} pending`}
          </p>
        </div>
        {calls.length > 0 && (
          <div className="px-3 py-1 bg-red-500/20 border border-red-500 rounded-full">
            <span className="text-red-300 font-semibold text-sm">{calls.length}</span>
          </div>
        )}
      </div>

      {calls.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📞</div>
          <p className="text-gray-400 mb-2">No pending call requests</p>
          <p className="text-sm text-gray-500">
            When fans request calls, they&apos;ll appear here
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {calls.map((call) => (
            <div
              key={call.id}
              className="glass glass-hover p-4 rounded-xl border border-white/10"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Fan Info */}
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-white font-bold">
                    {call.fan.displayName?.[0] || call.fan.username?.[0] || '?'}
                  </div>
                  <div>
                    <p className="font-semibold text-white">
                      {call.fan.displayName || call.fan.username}
                    </p>
                    <p className="text-sm text-gray-400">@{call.fan.username}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{getTimeAgo(call.requestedAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Call Details */}
                <div className="text-right">
                  <p className="text-sm text-gray-400">Estimated hold</p>
                  <p className="text-xl font-bold bg-gradient-to-r from-digis-cyan to-digis-pink bg-clip-text text-transparent">
                    {call.estimatedCoins} coins
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {call.ratePerMinute} coins/min
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4">
                <GlassButton
                  variant="gradient"
                  onClick={() => handleAccept(call.id)}
                  disabled={processingId === call.id}
                  className="flex-1"
                >
                  {processingId === call.id ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Accept
                    </>
                  )}
                </GlassButton>
                <GlassButton
                  variant="ghost"
                  onClick={() => handleReject(call.id)}
                  disabled={processingId === call.id}
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </GlassButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
