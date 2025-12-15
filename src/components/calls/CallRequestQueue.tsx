'use client';

import { useEffect, useState } from 'react';
import { Phone, Video, Clock, X, Check, AlertCircle } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToastContext } from '@/context/ToastContext';

interface CallRequest {
  id: string;
  callerId: string;
  callerName: string;
  callerAvatar: string | null;
  callType: 'voice' | 'video';
  ratePerMinute: number;
  requestedAt: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  estimatedDuration?: number;
}

interface CallRequestQueueProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function CallRequestQueue({
  autoRefresh = true,
  refreshInterval = 5000,
}: CallRequestQueueProps) {
  const { showError } = useToastContext();
  const [requests, setRequests] = useState<CallRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingRequests();

    if (autoRefresh) {
      const interval = setInterval(fetchPendingRequests, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const fetchPendingRequests = async () => {
    try {
      const response = await fetch('/api/calls/pending');
      if (response.ok) {
        const data = await response.json();
        setRequests(data.calls || []);
      }
    } catch (error) {
      console.error('[CallRequestQueue] Error fetching requests:', error);
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
        const data = await response.json();
        // Redirect to call page
        window.location.href = `/calls/${callId}`;
      } else {
        const error = await response.json();
        showError(error.error || 'Failed to accept call');
      }
    } catch (error) {
      console.error('[CallRequestQueue] Error accepting call:', error);
      showError('Failed to accept call');
    } finally {
      setProcessingId(null);
      fetchPendingRequests();
    }
  };

  const handleReject = async (callId: string) => {
    setProcessingId(callId);

    try {
      const response = await fetch(`/api/calls/${callId}/reject`, {
        method: 'POST',
      });

      if (response.ok) {
        // Remove from list
        setRequests((prev) => prev.filter((r) => r.id !== callId));
      } else {
        const error = await response.json();
        showError(error.error || 'Failed to reject call');
      }
    } catch (error) {
      console.error('[CallRequestQueue] Error rejecting call:', error);
      showError('Failed to reject call');
    } finally {
      setProcessingId(null);
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date().getTime();
    const then = new Date(timestamp).getTime();
    const diffSeconds = Math.floor((now - then) / 1000);

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    return `${Math.floor(diffSeconds / 3600)}h ago`;
  };

  if (loading) {
    return (
      <div className="backdrop-blur-xl bg-black/40 rounded-xl p-6 border-2 border-yellow-400/30">
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="backdrop-blur-xl bg-black/40 rounded-xl p-6 border-2 border-yellow-400/30">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-yellow-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone className="w-8 h-8 text-yellow-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No Pending Requests</h3>
          <p className="text-gray-300 text-sm">
            Call requests will appear here when fans want to connect with you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Phone className="w-6 h-6 text-yellow-400" />
          Pending Requests
          {requests.length > 0 && (
            <span className="ml-2 px-3 py-1 bg-red-500 text-white text-sm font-bold rounded-full animate-pulse">
              {requests.length}
            </span>
          )}
        </h2>
      </div>

      <div className="space-y-3">
        {requests.map((request) => (
          <div
            key={request.id}
            className="backdrop-blur-xl bg-black/40 rounded-xl p-6 border-2 border-yellow-400/50 hover:border-yellow-400 hover:shadow-[0_0_30px_rgba(250,204,21,0.3)] transition-all"
          >
            <div className="flex items-start gap-4">
              {/* Caller Avatar */}
              <div className="flex-shrink-0">
                {request.callerAvatar ? (
                  <img
                    src={request.callerAvatar}
                    alt={request.callerName}
                    className="w-16 h-16 rounded-full object-cover border-2 border-yellow-400/50"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-cyan-400 flex items-center justify-center text-gray-900 font-bold text-xl border-2 border-yellow-400/50">
                    {request.callerName?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
              </div>

              {/* Call Info */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">
                      {request.callerName}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-300">
                      <div className="flex items-center gap-1">
                        {request.callType === 'video' ? (
                          <Video className="w-4 h-4 text-cyan-400" />
                        ) : (
                          <Phone className="w-4 h-4 text-yellow-400" />
                        )}
                        <span className="capitalize">{request.callType} Call</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{getTimeAgo(request.requestedAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Rate Badge */}
                  <div className="text-right">
                    <div className="flex items-center gap-1 font-bold">
                      <span className="text-2xl bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text text-transparent">{request.ratePerMinute}</span>
                    </div>
                    <p className="text-xs text-gray-300">coins/min</p>
                  </div>
                </div>

                {/* Estimated Earnings */}
                {request.estimatedDuration && (
                  <div className="mb-3 p-3 bg-yellow-400/10 border border-yellow-400/30 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-300">
                        Estimated {request.estimatedDuration}min call
                      </span>
                      <span className="font-bold bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text text-transparent">
                        ~{request.ratePerMinute * request.estimatedDuration} coins
                      </span>
                    </div>
                  </div>
                )}

                {/* Warning Notice */}
                <div className="mb-4 p-3 bg-cyan-400/10 border border-cyan-400/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-300">
                      You'll earn {request.ratePerMinute} coins/min while on the call. Timer starts
                      when you accept.
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleReject(request.id)}
                    disabled={processingId === request.id}
                    className="flex-1 px-4 py-3 backdrop-blur-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {processingId === request.id ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <X className="w-5 h-5" />
                        <span>Decline</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleAccept(request.id)}
                    disabled={processingId === request.id}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-gray-900 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 shadow-lg shadow-yellow-500/50 flex items-center justify-center gap-2"
                  >
                    {processingId === request.id ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        <span>Accept Call</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
