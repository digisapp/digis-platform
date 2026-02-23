'use client';

import { STREAM_CATEGORIES, getSuggestedTags } from '@/lib/constants/stream-categories';
import { HelpCircle } from 'lucide-react';
import { FeaturedCreatorSelector } from '@/components/streams/FeaturedCreatorSelector';
import { PRIVACY_OPTIONS } from './types';
import type { FeaturedCreator } from './types';

interface GoLiveStreamFormProps {
  title: string;
  setTitle: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  showCategoryDropdown: boolean;
  setShowCategoryDropdown: (v: boolean) => void;
  tags: string[];
  setTags: (v: string[]) => void;
  tagInput: string;
  setTagInput: (v: string) => void;
  privacy: string;
  setPrivacy: (v: string) => void;
  goPrivateEnabled: boolean;
  setGoPrivateEnabled: (v: boolean) => void;
  goPrivateRate: number | null;
  setGoPrivateRate: (v: number | null) => void;
  goPrivateMinDuration: number | null;
  setGoPrivateMinDuration: (v: number | null) => void;
  defaultCallSettings: { rate: number; minDuration: number } | null;
  featuredCreators: FeaturedCreator[];
  setFeaturedCreators: (v: FeaturedCreator[]) => void;
  featuredCreatorCommission: number;
  setFeaturedCreatorCommission: (v: number) => void;
}

export function GoLiveStreamForm({
  title, setTitle, category, setCategory,
  showCategoryDropdown, setShowCategoryDropdown,
  tags, setTags, tagInput, setTagInput,
  privacy, setPrivacy,
  goPrivateEnabled, setGoPrivateEnabled,
  goPrivateRate, setGoPrivateRate,
  goPrivateMinDuration, setGoPrivateMinDuration,
  defaultCallSettings,
  featuredCreators, setFeaturedCreators,
  featuredCreatorCommission, setFeaturedCreatorCommission,
}: GoLiveStreamFormProps) {
  return (
    <div className="backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-2xl border-2 border-cyan-500/30 p-6 md:p-8 space-y-3 md:space-y-4 hover:border-cyan-500/50 transition-all duration-300 shadow-[0_0_30px_rgba(34,211,238,0.15)]">
      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-semibold text-white mb-2">
          Title <span className="text-cyan-400">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. &quot;Gaming with Miriam 🎮&quot; or &quot;Q&A + Chill vibes&quot;"
          className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all duration-300"
          maxLength={100}
          required
        />
        <div className="mt-1 text-xs text-gray-500 text-right">
          {title.length}/100
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-semibold text-white mb-2">
          Category
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            className={`w-full px-4 py-3 rounded-xl text-left transition-all duration-300 flex items-center justify-between ${
              category
                ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-2 border-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.15)]'
                : 'bg-white/5 border-2 border-white/10 hover:border-cyan-500/30'
            }`}
          >
            <span className="flex items-center gap-3">
              {category ? (
                <>
                  <span className="text-xl">{STREAM_CATEGORIES.find(c => c.id === category)?.icon}</span>
                  <span className="text-white font-medium">{STREAM_CATEGORIES.find(c => c.id === category)?.name}</span>
                </>
              ) : (
                <span className="text-gray-400">Select a category...</span>
              )}
            </span>
            <svg
              className={`w-5 h-5 text-cyan-400 transition-transform duration-200 ${showCategoryDropdown ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showCategoryDropdown && (
            <div className="absolute z-50 w-full mt-2 py-2 bg-gray-900/95 backdrop-blur-xl border-2 border-cyan-500/30 rounded-xl shadow-[0_0_30px_rgba(34,211,238,0.2)] max-h-64 overflow-y-auto">
              {STREAM_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategory(cat.id);
                    setShowCategoryDropdown(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-all duration-200 ${
                    category === cat.id
                      ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border-l-2 border-cyan-400'
                      : 'text-gray-300 hover:bg-cyan-500/10 hover:text-white border-l-2 border-transparent'
                  }`}
                >
                  <span className="text-xl">{cat.icon}</span>
                  <div>
                    <span className="font-medium">{cat.name}</span>
                    <p className="text-xs text-gray-500">{cat.description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-semibold text-white mb-2">
          Tags <span className="text-gray-500 font-normal">(up to 5)</span>
        </label>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 rounded-full text-sm text-cyan-300"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => setTags(tags.filter(t => t !== tag))}
                  className="ml-1 text-gray-400 hover:text-white"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">#</span>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                const newTag = tagInput.trim();
                if (newTag && !tags.includes(newTag) && tags.length < 5) {
                  setTags([...tags, newTag]);
                  setTagInput('');
                }
              }
            }}
            placeholder="Add a tag and press Enter"
            className="w-full pl-8 pr-4 py-2 bg-white/5 border-2 border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-cyan-500/50 text-sm"
            disabled={tags.length >= 5}
            maxLength={20}
          />
        </div>
        {category && getSuggestedTags(category).length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-gray-500 mb-2">Suggested:</p>
            <div className="flex flex-wrap gap-2">
              {getSuggestedTags(category)
                .filter(t => !tags.includes(t))
                .slice(0, 5)
                .map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      if (tags.length < 5) {
                        setTags([...tags, tag]);
                      }
                    }}
                    className="px-2 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-colors"
                  >
                    #{tag}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Privacy Settings */}
      <div>
        <label className="block text-sm font-semibold text-white mb-2">
          Privacy
        </label>
        <div className="flex gap-2">
          {PRIVACY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPrivacy(option.value)}
              className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                privacy === option.value
                  ? 'bg-cyan-500 text-black'
                  : 'bg-white/5 text-gray-300 border border-white/10 hover:border-cyan-500/30'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Go Private Settings */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-white">
            🔒 Go Private
          </label>
          <div className="group relative">
            <HelpCircle className="w-4 h-4 text-gray-400 hover:text-green-400 cursor-help" />
            <div className="absolute right-0 bottom-full mb-2 w-56 p-3 bg-black/95 border border-white/10 rounded-lg text-xs text-gray-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <p className="font-semibold text-white mb-1">How Go Private works:</p>
              <p>Viewers can request a paid 1-on-1 video call with you during your stream. You set the rate and minimum duration. Accept or decline requests as they come in.</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl border-2 border-green-500/30 bg-green-500/5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-white font-medium">Enable Go Private</span>
              <p className="text-xs text-gray-400">Allow viewers to request 1-on-1 video calls</p>
            </div>
            <button
              type="button"
              onClick={() => setGoPrivateEnabled(!goPrivateEnabled)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                goPrivateEnabled ? 'bg-green-500' : 'bg-gray-600'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                goPrivateEnabled ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {goPrivateEnabled && (
            <>
              <div className="border-t border-white/10 pt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Rate per minute
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={goPrivateRate ?? ''}
                      onChange={(e) => setGoPrivateRate(e.target.value ? parseInt(e.target.value) : null)}
                      placeholder={defaultCallSettings ? `${defaultCallSettings.rate}` : '50'}
                      min={1}
                      className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 text-sm"
                    />
                    <span className="text-gray-400 text-xs whitespace-nowrap">coins</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Min duration
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={goPrivateMinDuration ?? ''}
                      onChange={(e) => setGoPrivateMinDuration(e.target.value ? parseInt(e.target.value) : null)}
                      placeholder={defaultCallSettings ? `${defaultCallSettings.minDuration}` : '5'}
                      min={1}
                      max={60}
                      className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 text-sm"
                    />
                    <span className="text-gray-400 text-xs whitespace-nowrap">mins</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Featured Creators */}
      <FeaturedCreatorSelector
        selectedCreators={featuredCreators}
        onCreatorsChange={setFeaturedCreators}
        maxCreators={30}
      />

      {/* Featured Creator Commission */}
      {featuredCreators.length > 0 && (
        <div>
          <label className="block text-sm font-semibold text-white mb-2">
            Featured Creator Commission
          </label>
          <div className="p-4 rounded-xl border-2 border-pink-500/30 bg-pink-500/5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-300">Your cut on tips sent to featured creators</span>
              <span className="text-lg font-bold text-pink-400">{featuredCreatorCommission}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={featuredCreatorCommission}
              onChange={(e) => setFeaturedCreatorCommission(parseInt(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-pink-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>50%</span>
            </div>
            <p className="mt-3 text-sm text-gray-300">
              When viewers tip a featured creator, you&apos;ll receive <span className="text-pink-400 font-bold">{featuredCreatorCommission}%</span> and they&apos;ll receive <span className="text-pink-400 font-bold">{100 - featuredCreatorCommission}%</span>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
