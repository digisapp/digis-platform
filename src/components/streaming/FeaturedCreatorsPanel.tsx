'use client';

import { useState, useEffect } from 'react';
import { Star, StarOff, Users, Coins, ChevronUp, ChevronDown } from 'lucide-react';
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

interface FeaturedCreatorsPanelProps {
  streamId: string;
  onSpotlightChange?: (creator: FeaturedCreator | null) => void;
}

export function FeaturedCreatorsPanel({ streamId, onSpotlightChange }: FeaturedCreatorsPanelProps) {
  const [creators, setCreators] = useState<FeaturedCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [spotlighting, setSpotlighting] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  // Fetch featured creators
  useEffect(() => {
    fetchFeaturedCreators();
    // Poll every 10 seconds for tip updates
    const interval = setInterval(fetchFeaturedCreators, 10000);
    return () => clearInterval(interval);
  }, [streamId]);

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

  if (loading) {
    return (
      <div className="backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 p-3">
        <div className="flex items-center justify-center py-4">
          <LoadingSpinner size="sm" />
        </div>
      </div>
    );
  }

  if (creators.length === 0) {
    return null; // Don't show panel if no featured creators
  }

  const spotlightedCreator = creators.find(c => c.isSpotlighted);

  return (
    <div className="backdrop-blur-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border-2 border-purple-500/30 overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-bold text-white">Featured Creators</span>
          <span className="text-xs text-gray-400">({creators.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {spotlightedCreator && (
            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Star className="w-3 h-3 fill-current" />
              {spotlightedCreator.username}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Creator List - Collapsible */}
      {isExpanded && (
        <div className="border-t border-white/10 p-2 space-y-1.5 max-h-[300px] overflow-y-auto">
          {creators.map((creator, index) => (
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

              {/* Spotlight Button */}
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
            </div>
          ))}

          {/* Quick tip */}
          <p className="text-xs text-gray-500 text-center pt-2 border-t border-white/10 mt-2">
            Tap ⭐ to spotlight a creator. Viewers can tip them directly!
          </p>
        </div>
      )}
    </div>
  );
}
