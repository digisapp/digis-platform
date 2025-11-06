'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

type ConversationWithOtherUser = {
  id: string;
  otherUser: {
    id: string;
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
    role: string;
  };
  lastMessageText: string | null;
  lastMessageAt: Date | null;
  unreadCount: number;
  isPinned: boolean;
  isArchived: boolean;
};

export default function MessagesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<ConversationWithOtherUser[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [userRole, setUserRole] = useState<string>('fan');
  const [pendingRequests, setPendingRequests] = useState(0);

  useEffect(() => {
    checkAuth();
    fetchConversations();

    // Subscribe to real-time updates
    const supabase = createClient();
    const channel = supabase
      .channel('messages-inbox')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          fetchConversations();
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

    // Get user role
    try {
      const response = await fetch('/api/user/profile');
      const data = await response.json();
      if (data.user?.role) {
        setUserRole(data.user.role);

        // Fetch pending requests if creator
        if (data.user.role === 'creator') {
          fetchPendingRequests();
        }
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const response = await fetch('/api/messages/requests');
      const data = await response.json();

      if (response.ok) {
        setPendingRequests(data.requests?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/messages/conversations');
      const data = await response.json();

      if (response.ok) {
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    if (filter === 'unread') return conv.unreadCount > 0;
    return true;
  });

  const formatTime = (date: Date | null) => {
    if (!date) return '';
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
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-white">Messages 💬</h1>
            {userRole === 'creator' && pendingRequests > 0 && (
              <button
                onClick={() => router.push('/messages/requests')}
                className="px-4 py-2 bg-gradient-to-r from-digis-cyan to-digis-pink rounded-lg font-semibold hover:scale-105 transition-transform flex items-center gap-2"
              >
                <span>📬</span>
                <span>Requests</span>
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {pendingRequests}
                </span>
              </button>
            )}
          </div>
          <p className="text-gray-400">Your conversations</p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'all'
                ? 'bg-digis-cyan text-black'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'unread'
                ? 'bg-digis-cyan text-black'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            Unread
            {conversations.filter((c) => c.unreadCount > 0).length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {conversations.filter((c) => c.unreadCount > 0).length}
              </span>
            )}
          </button>
        </div>

        {/* Conversations List */}
        <div className="space-y-2">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {filter === 'unread' ? 'No unread messages' : 'No messages yet'}
              </h3>
              <p className="text-gray-400 mb-6">
                {filter === 'unread'
                  ? 'All caught up!'
                  : 'Start a conversation with a creator'}
              </p>
              {filter === 'all' && (
                <button
                  onClick={() => router.push('/explore')}
                  className="px-6 py-3 bg-gradient-to-r from-digis-cyan to-digis-pink rounded-lg font-semibold hover:scale-105 transition-transform"
                >
                  Explore Creators
                </button>
              )}
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => router.push(`/messages/${conversation.id}`)}
                className="w-full bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-4 hover:border-digis-cyan hover:bg-black/60 transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-xl font-bold">
                      {conversation.otherUser.avatarUrl ? (
                        <img
                          src={conversation.otherUser.avatarUrl}
                          alt={conversation.otherUser.displayName || 'User'}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-white">
                          {(conversation.otherUser.displayName || conversation.otherUser.username || 'U')[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    {conversation.unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                        {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-semibold ${conversation.unreadCount > 0 ? 'text-white' : 'text-gray-300'}`}>
                        {conversation.otherUser.displayName || conversation.otherUser.username}
                      </h3>
                      {conversation.otherUser.role === 'creator' && (
                        <span className="text-xs bg-digis-cyan/20 text-digis-cyan px-2 py-0.5 rounded-full">
                          Creator
                        </span>
                      )}
                    </div>
                    <p className={`text-sm truncate ${conversation.unreadCount > 0 ? 'text-gray-300 font-medium' : 'text-gray-500'}`}>
                      {conversation.lastMessageText || 'Start a conversation'}
                    </p>
                  </div>

                  {/* Time */}
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {formatTime(conversation.lastMessageAt)}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
