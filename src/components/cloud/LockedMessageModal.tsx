'use client';

import { useState, useEffect } from 'react';
import { GlassModal } from '@/components/ui/GlassModal';
import { Lock, Users, Star, Globe, Send, AlertCircle, Search } from 'lucide-react';

interface LockedMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  selectedItemIds: string[];
}

const segments = [
  { value: 'individual', label: 'Individual fans', icon: Users, description: 'Choose specific fans' },
  { value: 'top_fans', label: 'Top fans', icon: Star, description: 'Highest spenders on your content' },
  { value: 'all_followers', label: 'All followers', icon: Globe, description: 'Everyone who follows you' },
];

export function LockedMessageModal({ isOpen, onClose, selectedCount, selectedItemIds }: LockedMessageModalProps) {
  const [segment, setSegment] = useState('top_fans');
  const [price, setPrice] = useState('');
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Individual fan search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; username: string; displayName: string; avatarUrl: string | null }>>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);

  // Search for fans
  useEffect(() => {
    if (segment !== 'individual' || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/follow/followers?search=${encodeURIComponent(searchQuery)}&limit=10`);
        const data = await res.json();
        if (res.ok) setSearchResults(data.followers || []);
      } catch (err) {
        console.error('Search error:', err);
      }
      setSearching(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, segment]);

  const handleSend = async () => {
    if (!price || parseInt(price) <= 0) {
      setError('Set a price for the locked content');
      return;
    }

    if (segment === 'individual' && selectedRecipients.length === 0) {
      setError('Select at least one fan');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/cloud/locked-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: selectedItemIds,
          priceCoins: parseInt(price),
          messageText: messageText || undefined,
          segment,
          recipientIds: segment === 'individual' ? selectedRecipients : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(`Sent to ${data.recipientCount} fans!`);
        setTimeout(() => {
          onClose();
          setSuccess('');
          setPrice('');
          setMessageText('');
          setSelectedRecipients([]);
        }, 1500);
      } else {
        setError(data.error || 'Failed to send');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    }

    setLoading(false);
  };

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title="Send Locked Content" size="sm">
      <div className="space-y-5">
        {/* Item count */}
        <div className="bg-white/5 rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
            <Lock className="w-5 h-5 text-pink-400" />
          </div>
          <div>
            <p className="text-white font-medium">{selectedCount} items</p>
            <p className="text-gray-500 text-xs">Fans pay to unlock</p>
          </div>
        </div>

        {/* Price */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-300">Unlock price</label>
          <div className="relative">
            <input
              type="number"
              min="1"
              placeholder="e.g. 10"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-16 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/40"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">coins</span>
          </div>
        </div>

        {/* Caption */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-300">Caption <span className="text-gray-600">(optional)</span></label>
          <input
            type="text"
            placeholder="New exclusive content..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            maxLength={200}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/40 text-sm"
          />
        </div>

        {/* Segment */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Send to</label>
          <div className="space-y-2">
            {segments.map(seg => {
              const Icon = seg.icon;
              const isActive = segment === seg.value;
              return (
                <button
                  key={seg.value}
                  onClick={() => setSegment(seg.value)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    isActive
                      ? 'bg-cyan-500/10 border-cyan-500/30'
                      : 'bg-white/5 border-transparent hover:bg-white/10'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-400' : 'text-gray-500'}`} />
                  <div>
                    <p className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-400'}`}>{seg.label}</p>
                    <p className="text-xs text-gray-500">{seg.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Individual fan search */}
        {segment === 'individual' && (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search fans..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/40"
              />
            </div>

            {searchResults.length > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-1">
                {searchResults.map(fan => (
                  <button
                    key={fan.id}
                    onClick={() => {
                      setSelectedRecipients(prev =>
                        prev.includes(fan.id) ? prev.filter(id => id !== fan.id) : [...prev, fan.id]
                      );
                    }}
                    className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${
                      selectedRecipients.includes(fan.id)
                        ? 'bg-cyan-500/20'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                      {fan.avatarUrl && <img src={fan.avatarUrl} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <span className="text-sm text-white">{fan.displayName || fan.username}</span>
                  </button>
                ))}
              </div>
            )}

            {selectedRecipients.length > 0 && (
              <p className="text-xs text-cyan-400">{selectedRecipients.length} fans selected</p>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center text-green-400 font-medium bg-green-500/10 rounded-xl p-3">
            {success}
          </div>
        ) : (
          <button
            onClick={handleSend}
            disabled={loading || !price}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-black bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-400 hover:to-pink-500 disabled:opacity-50 transition-all"
          >
            <Send className="w-4 h-4" />
            {loading ? 'Sending...' : 'Send locked content'}
          </button>
        )}
      </div>
    </GlassModal>
  );
}
