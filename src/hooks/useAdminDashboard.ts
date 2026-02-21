'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  Stats, MainTab, TrafficData, RevenueData, CreatorActivityData,
  ModerationData, ActivityFilter, TrafficRange, PayoutsData,
} from '@/components/admin-dashboard/types';

export function useAdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);

  const [mainTab, setMainTab] = useState<MainTab>('traffic');
  const [refreshing, setRefreshing] = useState(false);

  // Traffic
  const [traffic, setTraffic] = useState<TrafficData | null>(null);
  const [trafficRange, setTrafficRange] = useState<TrafficRange>('7d');

  // Moderation
  const [moderation, setModeration] = useState<ModerationData | null>(null);
  const [moderationTab, setModerationTab] = useState<'blocked' | 'bans'>('blocked');

  // Revenue
  const [revenue, setRevenue] = useState<RevenueData | null>(null);

  // Creator Activity
  const [creatorActivity, setCreatorActivity] = useState<CreatorActivityData | null>(null);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');

  // Payouts
  const [payoutsData, setPayoutsData] = useState<PayoutsData | null>(null);

  // Cache flags
  const [hasFetchedTraffic, setHasFetchedTraffic] = useState(false);
  const [hasFetchedModeration, setHasFetchedModeration] = useState(false);
  const [hasFetchedRevenue, setHasFetchedRevenue] = useState(false);
  const [hasFetchedActivity, setHasFetchedActivity] = useState(false);
  const [hasFetchedPayouts, setHasFetchedPayouts] = useState(false);

  // Modal
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'confirm' | 'prompt' | 'danger' | 'success';
    icon: 'delete' | 'promote' | 'shield' | 'warning' | 'success';
    confirmText: string;
    placeholder?: string;
    requireInput?: string;
    onConfirm: (inputValue?: string) => void;
  }>({
    isOpen: false, title: '', message: '', type: 'confirm', icon: 'warning',
    confirmText: 'Confirm', onConfirm: () => {},
  });

  // Toast
  const [toast, setToast] = useState<{
    isOpen: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ isOpen: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  const closeModal = () => {
    setModal(prev => ({ ...prev, isOpen: false }));
  };

  // Wallet tool
  const [walletSearch, setWalletSearch] = useState('');
  const [walletUser, setWalletUser] = useState<{
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    balance: number;
    heldBalance: number;
  } | null>(null);
  const [walletNewBalance, setWalletNewBalance] = useState('');
  const [walletReason, setWalletReason] = useState('');
  const [searchingWallet, setSearchingWallet] = useState(false);
  const [settingWallet, setSettingWallet] = useState(false);

  const searchWalletUser = async () => {
    if (!walletSearch.trim()) return;
    setSearchingWallet(true);
    setWalletUser(null);
    setWalletNewBalance('');
    setWalletReason('');
    try {
      const res = await fetch(`/api/admin/search-user?q=${encodeURIComponent(walletSearch.trim())}`);
      const data = await res.json();
      if (res.ok && data.data?.users?.length > 0) {
        const user = data.data.users[0];
        // Now fetch wallet for this user
        const walletRes = await fetch(`/api/admin/wallet?userId=${user.id}`);
        const walletData = await walletRes.json();
        if (walletRes.ok) {
          setWalletUser({
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            balance: walletData.wallet?.balance ?? 0,
            heldBalance: walletData.wallet?.heldBalance ?? 0,
          });
          setWalletNewBalance(String(walletData.wallet?.balance ?? 0));
        } else {
          showToast(walletData.error || 'Failed to load wallet', 'error');
        }
      } else {
        showToast(data.error || 'User not found', 'error');
      }
    } catch {
      showToast('Failed to search user', 'error');
    } finally {
      setSearchingWallet(false);
    }
  };

  const setWalletBalance = async () => {
    if (!walletUser || !walletReason.trim()) return;
    const newBalance = parseInt(walletNewBalance);
    if (isNaN(newBalance) || newBalance < 0) { showToast('Invalid balance amount', 'error'); return; }
    setSettingWallet(true);
    try {
      const res = await fetch('/api/admin/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: walletUser.id, balance: newBalance, reason: walletReason.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Balance updated: ${data.previousBalance} → ${data.newBalance} coins`, 'success');
        setWalletUser(prev => prev ? { ...prev, balance: newBalance } : null);
        setWalletReason('');
      } else {
        showToast(data.error || 'Failed to update wallet', 'error');
      }
    } catch {
      showToast('Failed to update wallet', 'error');
    } finally {
      setSettingWallet(false);
    }
  };

  // Username tool
  const [userSearch, setUserSearch] = useState('');
  const [foundUser, setFoundUser] = useState<{
    id: string;
    email: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    role: string;
  } | null>(null);
  const [newUsername, setNewUsername] = useState('');
  const [usernameCheck, setUsernameCheck] = useState<{
    available: boolean;
    reserved: boolean;
    reason: string | null;
  } | null>(null);
  const [searchingUser, setSearchingUser] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [settingUsername, setSettingUsername] = useState(false);

  const searchUser = async () => {
    if (!userSearch.trim()) return;
    setSearchingUser(true);
    setFoundUser(null);
    try {
      const response = await fetch(`/api/admin/search-user?q=${encodeURIComponent(userSearch.trim())}`);
      const data = await response.json();
      if (response.ok && data.data?.users?.length > 0) {
        const user = data.data.users[0];
        setFoundUser(user);
        setNewUsername(user.username || '');
      } else {
        showToast(data.error || 'User not found', 'error');
      }
    } catch {
      showToast('Failed to search user', 'error');
    } finally {
      setSearchingUser(false);
    }
  };

  const checkUsername = async (username: string) => {
    if (!username.trim() || username.length < 3) {
      setUsernameCheck(null);
      return;
    }
    setCheckingUsername(true);
    try {
      const response = await fetch(`/api/admin/check-username?username=${encodeURIComponent(username.trim())}`);
      const data = await response.json();
      if (response.ok && data.data) {
        setUsernameCheck({
          available: data.data.available,
          reserved: data.data.isReserved,
          reason: data.data.reservedReason || data.data.formatError,
        });
      } else {
        setUsernameCheck(null);
      }
    } catch {
      setUsernameCheck(null);
    } finally {
      setCheckingUsername(false);
    }
  };

  const setUsernameForUser = async () => {
    if (!foundUser || !newUsername.trim()) return;
    setSettingUsername(true);
    try {
      const response = await fetch('/api/admin/set-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: foundUser.id,
          newUsername: newUsername.trim(),
        }),
      });
      const data = await response.json();
      if (response.ok && data.data) {
        showToast(`Username set to @${data.data.username}`, 'success');
        setFoundUser({ ...foundUser, username: data.data.username });
        setUsernameCheck(null);
      } else {
        showToast(data.error || 'Failed to set username', 'error');
      }
    } catch {
      showToast('Failed to set username', 'error');
    } finally {
      setSettingUsername(false);
    }
  };

  // Debounce username check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (newUsername && newUsername !== foundUser?.username) {
        checkUsername(newUsername);
      } else {
        setUsernameCheck(null);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [newUsername]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (mainTab === 'traffic' && !hasFetchedTraffic) fetchTraffic();
    else if (mainTab === 'moderation' && !hasFetchedModeration) fetchModeration();
    else if (mainTab === 'revenue' && !hasFetchedRevenue) fetchRevenue();
    else if (mainTab === 'activity' && !hasFetchedActivity) fetchCreatorActivity();
    else if (mainTab === 'payouts' && !hasFetchedPayouts) fetchPayouts();
  }, [mainTab]);

  useEffect(() => {
    if (mainTab === 'traffic' && hasFetchedTraffic) fetchTraffic(trafficRange);
  }, [trafficRange]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      if (response.status === 403) {
        router.push('/dashboard');
        return;
      }
      const data = await response.json();
      if (response.ok) setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchStats(),
        mainTab === 'traffic' && fetchTraffic(),
        mainTab === 'moderation' && fetchModeration(),
        mainTab === 'revenue' && fetchRevenue(),
        mainTab === 'activity' && fetchCreatorActivity(),
        mainTab === 'payouts' && fetchPayouts(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/payouts?filter=all');
      const data = await response.json();
      if (response.ok) {
        setPayoutsData({ payouts: data.payouts || [], stats: data.stats || { pending: 0, processing: 0, completed: 0, failed: 0 } });
        setHasFetchedPayouts(true);
      } else {
        showToast(data.error || 'Failed to load payouts', 'error');
      }
    } catch {
      showToast('Failed to load payouts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchModeration = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/moderation');
      const data = await response.json();
      if (response.ok) {
        setModeration(data);
        setHasFetchedModeration(true);
      } else {
        showToast(data.error || 'Failed to load moderation data', 'error');
      }
    } catch {
      showToast('Failed to load moderation data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchRevenue = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/revenue');
      const data = await response.json();
      if (response.ok) {
        setRevenue(data);
        setHasFetchedRevenue(true);
      } else {
        showToast(data.error || 'Failed to load revenue data', 'error');
      }
    } catch {
      showToast('Failed to load revenue data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCreatorActivity = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/creator-activity');
      const data = await response.json();
      if (response.ok) {
        setCreatorActivity(data);
        setHasFetchedActivity(true);
      } else {
        showToast(data.error || 'Failed to load creator activity', 'error');
      }
    } catch {
      showToast('Failed to load creator activity', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTraffic = async (range: TrafficRange = trafficRange) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/traffic?range=${range}`);
      const data = await response.json();
      if (response.ok) {
        setTraffic(data);
        setHasFetchedTraffic(true);
      } else {
        showToast(data.error || 'Failed to load traffic data', 'error');
      }
    } catch {
      showToast('Failed to load traffic data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const retryTraffic = () => { setHasFetchedTraffic(false); fetchTraffic(); };
  const retryModeration = () => { setHasFetchedModeration(false); fetchModeration(); };
  const retryRevenue = () => { setHasFetchedRevenue(false); fetchRevenue(); };
  const retryActivity = () => { setHasFetchedActivity(false); fetchCreatorActivity(); };
  const retryPayouts = () => { setHasFetchedPayouts(false); fetchPayouts(); };

  return {
    loading, stats, mainTab, setMainTab, refreshing, handleRefresh,
    // Traffic
    traffic, trafficRange, setTrafficRange, retryTraffic,
    // Moderation
    moderation, moderationTab, setModerationTab, retryModeration,
    // Revenue
    revenue, retryRevenue,
    // Activity
    creatorActivity, activityFilter, setActivityFilter, retryActivity,
    // Payouts
    payoutsData, retryPayouts,
    // Wallet tool
    walletSearch, setWalletSearch, walletUser, walletNewBalance, setWalletNewBalance,
    walletReason, setWalletReason, searchingWallet, settingWallet,
    searchWalletUser, setWalletBalance,
    // Username tool
    userSearch, setUserSearch, foundUser, newUsername, setNewUsername,
    usernameCheck, searchingUser, checkingUsername, settingUsername,
    searchUser, setUsernameForUser,
    // Modal/Toast
    modal, closeModal, toast, setToast,
    router,
  };
}
