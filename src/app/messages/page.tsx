'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MobileWalletWidget } from '@/components/ui/MobileWalletWidget';
import { Search, X, Pin, Archive, MoreVertical, Users } from 'lucide-react';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [userRole, setUserRole] = useState<string>('fan');
  const [pendingRequests, setPendingRequests] = useState(0);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

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
      const result = await response.json();

      if (response.ok && result.data) {
        setConversations(result.data || []);
        if (result.degraded) {
          console.warn('Conversations data degraded:', result.error);
        }
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePinConversation = async (conversationId: string) => {
    const conv = conversations.find(c => c.id === conversationId);
    if (!conv) return;

    try {
      const response = await fetch(`/api/messages/conversations/${conversationId}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: !conv.isPinned }),
      });

      if (response.ok) {
        setConversations(conversations.map(c =>
          c.id === conversationId ? { ...c, isPinned: !c.isPinned } : c
        ));
      }
    } catch (error) {
      console.error('Error pinning conversation:', error);
    }
    setActiveMenu(null);
  };

  const handleArchiveConversation = async (conversationId: string) => {
    const conv = conversations.find(c => c.id === conversationId);
    if (!conv) return;

    try {
      const response = await fetch(`/api/messages/conversations/${conversationId}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: !conv.isArchived }),
      });

      if (response.ok) {
        setConversations(conversations.map(c =>
          c.id === conversationId ? { ...c, isArchived: !c.isArchived } : c
        ));
      }
    } catch (error) {
      console.error('Error archiving conversation:', error);
    }
    setActiveMenu(null);
  };

  const filteredConversations = conversations
    .filter((conv) => {
      // Don't show archived conversations
      if (conv.isArchived) return false;

      // Filter by unread
      if (filter === 'unread' && conv.unreadCount === 0) return false;

      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const displayName = (conv.otherUser.displayName || '').toLowerCase();
        const username = (conv.otherUser.username || '').toLowerCase();
        const lastMessage = (conv.lastMessageText || '').toLowerCase();

        return displayName.includes(query) || username.includes(query) || lastMessage.includes(query);
      }

      return true;
    })
    .sort((a, b) => {
      // Pinned conversations first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      // Then by last message date
      const dateA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const dateB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return dateB - dateA;
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
      <div className="min-h-screen bg-pastel-gradient flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pastel-gradient">
      <div className="container mx-auto max-w-7xl">
        {/* Mobile Wallet Widget */}
        <MobileWalletWidget />

        <div className="px-4">
        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
          {/* Left Column: Conversations Sidebar */}
          <div className="flex flex-col h-[calc(100vh-180px)]">
            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-12 pr-12 py-3 glass border border-purple-200 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:border-digis-cyan transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all min-h-[44px] ${
                  filter === 'all'
                    ? 'bg-digis-cyan text-gray-900'
                    : 'bg-white/50 text-gray-700 hover:bg-white/70'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all min-h-[44px] ${
                  filter === 'unread'
                    ? 'bg-digis-cyan text-gray-900'
                    : 'bg-white/50 text-gray-700 hover:bg-white/70'
                }`}
              >
                Unread
                {conversations.filter((c) => c.unreadCount > 0).length > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {conversations.filter((c) => c.unreadCount > 0).length}
                  </span>
                )}
              </button>

              {/* Creator Actions */}
              {userRole === 'creator' && (
                <>
                  <button
                    onClick={() => router.push('/creator/messages/broadcast')}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:scale-105 transition-transform flex items-center gap-2 shadow-lg min-h-[44px]"
                  >
                    <Users className="w-4 h-4" />
                    <span className="hidden sm:inline">Mass Message</span>
                  </button>
                  {pendingRequests > 0 && (
                    <button
                      onClick={() => router.push('/messages/requests')}
                      className="px-4 py-2 bg-gradient-to-r from-digis-cyan to-digis-pink text-white rounded-lg font-semibold hover:scale-105 transition-transform flex items-center gap-2 min-h-[44px]"
                    >
                      <span className="hidden sm:inline">Requests</span>
                      <span className="sm:hidden">📬</span>
                      <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {pendingRequests}
                      </span>
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {filteredConversations.length === 0 ? (
                <div className="glass rounded-xl border-2 border-purple-200 p-8 text-center">
                  <div className="text-5xl mb-3">📭</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {filter === 'unread' ? 'No unread messages' : 'No messages yet'}
                  </h3>
                  <p className="text-sm text-gray-700 mb-4">
                    {filter === 'unread'
                      ? 'All caught up!'
                      : 'Start a conversation with a creator'}
                  </p>
                  {filter === 'all' && (
                    <button
                      onClick={() => router.push('/explore')}
                      className="px-6 py-3 bg-gradient-to-r from-digis-cyan to-digis-pink text-white rounded-lg font-semibold hover:scale-105 transition-transform min-h-[44px]"
                    >
                      Explore Creators
                    </button>
                  )}
                </div>
              ) : (
                filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className="relative w-full glass rounded-xl border border-purple-200 p-4 hover:border-digis-cyan hover:bg-white/80 transition-all cursor-pointer min-h-[80px]"
                    onClick={() => router.push(`/messages/${conversation.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
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
                          {conversation.isPinned && (
                            <Pin className="w-4 h-4 text-digis-cyan fill-digis-cyan" />
                          )}
                          <h3 className={`font-semibold truncate ${conversation.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                            {conversation.otherUser.displayName || conversation.otherUser.username}
                          </h3>
                          {conversation.otherUser.role === 'creator' && (
                            <span className="text-xs bg-digis-cyan/20 text-digis-cyan px-2 py-0.5 rounded-full flex-shrink-0">
                              Creator
                            </span>
                          )}
                        </div>
                        <p className={`text-sm truncate ${conversation.unreadCount > 0 ? 'text-gray-800 font-medium' : 'text-gray-600'}`}>
                          {conversation.lastMessageText || 'Start a conversation'}
                        </p>
                      </div>

                      {/* Time */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-gray-600">
                          {formatTime(conversation.lastMessageAt)}
                        </p>
                      </div>
                    </div>

                    {/* Menu Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(activeMenu === conversation.id ? null : conversation.id);
                      }}
                      className="absolute top-4 right-4 p-2 text-gray-600 hover:text-gray-800 hover:bg-white/60 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>

                    {/* Dropdown Menu */}
                    {activeMenu === conversation.id && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setActiveMenu(null)}
                        />
                        <div className="absolute top-14 right-4 z-50 glass border border-purple-200 rounded-xl shadow-lg overflow-hidden min-w-[160px]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePinConversation(conversation.id);
                            }}
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/60 transition-colors text-left min-h-[44px]"
                          >
                            <Pin className="w-4 h-4 text-gray-700" />
                            <span className="text-sm font-semibold text-gray-900">
                              {conversation.isPinned ? 'Unpin' : 'Pin'}
                            </span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArchiveConversation(conversation.id);
                            }}
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/60 transition-colors text-left border-t border-purple-100 min-h-[44px]"
                          >
                            <Archive className="w-4 h-4 text-gray-700" />
                            <span className="text-sm font-semibold text-gray-900">Archive</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Message Panel (Empty State) */}
          <div className="hidden lg:flex items-center justify-center glass rounded-3xl border-2 border-purple-200 p-12 h-[calc(100vh-180px)]">
            <div className="text-center max-w-md">
              <div className="text-7xl mb-6">💬</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Select a Conversation
              </h2>
              <p className="text-gray-700 text-lg mb-8">
                Choose a conversation from the sidebar to start messaging
              </p>
              <div className="glass rounded-xl border-2 border-purple-200 p-6 bg-gradient-to-br from-digis-cyan/5 to-digis-pink/5">
                <h3 className="font-semibold text-gray-900 mb-3">Quick Tips:</h3>
                <ul className="text-sm text-gray-700 space-y-2 text-left">
                  <li className="flex items-start gap-2">
                    <span className="text-digis-cyan mt-0.5">•</span>
                    <span>Pin important conversations to keep them at the top</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-digis-pink mt-0.5">•</span>
                    <span>Use the search bar to quickly find conversations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-digis-purple mt-0.5">•</span>
                    <span>Filter by unread to catch up on new messages</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
