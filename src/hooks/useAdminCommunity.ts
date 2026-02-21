'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Creator, Fan, Pagination, ConfirmModal } from '@/components/admin-community/types';
import { SEARCH_DEBOUNCE_MS, TOAST_TIMEOUT_MS, ERROR_TOAST_TIMEOUT_MS, DEFAULT_PAGE_LIMIT } from '@/components/admin-community/types';

export function useAdminCommunity() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'fans' ? 'fans' : 'creators';
  const initialFilter = searchParams.get('filter') || 'all';

  const [tab, setTab] = useState<'creators' | 'fans'>(initialTab);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [fans, setFans] = useState<Fan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(initialFilter);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: DEFAULT_PAGE_LIMIT, total: 0, totalPages: 0,
  });
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [creatorsTotal, setCreatorsTotal] = useState(0);
  const [fansTotal, setFansTotal] = useState(0);
  const [confirmModal, setConfirmModal] = useState<ConfirmModal | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [blockedFansTotal, setBlockedFansTotal] = useState(0);
  const [aiSettingsModal, setAiSettingsModal] = useState<{
    show: boolean;
    creatorId: string;
    creatorUsername: string;
    loading: boolean;
    settings: {
      enabled: boolean;
      textChatEnabled: boolean;
      voice: string;
      personalityPrompt: string | null;
      welcomeMessage: string | null;
      boundaryPrompt: string | null;
      pricePerMinute: number;
      minimumMinutes: number;
      maxSessionMinutes: number;
      textPricePerMessage: number;
    } | null;
  } | null>(null);

  useEffect(() => {
    if (hasInitialized) {
      setFilter('all');
      setPagination((prev) => ({ ...prev, page: 1 }));
    } else {
      setHasInitialized(true);
    }
  }, [tab]);

  useEffect(() => { fetchData(); }, [tab, pagination.page, filter]);

  useEffect(() => { fetchBlockedCount(); }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination((prev) => ({ ...prev, page: 1 }));
      fetchData();
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchBlockedCount = async () => {
    try {
      const res = await fetch('/api/admin/community?tab=fans&filter=blocked&limit=1&page=1');
      const result = await res.json();
      if (res.ok && result.pagination) setBlockedFansTotal(result.pagination.total ?? 0);
    } catch {}
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({
        tab, page: pagination.page.toString(), limit: pagination.limit.toString(), search, filter,
      });
      const response = await fetch(`/api/admin/community?${params}`);
      const result = await response.json();

      if (response.ok && result.data && result.pagination) {
        const total = result.pagination?.total ?? 0;
        if (tab === 'creators') {
          setCreators(Array.isArray(result.data) ? result.data : []);
          setCreatorsTotal(total);
        } else {
          setFans(Array.isArray(result.data) ? result.data : []);
          setFansTotal(total);
        }
        setPagination((prev) => ({
          ...prev, total, totalPages: result.pagination?.totalPages ?? 0,
        }));
      } else if (!response.ok) {
        setFetchError(result?.error || 'Failed to load data');
      }
    } catch (error: unknown) {
      setFetchError('Failed to load data. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [tab, pagination.page, pagination.limit, search, filter]);

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

  const formatCoins = (coins: number) => {
    if (coins >= 1000000) return `${(coins / 1000000).toFixed(1)}M`;
    if (coins >= 1000) return `${(coins / 1000).toFixed(1)}K`;
    return coins.toString();
  };

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    const timeout = type === 'error' ? ERROR_TOAST_TIMEOUT_MS : TOAST_TIMEOUT_MS;
    setTimeout(() => setToast(null), timeout);
  }, []);

  const handleVerifyCreator = (userId: string, isCurrentlyVerified: boolean) => {
    setActiveDropdown(null);
    setConfirmModal({
      show: true,
      title: isCurrentlyVerified ? 'Remove Verification' : 'Verify Creator',
      message: isCurrentlyVerified ? 'Remove verification badge from this creator?' : 'Give this creator a verified badge?',
      type: 'confirm',
      confirmText: isCurrentlyVerified ? 'Remove' : 'Verify',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/users/${userId}/verify`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ verified: !isCurrentlyVerified }),
          });
          if (res.ok) { showToast(isCurrentlyVerified ? 'Verification removed' : 'Creator verified', 'success'); fetchData(); }
          else { const data = await res.json(); showToast(data.error || 'Failed to update verification', 'error'); }
        } catch { showToast('Failed to update verification', 'error'); }
        setConfirmModal(null);
      },
    });
  };

  const handleHideFromDiscovery = (userId: string, isCurrentlyHidden: boolean) => {
    setActiveDropdown(null);
    setConfirmModal({
      show: true,
      title: isCurrentlyHidden ? 'Show in Discovery' : 'Hide from Discovery',
      message: isCurrentlyHidden
        ? 'Make this creator visible in explore, search, and suggestions again?'
        : 'Hide this creator from explore, search, and suggestions? They can still use the platform and existing followers can find them.',
      type: 'confirm',
      confirmText: isCurrentlyHidden ? 'Show' : 'Hide',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/users/${userId}/hide`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
          if (res.ok) { showToast(isCurrentlyHidden ? 'Creator now visible in discovery' : 'Creator hidden from discovery', 'success'); fetchData(); }
          else { const data = await res.json(); showToast(data.error || 'Failed to update visibility', 'error'); }
        } catch { showToast('Failed to update visibility', 'error'); }
        setConfirmModal(null);
      },
    });
  };

  const handleSuspendUser = (userId: string, isCurrentlySuspended: boolean) => {
    setActiveDropdown(null);
    setConfirmModal({
      show: true,
      title: isCurrentlySuspended ? 'Unsuspend User' : 'Suspend User',
      message: isCurrentlySuspended ? 'Restore access to this user account?' : 'Suspend this user? They will not be able to log in.',
      type: isCurrentlySuspended ? 'confirm' : 'warning',
      confirmText: isCurrentlySuspended ? 'Unsuspend' : 'Suspend',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/users/${userId}/suspend`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: isCurrentlySuspended ? 'unsuspend' : 'suspend' }),
          });
          if (res.ok) { showToast(isCurrentlySuspended ? 'User unsuspended' : 'User suspended', 'success'); fetchData(); }
          else { const data = await res.json(); showToast(data.error || 'Failed to update user', 'error'); }
        } catch { showToast('Failed to update user', 'error'); }
        setConfirmModal(null);
      },
    });
  };

  const handleDeleteUser = (userId: string) => {
    setActiveDropdown(null);
    setConfirmModal({
      show: true, title: 'Delete Account',
      message: 'Permanently ban this user? This action cannot be undone.',
      type: 'danger', confirmText: 'Delete',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/users/${userId}/delete`, { method: 'POST' });
          if (res.ok) { showToast('User deleted', 'success'); fetchData(); }
          else { const data = await res.json(); showToast(data.error || 'Failed to delete user', 'error'); }
        } catch { showToast('Failed to delete user', 'error'); }
        setConfirmModal(null);
      },
    });
  };

  const handleChangeRole = (userId: string, currentRole: string, newRole: 'fan' | 'creator' | 'admin') => {
    setActiveDropdown(null);
    const roleLabels = { fan: 'Fan', creator: 'Creator', admin: 'Admin' };
    setConfirmModal({
      show: true, title: 'Change Role',
      message: `Change this user from ${roleLabels[currentRole as keyof typeof roleLabels]} to ${roleLabels[newRole]}?`,
      type: 'warning', confirmText: `Make ${roleLabels[newRole]}`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/users/${userId}/role`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: newRole }),
          });
          if (res.ok) { showToast(`User is now a ${roleLabels[newRole]}`, 'success'); fetchData(); }
          else { const data = await res.json(); showToast(data.error || 'Failed to change role', 'error'); }
        } catch { showToast('Failed to change role', 'error'); }
        setConfirmModal(null);
      },
    });
  };

  const handleSyncCounts = async () => {
    try {
      const res = await fetch('/api/admin/sync-counts', { method: 'POST' });
      if (res.ok) { showToast('Counts synced successfully', 'success'); fetchData(); fetchBlockedCount(); }
      else { showToast('Failed to sync counts', 'error'); }
    } catch { showToast('Failed to sync counts', 'error'); }
  };

  const handleOpenAiSettings = async (creatorId: string, creatorUsername: string) => {
    setActiveDropdown(null);
    setAiSettingsModal({ show: true, creatorId, creatorUsername, settings: null, loading: true });
    try {
      const res = await fetch(`/api/admin/ai-settings/${creatorId}`);
      const data = await res.json();
      if (res.ok) {
        setAiSettingsModal(prev => prev ? { ...prev, settings: data.settings, loading: false } : null);
      } else {
        showToast(data.error || 'Failed to load AI settings', 'error');
        setAiSettingsModal(null);
      }
    } catch {
      showToast('Failed to load AI settings', 'error');
      setAiSettingsModal(null);
    }
  };

  const handleSaveAiSettings = async (settings: Record<string, unknown>) => {
    if (!aiSettingsModal) return;
    try {
      const res = await fetch(`/api/admin/ai-settings/${aiSettingsModal.creatorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('AI settings saved', 'success');
        setAiSettingsModal(prev => prev ? { ...prev, settings: data.settings } : null);
      } else {
        showToast(data.error || 'Failed to save AI settings', 'error');
      }
    } catch {
      showToast('Failed to save AI settings', 'error');
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown-menu]')) setActiveDropdown(null);
    };
    if (activeDropdown) {
      const timeoutId = setTimeout(() => document.addEventListener('click', handleClickOutside), 0);
      return () => { clearTimeout(timeoutId); document.removeEventListener('click', handleClickOutside); };
    }
  }, [activeDropdown]);

  return {
    router, tab, setTab, creators, fans, loading, search, setSearch,
    filter, setFilter, pagination, setPagination, activeDropdown, setActiveDropdown,
    fetchError, creatorsTotal, fansTotal, blockedFansTotal, confirmModal, setConfirmModal, toast, setToast,
    fetchData, formatDate, formatCoins,
    handleVerifyCreator, handleHideFromDiscovery, handleSuspendUser,
    handleDeleteUser, handleChangeRole, handleSyncCounts,
    aiSettingsModal, setAiSettingsModal, handleOpenAiSettings, handleSaveAiSettings,
  };
}
