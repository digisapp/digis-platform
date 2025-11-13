'use client';

import { useEffect, useState } from 'react';
import { Phone, Video, Clock, User, DollarSign, X, Check, AlertCircle } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

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
        alert(error.error || 'Failed to accept call');
      }
    } catch (error) {
      console.error('[CallRequestQueue] Error accepting call:', error);
      alert('Failed to accept call');
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
        alert(error.error || 'Failed to reject call');
      }
    } catch (error) {
      console.error('[CallRequestQueue] Error rejecting call:', error);
      alert('Failed to reject call');
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
      <div className="bg-white rounded-xl p-6 border-2 border-purple-200">
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 border-2 border-purple-200">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No Pending Requests</h3>
          <p className="text-gray-600 text-sm">
            Call requests will appear here when fans want to connect with you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Phone className="w-6 h-6 text-purple-500" />
          Call Requests
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
            className="bg-white rounded-xl p-6 border-2 border-purple-200 hover:border-digis-cyan transition-all"
          >
            <div className="flex items-start gap-4">
              {/* Caller Avatar */}
              <div className="flex-shrink-0">
                {request.callerAvatar ? (
                  <img
                    src={request.callerAvatar}
                    alt={request.callerName}
                    className="w-16 h-16 rounded-full object-cover border-2 border-purple-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl border-2 border-purple-200">
                    {request.callerName[0].toUpperCase()}
                  </div>
                )}
              </div>

              {/* Call Info */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      {request.callerName}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        {request.callType === 'video' ? (
                          <Video className="w-4 h-4 text-green-500" />
                        ) : (
                          <Phone className="w-4 h-4 text-blue-500" />
                        )}
                        <span className="capitalize">{request.callType} Call</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span>{getTimeAgo(request.requestedAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Rate Badge */}
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-green-600 font-bold">
                      <DollarSign className="w-5 h-5" />
                      <span className="text-2xl">{request.ratePerMinute}</span>
                    </div>
                    <p className="text-xs text-gray-600">per minute</p>
                  </div>
                </div>

                {/* Estimated Earnings */}
                {request.estimatedDuration && (
                  <div className="mb-3 p-3 bg-gradient-to-r from-yellow-50 to-green-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">
                        Estimated {request.estimatedDuration}min call
                      </span>
                      <span className="font-bold text-green-700">
                        ~${(request.ratePerMinute * request.estimatedDuration) / 100} earnings
                      </span>
                    </div>
                  </div>
                )}

                {/* Warning Notice */}
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-700">
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
                    className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 shadow-lg flex items-center justify-center gap-2"
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
