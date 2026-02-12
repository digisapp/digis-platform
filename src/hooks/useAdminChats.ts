'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Participant {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
}

interface ConversationItem {
  id: string;
  lastMessageText: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  messageCount: number;
  user1: Participant;
  user2: Participant;
}

interface MessageItem {
  id: string;
  content: string;
  messageType: string | null;
  createdAt: string;
  mediaUrl: string | null;
  mediaType: string | null;
  isLocked: boolean;
  unlockPrice: number | null;
  tipAmount: number | null;
  isAiGenerated: boolean;
  sender: Participant;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Stats {
  totalConversations: number;
  totalMessages: number;
  activeToday: number;
}

const SEARCH_DEBOUNCE_MS = 300;

export function useAdminChats() {
  const router = useRouter();

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 20, total: 0, totalPages: 0,
  });
  const [stats, setStats] = useState<Stats | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Conversation detail state
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<{ user1: Participant; user2: Participant } | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesPagination, setMessagesPagination] = useState<Pagination>({
    page: 1, limit: 50, total: 0, totalPages: 0,
  });

  // Fetch conversations list
  const fetchConversations = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({
        search, page: pagination.page.toString(), limit: pagination.limit.toString(),
      });
      const response = await fetch(`/api/admin/chats?${params}`);
      const result = await response.json();

      if (response.ok) {
        setConversations(Array.isArray(result.conversations) ? result.conversations : []);
        setPagination(prev => ({
          ...prev,
          total: result.total ?? 0,
          totalPages: result.totalPages ?? 0,
        }));
        if (result.stats) setStats(result.stats);
      } else {
        setFetchError(result?.error || 'Failed to load conversations');
      }
    } catch {
      setFetchError('Failed to load conversations. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [search, pagination.page, pagination.limit]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (conversationId: string, page = 1) => {
    setMessagesLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(), limit: messagesPagination.limit.toString(),
      });
      const response = await fetch(`/api/admin/chats/${conversationId}?${params}`);
      const result = await response.json();

      if (response.ok) {
        setMessages(Array.isArray(result.messages) ? result.messages : []);
        setSelectedParticipants(result.participants || null);
        setMessagesPagination(prev => ({
          ...prev,
          page: result.page ?? 1,
          total: result.total ?? 0,
          totalPages: result.totalPages ?? 0,
        }));
      }
    } catch {
      // silently fail for messages
    } finally {
      setMessagesLoading(false);
    }
  }, [messagesPagination.limit]);

  // Fetch conversations on page/search change
  useEffect(() => {
    fetchConversations();
  }, [pagination.page]);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination(prev => ({ ...prev, page: 1 }));
      fetchConversations();
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  // Select a conversation to view messages
  const selectConversation = useCallback((conversationId: string) => {
    setSelectedConversation(conversationId);
    setMessagesPagination(prev => ({ ...prev, page: 1 }));
    fetchMessages(conversationId, 1);
  }, [fetchMessages]);

  // Go back to conversations list
  const clearSelection = useCallback(() => {
    setSelectedConversation(null);
    setSelectedParticipants(null);
    setMessages([]);
    setMessagesPagination(prev => ({ ...prev, page: 1, total: 0, totalPages: 0 }));
  }, []);

  // Change messages page
  const setMessagesPage = useCallback((page: number) => {
    if (!selectedConversation) return;
    setMessagesPagination(prev => ({ ...prev, page }));
    fetchMessages(selectedConversation, page);
  }, [selectedConversation, fetchMessages]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return {
    router,
    conversations, loading, search, setSearch, pagination, setPagination,
    stats, fetchError, fetchConversations,
    selectedConversation, selectedParticipants, messages, messagesLoading, messagesPagination,
    selectConversation, clearSelection, setMessagesPage, formatDate,
  };
}
