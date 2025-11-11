'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

type MessageRequest = {
  id: string;
  fromUser: {
    id: string;
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
    role: string;
  };
  initialMessage: string;
  isPaid: boolean;
  paidAmount: number;
  createdAt: Date;
};

export default function MessageRequestsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [requests, setRequests] = useState<MessageRequest[]>([]);

  useEffect(() => {
    checkAuth();
    fetchRequests();

    // Subscribe to real-time updates
    const supabase = createClient();
    const channel = supabase
      .channel('message-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_requests',
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/');
      return;
    }
  };

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/messages/requests');
      const result = await response.json();

      if (response.ok && result.data) {
        setRequests(result.data || []);
        if (result.degraded) {
          console.warn('Message requests data degraded:', result.error);
        }
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId: string) => {
    setProcessing(requestId);

    try {
      const response = await fetch(`/api/messages/requests/${requestId}/accept`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        // Navigate to the new conversation
        router.push(`/messages/${data.conversationId}`);
      }
    } catch (error) {
      console.error('Error accepting request:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleDecline = async (requestId: string) => {
    setProcessing(requestId);

    try {
      const response = await fetch(`/api/messages/requests/${requestId}/decline`, {
        method: 'POST',
      });

      if (response.ok) {
        fetchRequests();
      }
    } catch (error) {
      console.error('Error declining request:', error);
    } finally {
      setProcessing(null);
    }
  };

  const formatTime = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (hours < 24) {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (hours < 48) {
      return 'Yesterday';
    } else {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-pastel-gradient flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pastel-gradient">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push('/messages')}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Message Requests 📬</h1>
              <p className="text-gray-600">Pending message requests from fans</p>
            </div>
          </div>
        </div>

        {/* Requests List */}
        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No pending requests</h3>
              <p className="text-gray-600 mb-6">You're all caught up!</p>
              <button
                onClick={() => router.push('/messages')}
                className="px-6 py-3 bg-gradient-to-r from-digis-cyan to-digis-pink text-gray-900 rounded-lg font-semibold hover:scale-105 transition-transform"
              >
                Back to Messages
              </button>
            </div>
          ) : (
            requests.map((request) => (
              <div
                key={request.id}
                className="glass rounded-xl border border-purple-200 p-6 hover:border-digis-cyan hover:bg-white/80 transition-all"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-xl font-bold flex-shrink-0">
                    {request.fromUser.avatarUrl ? (
                      <img
                        src={request.fromUser.avatarUrl}
                        alt={request.fromUser.displayName || 'User'}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white">
                        {(request.fromUser.displayName || request.fromUser.username || 'U')[0].toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-800">
                        {request.fromUser.displayName || request.fromUser.username}
                      </h3>
                      {request.isPaid && (
                        <span className="text-xs bg-green-500/20 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                          💰 Paid {request.paidAmount} tokens
                        </span>
                      )}
                      <span className="text-xs text-gray-600 ml-auto">
                        {formatTime(request.createdAt)}
                      </span>
                    </div>

                    <p className="text-gray-700 mb-4 whitespace-pre-wrap">
                      {request.initialMessage}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleAccept(request.id)}
                        disabled={processing === request.id}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-semibold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      >
                        {processing === request.id ? 'Accepting...' : 'Accept & Reply'}
                      </button>
                      <button
                        onClick={() => handleDecline(request.id)}
                        disabled={processing === request.id}
                        className="flex-1 px-4 py-2 bg-white/60 border border-purple-200 text-gray-800 rounded-lg font-semibold hover:bg-white/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processing === request.id ? 'Declining...' : 'Decline'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Info Card */}
        {requests.length > 0 && (
          <div className="mt-6 bg-digis-cyan/10 border border-digis-cyan/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">About Message Requests</h4>
                <p className="text-sm text-gray-700">
                  Accepting a request creates a conversation with this fan. Declining removes the request.
                  Paid requests show the token amount the fan paid to reach you.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
