'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { EmailListItem, EmailDetail } from '@/components/admin-inbox/types';

export interface ComposeData {
  to: string;
  subject: string;
  bodyText: string;
  replyToEmailId?: string;
  quotedText?: string;
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

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActing, setBulkActing] = useState(false);

  // Auto-reply toggle
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [autoReplyLoading, setAutoReplyLoading] = useState(true);

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

  // Fetch auto-reply setting
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/settings?key=ai_auto_reply_enabled');
        if (res.ok) {
          const data = await res.json();
          setAutoReplyEnabled(data.value === 'true');
        }
      } catch {} finally {
        setAutoReplyLoading(false);
      }
    })();
  }, []);

  const toggleAutoReply = useCallback(async () => {
    const newValue = !autoReplyEnabled;
    setAutoReplyEnabled(newValue);
    try {
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'ai_auto_reply_enabled', value: String(newValue) }),
      });
    } catch {
      setAutoReplyEnabled(!newValue); // revert
    }
  }, [autoReplyEnabled]);

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
        setEmails(prev => prev.map(e => e.id === id ? { ...e, isRead: true, status: 'read' as const } : e));
        setSelectedEmail(prev => prev ? { ...prev, isRead: true, status: 'read' } : prev);
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
    const current = emails.find(e => e.id === id);
    const newStarred = !(current?.isStarred ?? false);

    setEmails(prev => prev.map(e => e.id === id ? { ...e, isStarred: newStarred } : e));
    if (selectedEmail?.id === id) {
      setSelectedEmail(prev => prev ? { ...prev, isStarred: newStarred } : prev);
    }

    try {
      await fetch(`/api/admin/inbox/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred: newStarred }),
      });
    } catch (err) {
      setEmails(prev => prev.map(e => e.id === id ? { ...e, isStarred: !newStarred } : e));
      if (selectedEmail?.id === id) {
        setSelectedEmail(prev => prev ? { ...prev, isStarred: !newStarred } : prev);
      }
      console.error('Failed to toggle star:', err);
    }
  }, [emails, selectedEmail?.id]);

  // Mark as spam
  const markSpam = useCallback(async (id: string) => {
    try {
      await fetch(`/api/admin/inbox/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSpam: true }),
      });
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

  // --- Bulk actions ---
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.size === emails.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(emails.map(e => e.id)));
    }
  }, [emails, selectedIds.size]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const bulkMarkRead = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBulkActing(true);
    const ids = Array.from(selectedIds);
    try {
      await fetch('/api/admin/inbox', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action: 'markRead' }),
      });
      setEmails(prev => prev.map(e => ids.includes(e.id) ? { ...e, isRead: true, status: 'read' as const } : e));
      setSelectedIds(new Set());
      fetchUnreadCount();
    } catch (err) {
      console.error('Bulk mark read failed:', err);
    } finally {
      setBulkActing(false);
    }
  }, [selectedIds, fetchUnreadCount]);

  const bulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBulkActing(true);
    const ids = Array.from(selectedIds);
    try {
      await fetch('/api/admin/inbox', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      setEmails(prev => prev.filter(e => !ids.includes(e.id)));
      if (selectedEmail && ids.includes(selectedEmail.id)) {
        setSelectedEmail(null);
      }
      setSelectedIds(new Set());
      fetchUnreadCount();
    } catch (err) {
      console.error('Bulk delete failed:', err);
    } finally {
      setBulkActing(false);
    }
  }, [selectedIds, selectedEmail, fetchUnreadCount]);

  // --- AI draft actions ---
  const useAiDraft = useCallback(async (emailId: string) => {
    try {
      const res = await fetch(`/api/admin/inbox/${emailId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useAiDraft: true }),
      });
      if (!res.ok) throw new Error('Failed to send AI draft');
      // Refresh the detail
      await selectEmail(emailId);
      fetchEmails();
    } catch (err) {
      console.error('Failed to use AI draft:', err);
      alert('Failed to send AI draft reply');
    }
  }, [selectEmail, fetchEmails]);

  const editAiDraft = useCallback((email: EmailDetail) => {
    if (!email.aiDraftText) return;
    setCompose({
      to: email.fromAddress,
      subject: email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
      bodyText: email.aiDraftText,
      replyToEmailId: email.id,
      quotedText: email.bodyText || undefined,
    });
    setShowCompose(true);
  }, []);

  // Compose & send
  const openCompose = useCallback((replyTo?: EmailDetail) => {
    if (replyTo) {
      const quotedBody = replyTo.bodyText
        ? `\n\n--- Original Message ---\nFrom: ${replyTo.fromName || replyTo.fromAddress}\nDate: ${new Date(replyTo.createdAt).toLocaleString()}\nSubject: ${replyTo.subject}\n\n${replyTo.bodyText}`
        : '';
      setCompose({
        to: replyTo.direction === 'inbound' ? replyTo.fromAddress : replyTo.toAddress,
        subject: replyTo.subject.startsWith('Re:') ? replyTo.subject : `Re: ${replyTo.subject}`,
        bodyText: '',
        replyToEmailId: replyTo.id,
        quotedText: quotedBody,
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
      const fullBody = compose.quotedText
        ? `${compose.bodyText}\n${compose.quotedText}`
        : compose.bodyText;
      const escapedBody = fullBody.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');

      const res = await fetch('/api/admin/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: compose.to,
          subject: compose.subject,
          bodyText: fullBody,
          bodyHtml: `<div style="font-family: sans-serif;">${escapedBody}</div>`,
          replyToEmailId: compose.replyToEmailId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send');
      }

      closeCompose();
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
    setSelectedIds(new Set());
  }, []);

  return {
    // List
    tab, changeTab, emails, loading, search, setSearch,
    page, setPage, totalPages, total,
    // Detail
    selectedEmail, thread, detailLoading, selectEmail, closeDetail,
    // Actions
    toggleStar, markSpam, deleteEmail,
    // Bulk selection
    selectedIds, toggleSelect, selectAll, clearSelection,
    bulkMarkRead, bulkDelete, bulkActing,
    // AI
    useAiDraft, editAiDraft,
    autoReplyEnabled, autoReplyLoading, toggleAutoReply,
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
