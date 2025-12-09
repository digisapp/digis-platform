'use client';

import { useState, useEffect, useRef } from 'react';
import { Star, StarOff, Users, Coins, ChevronUp, ChevronDown, Search, X, UserPlus } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface FeaturedCreator {
  id: string;
  creatorId: string;
  displayName: string | null;
  username: string;
  avatarUrl: string | null;
  lineupOrder: number;
  isSpotlighted: boolean;
  tipsReceived: number;
  giftCount: number;
}

interface SearchResult {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface FeaturedCreatorsPanelProps {
  streamId: string;
  onSpotlightChange?: (creator: FeaturedCreator | null) => void;
  isHost?: boolean; // Whether the current user is the stream host
}

export function FeaturedCreatorsPanel({ streamId, onSpotlightChange, isHost = false }: FeaturedCreatorsPanelProps) {
  const [creators, setCreators] = useState<FeaturedCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [spotlighting, setSpotlighting] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  // Search state (for adding creators during stream)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [addingCreator, setAddingCreator] = useState<string | null>(null);
  const [removingCreator, setRemovingCreator] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Fetch featured creators
  useEffect(() => {
    fetchFeaturedCreators();
    // Poll every 10 seconds for tip updates
    const interval = setInterval(fetchFeaturedCreators, 10000);
    return () => clearInterval(interval);
  }, [streamId]);

  // Search for creators to add
  useEffect(() => {
    if (!isHost) return;

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
          // Filter out already featured creators
          const filtered = (data.creators || []).filter(
            (c: SearchResult) => !creators.some(fc => fc.creatorId === c.id)
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
  }, [searchQuery, creators, isHost]);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearch(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchFeaturedCreators = async () => {
    try {
      const response = await fetch(`/api/streams/${streamId}/featured`);
      const data = await response.json();

      if (response.ok) {
        setCreators(data.featuredCreators || []);
      }
    } catch (err) {
      console.error('Error fetching featured creators:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSpotlight = async (creator: FeaturedCreator) => {
    const newSpotlightState = !creator.isSpotlighted;
    setSpotlighting(creator.creatorId);

    try {
      const response = await fetch(`/api/streams/${streamId}/featured/${creator.creatorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSpotlighted: newSpotlightState }),
      });

      if (response.ok) {
        // Update local state
        setCreators(prev => prev.map(c => ({
          ...c,
          isSpotlighted: c.creatorId === creator.creatorId ? newSpotlightState : false,
        })));

        // Notify parent
        if (onSpotlightChange) {
          onSpotlightChange(newSpotlightState ? { ...creator, isSpotlighted: true } : null);
        }
      }
    } catch (err) {
      console.error('Error toggling spotlight:', err);
    } finally {
      setSpotlighting(null);
    }
  };

  // Add a new featured creator during stream
  const handleAddCreator = async (creator: SearchResult) => {
    if (creators.length >= 20) {
      alert('Maximum 20 featured creators allowed');
      return;
    }

    setAddingCreator(creator.id);

    try {
      const response = await fetch(`/api/streams/${streamId}/featured`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId: creator.id }),
      });

      if (response.ok) {
        // Refresh the list
        await fetchFeaturedCreators();
        setSearchQuery('');
        setSearchResults([]);
        setShowSearch(false);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to add creator');
      }
    } catch (err) {
      console.error('Error adding creator:', err);
      alert('Failed to add creator');
    } finally {
      setAddingCreator(null);
    }
  };

  // Remove a featured creator during stream
  const handleRemoveCreator = async (creatorId: string) => {
    setRemovingCreator(creatorId);

    try {
      const response = await fetch(`/api/streams/${streamId}/featured/${creatorId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Update local state immediately
        setCreators(prev => prev.filter(c => c.creatorId !== creatorId));
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to remove creator');
      }
    } catch (err) {
      console.error('Error removing creator:', err);
      alert('Failed to remove creator');
    } finally {
      setRemovingCreator(null);
    }
  };

  if (loading) {
    return (
      <div className="backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 p-3">
        <div className="flex items-center justify-center py-4">
          <LoadingSpinner size="sm" />
        </div>
      </div>
    );
  }

  // Show panel if there are creators OR if host can add creators
  if (creators.length === 0 && !isHost) {
    return null;
  }

  const spotlightedCreator = creators.find(c => c.isSpotlighted);

  return (
    <div className="backdrop-blur-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border-2 border-purple-500/30 overflow-hidden">
      {/* Header - Always visible */}
      <div className="flex items-center justify-between p-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 hover:bg-white/5 rounded-lg px-2 py-1 -ml-2 transition-colors"
        >
          <Users className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-bold text-white">Featured Creators</span>
          <span className="text-xs text-gray-400">({creators.length}/20)</span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>
        <div className="flex items-center gap-2">
          {spotlightedCreator && (
            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Star className="w-3 h-3 fill-current" />
              {spotlightedCreator.username}
            </span>
          )}
          {/* Add Creator Button - Host only */}
          {isHost && creators.length < 20 && (
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors"
              title="Add creator"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search Dropdown - Host only */}
      {isHost && showSearch && (
        <div ref={searchRef} className="border-t border-white/10 p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search creators to add..."
              className="w-full pl-9 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:border-purple-500/50"
              autoFocus
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <LoadingSpinner size="sm" />
              </div>
            )}
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-2 space-y-1 max-h-[200px] overflow-y-auto">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleAddCreator(result)}
                  disabled={addingCreator === result.id}
                  className="w-full flex items-center gap-2 p-2 bg-white/5 hover:bg-purple-500/20 rounded-lg transition-colors text-left disabled:opacity-50"
                >
                  {result.avatarUrl ? (
                    <img src={result.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-sm">👤</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">{result.displayName || result.username}</div>
                    <div className="text-gray-400 text-xs truncate">@{result.username}</div>
                  </div>
                  {addingCreator === result.id ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <UserPlus className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* No Results */}
          {searchQuery.length >= 1 && !isSearching && searchResults.length === 0 && (
            <p className="text-gray-400 text-xs text-center mt-2">No creators found</p>
          )}
        </div>
      )}

      {/* Creator List - Collapsible */}
      {isExpanded && (
        <div className={`${showSearch ? '' : 'border-t border-white/10'} p-2 space-y-1.5 max-h-[300px] overflow-y-auto`}>
          {creators.length === 0 ? (
            <div className="text-center py-4">
              <Users className="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No featured creators yet</p>
              {isHost && (
                <p className="text-gray-500 text-xs mt-1">Tap + to add creators</p>
              )}
            </div>
          ) : creators.map((creator, index) => (
            <div
              key={creator.id}
              className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                creator.isSpotlighted
                  ? 'bg-yellow-500/20 border border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.3)]'
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              {/* Order Number */}
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                creator.isSpotlighted ? 'bg-yellow-500 text-black' : 'bg-purple-500/30 text-purple-300'
              }`}>
                {index + 1}
              </div>

              {/* Avatar */}
              {creator.avatarUrl ? (
                <img
                  src={creator.avatarUrl}
                  alt={creator.username}
                  className={`w-8 h-8 rounded-full object-cover border-2 ${
                    creator.isSpotlighted ? 'border-yellow-500' : 'border-purple-500/30'
                  }`}
                />
              ) : (
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center border-2 ${
                  creator.isSpotlighted ? 'border-yellow-500' : 'border-purple-500/30'
                }`}>
                  <span className="text-sm">👤</span>
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white text-sm truncate">
                  {creator.displayName || creator.username}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-400">@{creator.username}</span>
                  {creator.tipsReceived > 0 && (
                    <span className="text-yellow-400 flex items-center gap-0.5">
                      <Coins className="w-3 h-3" />
                      {creator.tipsReceived}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                {/* Spotlight Button - Host only */}
                {isHost && (
                  <button
                    onClick={() => handleSpotlight(creator)}
                    disabled={spotlighting === creator.creatorId}
                    className={`p-2 rounded-lg transition-all ${
                      creator.isSpotlighted
                        ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                        : 'bg-white/10 text-gray-400 hover:bg-yellow-500/20 hover:text-yellow-400'
                    }`}
                    title={creator.isSpotlighted ? 'Remove spotlight' : 'Spotlight this creator'}
                  >
                    {spotlighting === creator.creatorId ? (
                      <LoadingSpinner size="sm" />
                    ) : creator.isSpotlighted ? (
                      <Star className="w-4 h-4 fill-current" />
                    ) : (
                      <StarOff className="w-4 h-4" />
                    )}
                  </button>
                )}

                {/* Remove Button - Host only */}
                {isHost && (
                  <button
                    onClick={() => handleRemoveCreator(creator.creatorId)}
                    disabled={removingCreator === creator.creatorId}
                    className="p-2 rounded-lg bg-white/10 text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-all"
                    title="Remove creator"
                  >
                    {removingCreator === creator.creatorId ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Quick tip */}
          {creators.length > 0 && (
            <p className="text-xs text-gray-500 text-center pt-2 border-t border-white/10 mt-2">
              {isHost ? 'Tap ⭐ to spotlight • Tap ✕ to remove' : 'Spotlighted creators receive tips directly!'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
