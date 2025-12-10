'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { ArrowLeft, Inbox, Check, X, Coins } from 'lucide-react';

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
        // Degraded state is handled gracefully - no need to log warnings
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
        router.push(`/chats/${data.conversationId}`);
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20 relative overflow-hidden">
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 -top-10 -left-10 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute w-96 h-96 top-1/3 right-10 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute w-96 h-96 bottom-10 left-1/3 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Mobile Header with Logo */}
      <MobileHeader />

      {/* Spacer for fixed mobile header */}
      <div className="md:hidden" style={{ height: 'calc(48px + env(safe-area-inset-top, 0px))' }} />

      <div className="container mx-auto px-4 py-6 md:py-10 max-w-4xl relative z-10">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-2">
            <button
              onClick={() => router.push('/chats')}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent">
                Message Requests
              </h1>
              <p className="text-gray-400 text-sm">Pending requests from fans</p>
            </div>
          </div>
        </div>

        {/* Requests List */}
        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-xl border-2 border-cyan-500/30 p-12 text-center shadow-[0_0_30px_rgba(34,211,238,0.2)]">
              <Inbox className="w-20 h-20 mx-auto mb-4 text-cyan-400" />
              <h3 className="text-2xl font-bold mb-2 text-white">No pending requests</h3>
              <p className="text-gray-400 text-lg mb-6">You're all caught up!</p>
              <button
                onClick={() => router.push('/chats')}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-semibold hover:scale-105 transition-transform shadow-lg"
              >
                Back to Chats
              </button>
            </div>
          ) : (
            requests.map((request) => (
              <div
                key={request.id}
                className="backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-xl border-2 border-cyan-500/30 p-5 hover:border-cyan-500/50 transition-all shadow-[0_0_20px_rgba(34,211,238,0.2)]"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-xl font-bold flex-shrink-0">
                    {request.fromUser.avatarUrl ? (
                      <img
                        src={request.fromUser.avatarUrl}
                        alt={request.fromUser.username || 'User'}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white">
                        {(request.fromUser.username || 'U')[0].toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="font-semibold text-white">
                        {request.fromUser.username}
                      </h3>
                      {request.isPaid && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                          <Coins className="w-3 h-3" />
                          {request.paidAmount} coins
                        </span>
                      )}
                      <span className="text-xs text-gray-500 ml-auto">
                        {formatTime(request.createdAt)}
                      </span>
                    </div>

                    <p className="text-gray-300 mb-4 whitespace-pre-wrap text-sm md:text-base">
                      {request.initialMessage}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleAccept(request.id)}
                        disabled={processing === request.id}
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-lg"
                      >
                        {processing === request.id ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Accept</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDecline(request.id)}
                        disabled={processing === request.id}
                        className="flex-1 px-4 py-2.5 bg-white/10 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/20 hover:border-red-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {processing === request.id ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <>
                            <X className="w-4 h-4" />
                            <span>Decline</span>
                          </>
                        )}
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
          <div className="mt-6 backdrop-blur-xl bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <h4 className="font-semibold text-white mb-1">About Message Requests</h4>
                <p className="text-sm text-gray-300">
                  Accepting a request creates a conversation with this fan. Declining removes the request.
                  Paid requests show the coin amount the fan paid to reach you.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
