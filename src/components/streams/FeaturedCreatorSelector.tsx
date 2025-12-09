'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, UserPlus, GripVertical, Users, Info } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface Creator {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isCreatorVerified?: boolean;
  followerCount?: number;
}

interface FeaturedCreatorSelectorProps {
  selectedCreators: Creator[];
  onCreatorsChange: (creators: Creator[]) => void;
  maxCreators?: number;
}

export function FeaturedCreatorSelector({
  selectedCreators,
  onCreatorsChange,
  maxCreators = 20,
}: FeaturedCreatorSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Creator[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search for creators
  useEffect(() => {
    const searchCreators = async () => {
      if (searchQuery.length < 1) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(`/api/creators/search?q=${encodeURIComponent(searchQuery)}&limit=10`);
        const data = await response.json();

        if (response.ok) {
          // Filter out already selected creators
          const filtered = (data.creators || []).filter(
            (c: Creator) => !selectedCreators.some(sc => sc.id === c.id)
          );
          setSearchResults(filtered);
        }
      } catch (err) {
        console.error('Error searching creators:', err);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchCreators, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, selectedCreators]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addCreator = (creator: Creator) => {
    if (selectedCreators.length >= maxCreators) {
      return;
    }
    onCreatorsChange([...selectedCreators, creator]);
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  const removeCreator = (creatorId: string) => {
    onCreatorsChange(selectedCreators.filter(c => c.id !== creatorId));
  };

  const moveCreator = (index: number, direction: 'up' | 'down') => {
    const newCreators = [...selectedCreators];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= newCreators.length) return;

    [newCreators[index], newCreators[newIndex]] = [newCreators[newIndex], newCreators[index]];
    onCreatorsChange(newCreators);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="block text-sm font-semibold text-white">
            <Users className="w-4 h-4 inline mr-2" />
            Featured Creators
          </label>
          <button
            type="button"
            onClick={() => setShowInfoModal(true)}
            className="p-1 text-gray-400 hover:text-cyan-400 transition-colors"
            title="How it works"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
        <span className="text-xs text-gray-400">
          {selectedCreators.length}/{maxCreators}
        </span>
      </div>

      {/* Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowInfoModal(false)}
          />
          <div className="relative bg-gray-900 rounded-2xl border-2 border-cyan-500/30 p-6 max-w-md w-full shadow-[0_0_30px_rgba(34,211,238,0.2)]">
            <button
              type="button"
              onClick={() => setShowInfoModal(false)}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              Featured Creators
            </h3>

            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold text-cyan-400 mb-2">How it works:</h4>
                <ol className="space-y-2 text-gray-300">
                  <li className="flex gap-2">
                    <span className="font-bold text-cyan-400">1.</span>
                    <span><strong>Search</strong> - Type a creator's name/username to find them</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-cyan-400">2.</span>
                    <span><strong>Select</strong> - Click on creators from search results to add them (up to 20)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-cyan-400">3.</span>
                    <span><strong>Reorder</strong> - Use the up/down arrows to set their display order</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-cyan-400">4.</span>
                    <span><strong>Remove</strong> - Click the X to remove a creator</span>
                  </li>
                </ol>
              </div>

              <div>
                <h4 className="font-semibold text-purple-400 mb-2">Use cases:</h4>
                <ul className="space-y-1 text-gray-300">
                  <li className="flex gap-2">
                    <span className="text-purple-400">•</span>
                    <span><strong>Collabs</strong> - Feature who you're streaming with</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-400">•</span>
                    <span><strong>Fashion shows</strong> - Highlight models/designers</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-400">•</span>
                    <span><strong>Group events</strong> - Show all participants</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-400">•</span>
                    <span><strong>Shoutouts</strong> - Promote creators you want to support</span>
                  </li>
                </ul>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowInfoModal(false)}
              className="w-full mt-6 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 rounded-xl text-cyan-400 font-semibold transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search creators to feature..."
            className="w-full pl-10 pr-4 py-3 bg-white/5 border-2 border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all duration-300"
            disabled={selectedCreators.length >= maxCreators}
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <LoadingSpinner size="sm" />
            </div>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute z-50 w-full mt-2 bg-gray-900 border-2 border-cyan-500/30 rounded-xl shadow-xl max-h-64 overflow-y-auto">
            {searchResults.map((creator) => (
              <button
                key={creator.id}
                type="button"
                onClick={() => addCreator(creator)}
                className="w-full flex items-center gap-3 p-3 hover:bg-cyan-500/10 transition-colors text-left"
              >
                {creator.avatarUrl ? (
                  <img
                    src={creator.avatarUrl}
                    alt={creator.username}
                    className="w-10 h-10 rounded-full object-cover border-2 border-cyan-500/30"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center border-2 border-cyan-500/30">
                    <span className="text-lg">👤</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white truncate">
                    {creator.displayName || creator.username}
                  </div>
                  <div className="text-sm text-gray-400 truncate">@{creator.username}</div>
                </div>
                <UserPlus className="w-5 h-5 text-cyan-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* No Results */}
        {showDropdown && searchQuery.length >= 1 && !isSearching && searchResults.length === 0 && (
          <div className="absolute z-50 w-full mt-2 bg-gray-900 border-2 border-white/10 rounded-xl p-4 text-center">
            <p className="text-gray-400 text-sm">No creators found</p>
          </div>
        )}
      </div>

      {/* Selected Creators List */}
      {selectedCreators.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Lineup Order (drag to reorder)</p>
          <div className="space-y-2">
            {selectedCreators.map((creator, index) => (
              <div
                key={creator.id}
                className="flex items-center gap-3 p-3 bg-white/5 border-2 border-purple-500/30 rounded-xl group hover:border-purple-500/50 transition-all"
              >
                {/* Order Number */}
                <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-400">
                  {index + 1}
                </div>

                {/* Drag Handle */}
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveCreator(index, 'up')}
                    disabled={index === 0}
                    className="p-0.5 text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveCreator(index, 'down')}
                    disabled={index === selectedCreators.length - 1}
                    className="p-0.5 text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Avatar */}
                {creator.avatarUrl ? (
                  <img
                    src={creator.avatarUrl}
                    alt={creator.username}
                    className="w-10 h-10 rounded-full object-cover border-2 border-purple-500/30"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border-2 border-purple-500/30">
                    <span className="text-lg">👤</span>
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white truncate">
                    {creator.displayName || creator.username}
                  </div>
                  <div className="text-sm text-gray-400 truncate">@{creator.username}</div>
                </div>

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => removeCreator(creator.id)}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {selectedCreators.length === 0 && (
        <div className="p-4 border-2 border-dashed border-white/10 rounded-xl text-center">
          <Users className="w-8 h-8 text-gray-500 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">
            Feature other creators in your stream
          </p>
          <p className="text-gray-500 text-xs mt-1">
            Great for collabs, fashion shows, group events
          </p>
        </div>
      )}
    </div>
  );
}
