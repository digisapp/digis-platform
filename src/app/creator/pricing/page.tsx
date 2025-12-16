'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GlassCard, GlassButton, LoadingSpinner } from '@/components/ui';
import { MobileHeader } from '@/components/layout/MobileHeader';
import {
  DollarSign, Video, Mic, MessageSquare, Star, Phone,
  ToggleLeft, ToggleRight, Plus, Trash2, Coins, X, CheckCircle, AlertCircle
} from 'lucide-react';
import { COIN_TO_USD_RATE } from '@/lib/stripe/constants';

// Helper to format coins as USD
const formatCoinsToUSD = (coins: number): string => {
  const usd = coins * COIN_TO_USD_RATE;
  return usd.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

interface MenuItem {
  id: string;
  label: string;
  emoji: string | null;
  price: number;
  description: string | null;
  isActive: boolean;
  displayOrder: number;
  itemCategory?: string;
  fulfillmentType?: string;
}

const EMOJI_OPTIONS = ['🎵', '🎤', '💋', '🔥', '💃', '🎮', '❓', '💪', '🎭', '⭐', '💬', '🎁'];

type ActiveTab = 'calls' | 'messages' | 'subscriptions' | 'menu';

// Wrapper component with Suspense for useSearchParams
export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    }>
      <PricingPageContent />
    </Suspense>
  );
}

function PricingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Get initial tab from URL query parameter
  const initialTab = (searchParams.get('tab') as ActiveTab) || 'calls';
  const [activeTab, setActiveTab] = useState<ActiveTab>(
    ['calls', 'messages', 'subscriptions', 'menu'].includes(initialTab) ? initialTab : 'calls'
  );

  // Call settings
  const [callSettings, setCallSettings] = useState({
    callRatePerMinute: 10,
    minimumCallDuration: 5,
    voiceCallRatePerMinute: 5,
    minimumVoiceCallDuration: 5,
    messageRate: 0,
    isAvailableForCalls: true,
    isAvailableForVoiceCalls: true,
  });

  // Subscription settings
  const [subscriptionSettings, setSubscriptionSettings] = useState({
    enabled: false,
    subscriptionName: 'Superfan',
    monthlyPrice: 50,
  });

  // Menu items
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formLabel, setFormLabel] = useState('');
  const [formEmoji, setFormEmoji] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<'interaction' | 'product' | 'service'>('interaction');
  const [formFulfillment, setFormFulfillment] = useState<'instant' | 'digital' | 'manual'>('instant');
  const [formDigitalUrl, setFormDigitalUrl] = useState('');
  const [savingItem, setSavingItem] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchCallSettings(),
      fetchMenuItems(),
    ]).finally(() => setLoading(false));
  }, []);

  const fetchCallSettings = async () => {
    try {
      const response = await fetch('/api/creator/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setCallSettings({
            callRatePerMinute: data.settings.callRatePerMinute || 10,
            minimumCallDuration: data.settings.minimumCallDuration || 5,
            voiceCallRatePerMinute: data.settings.voiceCallRatePerMinute || 5,
            minimumVoiceCallDuration: data.settings.minimumVoiceCallDuration || 5,
            messageRate: data.settings.messageRate || 0,
            isAvailableForCalls: data.settings.isAvailableForCalls ?? true,
            isAvailableForVoiceCalls: data.settings.isAvailableForVoiceCalls ?? true,
          });
        }
      } else if (response.status === 401) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const response = await fetch('/api/creator/tip-menu');
      if (response.ok) {
        const data = await response.json();
        setMenuItems(data.items || []);
      }
    } catch (error) {
      console.error('Error fetching menu:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/creator/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(callSettings),
      });

      if (response.ok) {
        setMessage('Settings saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save settings');
        setTimeout(() => setError(''), 3000);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Failed to save settings');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Menu functions
  const resetForm = () => {
    setFormLabel('');
    setFormEmoji('');
    setFormPrice('');
    setFormDescription('');
    setFormCategory('interaction');
    setFormFulfillment('instant');
    setFormDigitalUrl('');
    setEditingItem(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (item: MenuItem) => {
    setFormLabel(item.label);
    setFormEmoji(item.emoji || '');
    setFormPrice(item.price.toString());
    setFormDescription(item.description || '');
    setFormCategory((item.itemCategory as 'interaction' | 'product' | 'service') || 'interaction');
    setFormFulfillment((item.fulfillmentType as 'instant' | 'digital' | 'manual') || 'instant');
    setFormDigitalUrl(''); // TODO: fetch from API if needed
    setEditingItem(item);
    setShowAddModal(true);
  };

  const handleSaveItem = async () => {
    if (!formLabel.trim() || !formPrice) return;

    // Validate digital URL if fulfillment type is digital
    if (formFulfillment === 'digital' && !formDigitalUrl.trim()) {
      setError('Digital products require a download URL');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setSavingItem(true);
    try {
      const payload = {
        label: formLabel.trim(),
        emoji: formEmoji || null,
        price: parseInt(formPrice),
        description: formDescription.trim() || null,
        itemCategory: formCategory,
        fulfillmentType: formFulfillment,
        digitalContentUrl: formFulfillment === 'digital' ? formDigitalUrl.trim() : null,
      };

      let response;
      if (editingItem) {
        response = await fetch(`/api/creator/tip-menu/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch('/api/creator/tip-menu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (response.ok) {
        await fetchMenuItems();
        setShowAddModal(false);
        resetForm();
        setMessage(editingItem ? 'Item updated!' : 'Item added!');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error saving item:', error);
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Delete this menu item?')) return;

    try {
      const response = await fetch(`/api/creator/tip-menu/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setMenuItems(menuItems.filter(item => item.id !== id));
        setMessage('Item deleted');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const toggleItemActive = async (item: MenuItem) => {
    try {
      const response = await fetch(`/api/creator/tip-menu/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      if (response.ok) {
        setMenuItems(menuItems.map(i =>
          i.id === item.id ? { ...i, isActive: !i.isActive } : i
        ));
      }
    } catch (error) {
      console.error('Error toggling item:', error);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20">
      <MobileHeader />

      <div className="max-w-4xl mx-auto">
        <div className="md:hidden" style={{ height: 'calc(48px + env(safe-area-inset-top, 0px))' }} />

        <div className="px-4 pt-4 md:pt-10 pb-24 md:pb-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <DollarSign className="w-7 h-7 text-green-400" />
              Pricing
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Set your rates for calls, messages, subscriptions, and menu
            </p>
          </div>

          {/* Messages */}
          {message && (
            <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {message}
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-white/5 p-1 rounded-xl overflow-x-auto">
            <button
              onClick={() => setActiveTab('calls')}
              className={`flex-1 min-w-[80px] px-4 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                activeTab === 'calls'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">Calls</span>
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`flex-1 min-w-[80px] px-4 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                activeTab === 'messages'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Messages</span>
            </button>
            <button
              onClick={() => setActiveTab('menu')}
              className={`flex-1 min-w-[80px] px-4 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                activeTab === 'menu'
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Coins className="w-4 h-4" />
              <span className="hidden sm:inline">Menu</span>
            </button>
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`flex-1 min-w-[80px] px-4 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                activeTab === 'subscriptions'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Star className="w-4 h-4" />
              <span className="hidden sm:inline">Subs</span>
            </button>
          </div>

          {/* Calls Tab */}
          {activeTab === 'calls' && (
            <div className="space-y-6">
              {/* Video Calls */}
              <GlassCard className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-cyan-500/20 rounded-lg">
                    <Video className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white">Video Calls</h3>
                    <p className="text-xs text-gray-400">1-on-1 video calls with fans</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCallSettings({ ...callSettings, isAvailableForCalls: !callSettings.isAvailableForCalls })}
                  >
                    {callSettings.isAvailableForCalls ? (
                      <ToggleRight className="w-10 h-10 text-green-500" />
                    ) : (
                      <ToggleLeft className="w-10 h-10 text-gray-500" />
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Rate per minute</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={callSettings.callRatePerMinute || ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/^0+/, '') || '1';
                          setCallSettings({ ...callSettings, callRatePerMinute: parseInt(val) || 1 });
                        }}
                        className="w-full px-3 py-2 bg-black/40 border border-cyan-500/30 rounded-lg text-white font-semibold text-center focus:outline-none focus:border-cyan-500"
                      />
                      <span className="text-xs text-gray-400">coins</span>
                    </div>
                    <p className="text-xs text-green-400 mt-1">{formatCoinsToUSD(callSettings.callRatePerMinute)}/min</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Minimum duration</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={callSettings.minimumCallDuration || ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/^0+/, '') || '1';
                          setCallSettings({ ...callSettings, minimumCallDuration: Math.min(60, parseInt(val) || 1) });
                        }}
                        className="w-full px-3 py-2 bg-black/40 border border-cyan-500/30 rounded-lg text-white font-semibold text-center focus:outline-none focus:border-cyan-500"
                      />
                      <span className="text-xs text-gray-400">mins</span>
                    </div>
                  </div>
                </div>
              </GlassCard>

              {/* Voice Calls */}
              <GlassCard className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Mic className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white">Voice Calls</h3>
                    <p className="text-xs text-gray-400">Audio-only calls with fans</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCallSettings({ ...callSettings, isAvailableForVoiceCalls: !callSettings.isAvailableForVoiceCalls })}
                  >
                    {callSettings.isAvailableForVoiceCalls ? (
                      <ToggleRight className="w-10 h-10 text-green-500" />
                    ) : (
                      <ToggleLeft className="w-10 h-10 text-gray-500" />
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Rate per minute</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={callSettings.voiceCallRatePerMinute || ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/^0+/, '') || '1';
                          setCallSettings({ ...callSettings, voiceCallRatePerMinute: parseInt(val) || 1 });
                        }}
                        className="w-full px-3 py-2 bg-black/40 border border-blue-500/30 rounded-lg text-white font-semibold text-center focus:outline-none focus:border-blue-500"
                      />
                      <span className="text-xs text-gray-400">coins</span>
                    </div>
                    <p className="text-xs text-green-400 mt-1">{formatCoinsToUSD(callSettings.voiceCallRatePerMinute)}/min</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Minimum duration</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={callSettings.minimumVoiceCallDuration || ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/^0+/, '') || '1';
                          setCallSettings({ ...callSettings, minimumVoiceCallDuration: Math.min(60, parseInt(val) || 1) });
                        }}
                        className="w-full px-3 py-2 bg-black/40 border border-blue-500/30 rounded-lg text-white font-semibold text-center focus:outline-none focus:border-blue-500"
                      />
                      <span className="text-xs text-gray-400">mins</span>
                    </div>
                  </div>
                </div>
              </GlassCard>

              <GlassButton
                variant="gradient"
                onClick={saveSettings}
                disabled={saving}
                className="w-full"
              >
                {saving ? <LoadingSpinner size="sm" /> : 'Save Call Settings'}
              </GlassButton>
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <div className="space-y-6">
              <GlassCard className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-pink-500/20 rounded-lg">
                    <MessageSquare className="w-5 h-5 text-pink-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Message Rate</h3>
                    <p className="text-xs text-gray-400">Set to 0 for free messages</p>
                  </div>
                </div>

                <div className="max-w-xs">
                  <label className="block text-xs font-medium text-gray-400 mb-1">Cost per message</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={callSettings.messageRate || ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/^0+/, '') || '0';
                        setCallSettings({ ...callSettings, messageRate: parseInt(val) || 0 });
                      }}
                      className="w-full px-3 py-2 bg-black/40 border border-pink-500/30 rounded-lg text-white font-semibold text-center focus:outline-none focus:border-pink-500"
                    />
                    <span className="text-xs text-gray-400">coins</span>
                  </div>
                  <p className="text-xs text-green-400 mt-1">
                    {callSettings.messageRate === 0 ? 'Free' : `${formatCoinsToUSD(callSettings.messageRate)}/message`}
                  </p>
                </div>
              </GlassCard>

              <GlassButton
                variant="gradient"
                onClick={saveSettings}
                disabled={saving}
                className="w-full"
              >
                {saving ? <LoadingSpinner size="sm" /> : 'Save Message Settings'}
              </GlassButton>
            </div>
          )}

          {/* Subscriptions Tab */}
          {activeTab === 'subscriptions' && (
            <div className="space-y-6">
              {/* What Subscribers Get */}
              <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl">
                <h4 className="text-sm font-semibold text-purple-300 mb-2">What Subscribers Get</h4>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 text-white text-sm">
                    <span className="text-lg">🔴</span>
                    <span>Subs Only Streams</span>
                  </div>
                  <div className="flex items-center gap-2 text-white text-sm">
                    <span className="text-lg">💬</span>
                    <span>Free Chats</span>
                  </div>
                </div>
              </div>

              <GlassCard className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Star className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white">Enable Subscriptions</h3>
                    <p className="text-xs text-gray-400">Allow fans to subscribe monthly</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSubscriptionSettings({ ...subscriptionSettings, enabled: !subscriptionSettings.enabled })}
                  >
                    {subscriptionSettings.enabled ? (
                      <ToggleRight className="w-10 h-10 text-purple-500" />
                    ) : (
                      <ToggleLeft className="w-10 h-10 text-gray-500" />
                    )}
                  </button>
                </div>

                {subscriptionSettings.enabled && (
                  <div className="space-y-4 pt-4 border-t border-white/10">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Subscription name</label>
                      <input
                        type="text"
                        value={subscriptionSettings.subscriptionName}
                        onChange={(e) => setSubscriptionSettings({ ...subscriptionSettings, subscriptionName: e.target.value })}
                        placeholder="Superfan"
                        className="w-full px-3 py-2 bg-black/40 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div className="max-w-xs">
                      <label className="block text-xs font-medium text-gray-400 mb-1">Monthly price</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          value={subscriptionSettings.monthlyPrice || ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/^0+/, '') || '1';
                            setSubscriptionSettings({ ...subscriptionSettings, monthlyPrice: parseInt(val) || 1 });
                          }}
                          className="w-full px-3 py-2 bg-black/40 border border-purple-500/30 rounded-lg text-white font-semibold text-center focus:outline-none focus:border-purple-500"
                        />
                        <span className="text-xs text-gray-400">coins/mo</span>
                      </div>
                      <p className="text-xs text-green-400 mt-1">{formatCoinsToUSD(subscriptionSettings.monthlyPrice)}/month</p>
                    </div>
                  </div>
                )}
              </GlassCard>

              <GlassButton
                variant="gradient"
                onClick={saveSettings}
                disabled={saving}
                className="w-full"
              >
                {saving ? <LoadingSpinner size="sm" /> : 'Save Subscription Settings'}
              </GlassButton>
            </div>
          )}

          {/* Menu Tab */}
          {activeTab === 'menu' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">
                  Sell interactions, digital products, or custom services during streams
                </p>
                <GlassButton
                  onClick={openAddModal}
                  variant="gradient"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </GlassButton>
              </div>

              {menuItems.length === 0 ? (
                <GlassCard className="p-8 text-center">
                  <Coins className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No menu items yet</h3>
                  <p className="text-gray-400 mb-4">
                    Add items that fans can tip for during your live streams
                  </p>
                  <GlassButton onClick={openAddModal} variant="gradient">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Item
                  </GlassButton>
                </GlassCard>
              ) : (
                <div className="space-y-3">
                  {menuItems.map((item) => (
                    <GlassCard
                      key={item.id}
                      className={`p-4 ${!item.isActive ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl w-10 text-center">
                          {item.emoji || '🎁'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white truncate">
                              {item.label}
                            </span>
                            {!item.isActive && (
                              <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-800 rounded">
                                Hidden
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-sm text-gray-400 truncate">{item.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-yellow-400 font-bold">
                          <Coins className="w-4 h-4" />
                          {item.price}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleItemActive(item)}
                            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                              item.isActive
                                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                            }`}
                          >
                            {item.isActive ? 'Active' : 'Enable'}
                          </button>
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-2 text-gray-400 hover:text-white transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Menu Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <GlassCard className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {editingItem ? 'Edit Item' : 'Add Menu Item'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Emoji Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Icon (optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFormEmoji(formEmoji === emoji ? '' : emoji)}
                      className={`w-10 h-10 text-xl rounded-lg border transition-colors ${
                        formEmoji === emoji
                          ? 'border-cyan-500 bg-cyan-500/20'
                          : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Label */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Label *
                </label>
                <input
                  type="text"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder="e.g., Song Request, Shoutout"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  maxLength={50}
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Price (coins) *
                </label>
                <div className="relative">
                  <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-400" />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={formPrice}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setFormPrice(value);
                    }}
                    placeholder="100"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Short description of what they get"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  maxLength={100}
                />
              </div>

              {/* Category & Fulfillment Type */}
              <div className="grid grid-cols-2 gap-3">
                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as 'interaction' | 'product' | 'service')}
                    className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="interaction" className="bg-gray-900">⚡ Interaction</option>
                    <option value="product" className="bg-gray-900">📦 Product</option>
                    <option value="service" className="bg-gray-900">🎯 Service</option>
                  </select>
                </div>

                {/* Fulfillment Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Delivery
                  </label>
                  <select
                    value={formFulfillment}
                    onChange={(e) => setFormFulfillment(e.target.value as 'instant' | 'digital' | 'manual')}
                    className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="instant" className="bg-gray-900">⚡ Instant</option>
                    <option value="digital" className="bg-gray-900">📥 Digital Download</option>
                    <option value="manual" className="bg-gray-900">✋ Manual Fulfillment</option>
                  </select>
                </div>
              </div>

              {/* Digital Content URL - only show for digital fulfillment */}
              {formFulfillment === 'digital' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Download URL *
                  </label>
                  <input
                    type="url"
                    value={formDigitalUrl}
                    onChange={(e) => setFormDigitalUrl(e.target.value)}
                    placeholder="https://drive.google.com/... or any download link"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Buyers will get this link immediately after purchase
                  </p>
                </div>
              )}

              {/* Manual Fulfillment Info */}
              {formFulfillment === 'manual' && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-sm text-yellow-300">
                    You'll need to manually fulfill this item. Orders will appear in your pending orders.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <GlassButton
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  variant="ghost"
                  className="flex-1"
                >
                  Cancel
                </GlassButton>
                <GlassButton
                  onClick={handleSaveItem}
                  variant="gradient"
                  className="flex-1"
                  disabled={!formLabel.trim() || !formPrice || savingItem}
                >
                  {savingItem ? <LoadingSpinner size="sm" /> : editingItem ? 'Save Changes' : 'Add Item'}
                </GlassButton>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
