'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Search, X, Pin, Archive, MoreVertical, Users, MessageCircle, Inbox, Plus, Sparkles } from 'lucide-react';

type SuggestedCreator = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  isOnline: boolean;
  followerCount: number;
  primaryCategory: string | null;
};

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

export function ChatsSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<ConversationWithOtherUser[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [userRole, setUserRole] = useState<string>('fan');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [suggestedCreators, setSuggestedCreators] = useState<SuggestedCreator[]>([]);
  const [loadingCreators, setLoadingCreators] = useState(false);
  const [creatorSearchQuery, setCreatorSearchQuery] = useState('');

  // Get active conversation ID from pathname
  const activeConversationId = pathname?.startsWith('/chats/') && pathname !== '/chats/requests'
    ? pathname.split('/')[2]
    : null;

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
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/messages/conversations');
      const result = await response.json();

      if (response.ok && result.data) {
        setConversations(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestedCreators = async () => {
    setLoadingCreators(true);
    try {
      const response = await fetch('/api/explore?limit=20');
      const result = await response.json();
      if (response.ok && result.data?.creators) {
        setSuggestedCreators(result.data.creators);
      }
    } catch (error) {
      console.error('Error fetching creators:', error);
    } finally {
      setLoadingCreators(false);
    }
  };

  const handleStartNewChat = () => {
    setShowNewMessage(true);
    if (suggestedCreators.length === 0) {
      fetchSuggestedCreators();
    }
  };

  const handleSelectCreator = (username: string) => {
    router.push(`/${username}`);
  };

  const handleSelectConversation = (conversationId: string) => {
    setShowNewMessage(false);
    router.push(`/chats/${conversationId}`);
  };

  const filteredCreators = suggestedCreators.filter(creator => {
    if (!creatorSearchQuery.trim()) return true;
    const query = creatorSearchQuery.toLowerCase();
    return (
      creator.username?.toLowerCase().includes(query) ||
      creator.displayName?.toLowerCase().includes(query) ||
      creator.bio?.toLowerCase().includes(query)
    );
  });

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
      if (!conv.otherUser) return false;
      if (conv.isArchived) return false;
      if (filter === 'unread' && conv.unreadCount === 0) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const displayName = (conv.otherUser?.displayName || '').toLowerCase();
        const username = (conv.otherUser?.username || '').toLowerCase();
        const lastMessage = (conv.lastMessageText || '').toLowerCase();
        return displayName.includes(query) || username.includes(query) || lastMessage.includes(query);
      }

      return true;
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
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
      <div className="flex flex-col h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-cyan-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search conversations..."
          className="w-full pl-12 pr-12 py-3 backdrop-blur-2xl bg-black/40 border-2 border-cyan-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors shadow-[0_0_20px_rgba(34,211,238,0.2)]"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-cyan-400 hover:text-cyan-300"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={handleStartNewChat}
          className={`px-4 py-2.5 min-h-[44px] rounded-full font-semibold text-sm transition-all duration-200 flex items-center gap-2 ${
            showNewMessage
              ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg'
              : 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-lg hover:scale-105'
          }`}
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          New
        </button>

        <button
          onClick={() => { setFilter('all'); setShowNewMessage(false); }}
          className={`px-4 py-2.5 min-h-[44px] rounded-full font-semibold text-sm transition-all duration-200 ${
            filter === 'all' && !showNewMessage
              ? 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-lg'
              : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-cyan-500/30'
          }`}
        >
          All
        </button>
        <button
          onClick={() => { setFilter('unread'); setShowNewMessage(false); }}
          className={`px-4 py-2.5 min-h-[44px] rounded-full font-semibold text-sm transition-all duration-200 flex items-center gap-2 ${
            filter === 'unread' && !showNewMessage
              ? 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-lg'
              : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-cyan-500/30'
          }`}
        >
          Unread
          {conversations.filter((c) => c.unreadCount > 0).length > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
              {conversations.filter((c) => c.unreadCount > 0).length}
            </span>
          )}
        </button>

        {userRole === 'creator' && (
          <button
            onClick={() => router.push('/creator/chats/broadcast')}
            className="px-4 py-2.5 min-h-[44px] bg-white/5 text-gray-300 hover:bg-white/10 border border-cyan-500/30 rounded-full font-semibold text-sm transition-all duration-200 flex items-center gap-2"
          >
            <Users className="w-4 h-4" strokeWidth={2} />
            Mass
          </button>
        )}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-2">
        {filteredConversations.length === 0 && !showNewMessage ? (
          <div className="backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-xl border-2 border-cyan-500/30 p-8 text-center shadow-[0_0_30px_rgba(34,211,238,0.2)]">
            <Inbox className="w-16 h-16 mx-auto mb-4 text-cyan-400" />
            <h3 className="text-xl font-bold mb-2 text-white">
              {filter === 'unread' ? 'No unread chats' : 'No chats yet'}
            </h3>
            <p className="text-gray-400 mb-4">Start a conversation with a creator</p>
            <button
              onClick={handleStartNewChat}
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-purple-600 text-white rounded-xl font-semibold hover:scale-105 transition-transform flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              Find Creators
            </button>
          </div>
        ) : showNewMessage ? (
          <div className="space-y-3">
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-pink-400" />
              <input
                type="text"
                value={creatorSearchQuery}
                onChange={(e) => setCreatorSearchQuery(e.target.value)}
                placeholder="Search creators..."
                className="w-full pl-12 pr-4 py-3 backdrop-blur-2xl bg-black/40 border-2 border-pink-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 transition-colors"
              />
            </div>
            {loadingCreators ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : filteredCreators.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                <p className="text-gray-400">No creators found</p>
              </div>
            ) : (
              filteredCreators.map((creator) => (
                <div
                  key={creator.id}
                  onClick={() => handleSelectCreator(creator.username)}
                  className="flex items-center gap-4 p-4 rounded-xl backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 border-2 border-pink-500/30 hover:border-pink-500/50 cursor-pointer transition-all"
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                      {creator.avatarUrl ? (
                        <img src={creator.avatarUrl} alt={creator.username} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-white font-bold">{creator.username?.[0]?.toUpperCase() || '?'}</span>
                      )}
                    </div>
                    {creator.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white truncate">{creator.displayName || creator.username}</h3>
                      <span className="text-xs bg-pink-500/20 text-pink-400 px-2 py-0.5 rounded-full">Creator</span>
                    </div>
                    <p className="text-sm text-gray-400 truncate">@{creator.username}</p>
                  </div>
                  <MessageCircle className="w-5 h-5 text-pink-400 flex-shrink-0" />
                </div>
              ))
            )}
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`relative w-full backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-xl border-2 p-4 hover:scale-[1.02] transition-all cursor-pointer min-h-[80px] shadow-[0_0_20px_rgba(34,211,238,0.2)] ${
                activeConversationId === conversation.id
                  ? 'border-cyan-400 bg-cyan-500/10'
                  : 'border-cyan-500/30 hover:border-cyan-500/50'
              }`}
              onClick={() => handleSelectConversation(conversation.id)}
            >
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-xl font-bold">
                    {conversation.otherUser.avatarUrl ? (
                      <img
                        src={conversation.otherUser.avatarUrl}
                        alt={conversation.otherUser.username || 'User'}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white">
                        {conversation.otherUser.username?.[0]?.toUpperCase() || '?'}
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
                <div className="flex-1 min-w-0 pr-10">
                  <div className="flex items-center gap-2 mb-1">
                    {conversation.isPinned && (
                      <Pin className="w-4 h-4 text-digis-cyan fill-digis-cyan" />
                    )}
                    <h3 className={`font-semibold truncate ${conversation.unreadCount > 0 ? 'text-white' : 'text-gray-300'}`}>
                      {conversation.otherUser.username}
                    </h3>
                    {conversation.otherUser.role === 'creator' && (
                      <span className="text-xs bg-digis-cyan/20 text-digis-cyan px-2 py-0.5 rounded-full flex-shrink-0">
                        Creator
                      </span>
                    )}
                  </div>
                  <p className={`text-sm truncate ${conversation.unreadCount > 0 ? 'text-white font-medium' : 'text-gray-400'}`}>
                    {conversation.lastMessageText || 'Start a conversation'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
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
                className="absolute top-4 right-4 p-2 text-cyan-400 hover:text-cyan-300 hover:bg-white/10 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
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
                  <div className="absolute top-14 right-4 z-50 backdrop-blur-2xl bg-gradient-to-br from-black/60 via-gray-900/80 to-black/60 border-2 border-cyan-500/30 rounded-xl shadow-[0_0_30px_rgba(34,211,238,0.3)] overflow-hidden min-w-[160px]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePinConversation(conversation.id);
                      }}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/10 transition-colors text-left min-h-[44px]"
                    >
                      <Pin className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm font-semibold text-white">
                        {conversation.isPinned ? 'Unpin' : 'Pin'}
                      </span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArchiveConversation(conversation.id);
                      }}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/10 transition-colors text-left border-t border-cyan-500/20 min-h-[44px]"
                    >
                      <Archive className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm font-semibold text-white">Archive</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
