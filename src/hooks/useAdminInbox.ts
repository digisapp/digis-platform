'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface EmailListItem {
  id: string;
  direction: 'inbound' | 'outbound';
  threadId: string | null;
  fromAddress: string;
  fromName: string | null;
  toAddress: string;
  toName: string | null;
  subject: string;
  bodyText: string | null;
  isRead: boolean;
  isSpam: boolean;
  isStarred: boolean;
  linkedUserId: string | null;
  createdAt: string;
}

interface EmailDetail {
  id: string;
  direction: 'inbound' | 'outbound';
  threadId: string | null;
  resendEmailId: string | null;
  messageId: string | null;
  fromAddress: string;
  fromName: string | null;
  toAddress: string;
  toName: string | null;
  subject: string;
  bodyText: string | null;
  bodyHtml: string | null;
  isRead: boolean;
  isSpam: boolean;
  isStarred: boolean;
  linkedUserId: string | null;
  inReplyToEmailId: string | null;
  metadata: string | null;
  createdAt: string;
}

export interface ComposeData {
  to: string;
  subject: string;
  bodyText: string;
  replyToEmailId?: string;
}

const SEARCH_DEBOUNCE_MS = 300;
const UNREAD_POLL_MS = 60_000;

export function useAdminInbox() {
  const router = useRouter();

  // Tab & list state
  const [tab, setTab] = useState<'inbox' | 'sent'>('inbox');
  const [emails, setEmails] = useState<EmailListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  // Detail state
  const [selectedEmail, setSelectedEmail] = useState<EmailDetail | null>(null);
  const [thread, setThread] = useState<EmailDetail[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Compose state
  const [showCompose, setShowCompose] = useState(false);
  const [compose, setCompose] = useState<ComposeData>({ to: '', subject: '', bodyText: '' });
  const [sending, setSending] = useState(false);

  // Unread count
  const [unreadCount, setUnreadCount] = useState(0);

  // Search debounce
  const searchTimerRef = useRef<NodeJS.Timeout>();
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [search]);

  // Fetch emails
  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const direction = tab === 'inbox' ? 'inbound' : 'outbound';
      const params = new URLSearchParams({
        direction,
        page: page.toString(),
        limit: '20',
        ...(debouncedSearch && { search: debouncedSearch }),
      });

      const res = await fetch(`/api/admin/inbox?${params}`);
      if (!res.ok) throw new Error('Failed to fetch emails');
      const data = await res.json();

      setEmails(data.emails);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch emails:', err);
    } finally {
      setLoading(false);
    }
  }, [tab, page, debouncedSearch]);

  useEffect(() => { fetchEmails(); }, [fetchEmails]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/inbox/unread');
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, UNREAD_POLL_MS);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Select email — fetch detail + mark read
  const selectEmail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/inbox/${id}`);
      if (!res.ok) throw new Error('Failed to fetch email');
      const data = await res.json();

      setSelectedEmail(data.email);
      setThread(data.thread);

      // Mark as read if inbound and unread
      if (data.email.direction === 'inbound' && !data.email.isRead) {
        await fetch(`/api/admin/inbox/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isRead: true }),
        });
        // Update local state
        setEmails(prev => prev.map(e => e.id === id ? { ...e, isRead: true } : e));
        setSelectedEmail(prev => prev ? { ...prev, isRead: true } : prev);
        fetchUnreadCount();
      }
    } catch (err) {
      console.error('Failed to fetch email detail:', err);
    } finally {
      setDetailLoading(false);
    }
  }, [fetchUnreadCount]);

  const closeDetail = useCallback(() => {
    setSelectedEmail(null);
    setThread([]);
  }, []);

  // Toggle star
  const toggleStar = useCallback(async (id: string) => {
    try {
      await fetch(`/api/admin/inbox/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred: true }),
      });
      setEmails(prev => prev.map(e => e.id === id ? { ...e, isStarred: !e.isStarred } : e));
      if (selectedEmail?.id === id) {
        setSelectedEmail(prev => prev ? { ...prev, isStarred: !prev.isStarred } : prev);
      }
    } catch (err) {
      console.error('Failed to toggle star:', err);
    }
  }, [selectedEmail?.id]);

  // Mark as spam
  const markSpam = useCallback(async (id: string) => {
    try {
      await fetch(`/api/admin/inbox/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSpam: true }),
      });
      // Remove from list
      setEmails(prev => prev.filter(e => e.id !== id));
      if (selectedEmail?.id === id) {
        setSelectedEmail(null);
      }
      fetchUnreadCount();
    } catch (err) {
      console.error('Failed to mark spam:', err);
    }
  }, [selectedEmail?.id, fetchUnreadCount]);

  // Delete email
  const deleteEmail = useCallback(async (id: string) => {
    try {
      await fetch(`/api/admin/inbox/${id}`, { method: 'DELETE' });
      setEmails(prev => prev.filter(e => e.id !== id));
      if (selectedEmail?.id === id) {
        setSelectedEmail(null);
      }
      fetchUnreadCount();
    } catch (err) {
      console.error('Failed to delete email:', err);
    }
  }, [selectedEmail?.id, fetchUnreadCount]);

  // Compose & send
  const openCompose = useCallback((replyTo?: EmailDetail) => {
    if (replyTo) {
      setCompose({
        to: replyTo.direction === 'inbound' ? replyTo.fromAddress : replyTo.toAddress,
        subject: replyTo.subject.startsWith('Re:') ? replyTo.subject : `Re: ${replyTo.subject}`,
        bodyText: '',
        replyToEmailId: replyTo.id,
      });
    } else {
      setCompose({ to: '', subject: '', bodyText: '' });
    }
    setShowCompose(true);
  }, []);

  const closeCompose = useCallback(() => {
    setShowCompose(false);
    setCompose({ to: '', subject: '', bodyText: '' });
  }, []);

  const handleSend = useCallback(async () => {
    if (!compose.to || !compose.subject || !compose.bodyText) return;
    setSending(true);
    try {
      const res = await fetch('/api/admin/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: compose.to,
          subject: compose.subject,
          bodyText: compose.bodyText,
          bodyHtml: `<div style="font-family: sans-serif; white-space: pre-wrap;">${compose.bodyText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`,
          replyToEmailId: compose.replyToEmailId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send');
      }

      closeCompose();
      // Refresh if on sent tab
      if (tab === 'sent') {
        fetchEmails();
      }
    } catch (err) {
      console.error('Failed to send email:', err);
      alert(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setSending(false);
    }
  }, [compose, closeCompose, tab, fetchEmails]);

  // Tab change resets
  const changeTab = useCallback((newTab: 'inbox' | 'sent') => {
    setTab(newTab);
    setPage(1);
    setSelectedEmail(null);
    setThread([]);
  }, []);

  return {
    // List
    tab, changeTab, emails, loading, search, setSearch,
    page, setPage, totalPages, total,
    // Detail
    selectedEmail, thread, detailLoading, selectEmail, closeDetail,
    // Actions
    toggleStar, markSpam, deleteEmail,
    // Compose
    showCompose, compose, setCompose, sending,
    openCompose, closeCompose, handleSend,
    // Badge
    unreadCount,
    // Nav
    router,
    // Refresh
    refresh: fetchEmails,
  };
}
