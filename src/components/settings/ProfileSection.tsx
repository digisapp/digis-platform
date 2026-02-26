'use client';

import { useState } from 'react';
import { GlassInput, LoadingSpinner } from '@/components/ui';
import { CheckCircle, XCircle, Loader2, User, AtSign, MessageSquare, AlertCircle, Upload, Image as ImageIcon, Mail, Calendar, Shield, Crown, Star, Tag } from 'lucide-react';
import { CREATOR_CATEGORIES } from '@/lib/constants/categories';
import { getNextTierProgress, getTierConfig, type SpendTier } from '@/lib/tiers/spend-tiers';
import { getCreatorNextTierProgress, type CreatorTier } from '@/lib/tiers/creator-tiers';
import type { SettingsFormState } from '@/hooks/useSettingsForm';
import type { UsernameStatus } from './types';

interface CategoryDropdownProps {
  label: string;
  hint: string;
  selectedValue: string;
  excludeValue?: string;
  showNone?: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
}

function CategoryDropdown({ label, hint, selectedValue, excludeValue, showNone, isOpen, onToggle, onSelect }: CategoryDropdownProps) {
  const categories = excludeValue
    ? CREATOR_CATEGORIES.filter(cat => cat.value !== excludeValue)
    : CREATOR_CATEGORIES;

  return (
    <div>
      <label className="block text-sm font-medium mb-2 text-gray-300">
        <Tag className="w-4 h-4 inline mr-1" />
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={onToggle}
          className={`w-full px-4 py-3 rounded-xl text-left transition-all duration-300 flex items-center justify-between ${
            selectedValue
              ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-2 border-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.15)]'
              : 'bg-white/5 border-2 border-white/10 hover:border-cyan-500/30'
          }`}
        >
          <span className="flex items-center gap-3">
            {selectedValue ? (
              <>
                <span className="text-xl">{CREATOR_CATEGORIES.find(c => c.value === selectedValue)?.emoji}</span>
                <span className="text-white font-medium">{CREATOR_CATEGORIES.find(c => c.value === selectedValue)?.label}</span>
              </>
            ) : (
              <span className="text-gray-400">{showNone ? 'None' : 'Select a category...'}</span>
            )}
          </span>
          <svg
            className={`w-5 h-5 text-cyan-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-2 py-2 bg-gray-900/95 backdrop-blur-xl border-2 border-cyan-500/30 rounded-xl shadow-[0_0_30px_rgba(34,211,238,0.2)] max-h-64 overflow-y-auto">
            {showNone && (
              <button
                type="button"
                onClick={() => onSelect('')}
                className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-all duration-200 ${
                  !selectedValue
                    ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border-l-2 border-cyan-400'
                    : 'text-gray-300 hover:bg-cyan-500/10 hover:text-white border-l-2 border-transparent'
                }`}
              >
                <span className="text-xl">-</span>
                <span className="font-medium">None</span>
              </button>
            )}
            {categories.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => onSelect(cat.value)}
                className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-all duration-200 ${
                  selectedValue === cat.value
                    ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border-l-2 border-cyan-400'
                    : 'text-gray-300 hover:bg-cyan-500/10 hover:text-white border-l-2 border-transparent'
                }`}
              >
                <span className="text-xl">{cat.emoji}</span>
                <span className="font-medium">{cat.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-1">{hint}</p>
    </div>
  );
}

interface ProfileSectionProps {
  currentUser: any;
  form: SettingsFormState;
  setField: <K extends keyof SettingsFormState>(key: K, value: SettingsFormState[K]) => void;
  avatarPreview: string | undefined;
  bannerPreview: string | undefined;
  uploadingAvatar: boolean;
  uploadingBanner: boolean;
  handleAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBannerUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  newUsername: string;
  setNewUsername: (val: string) => void;
  usernameStatus: 'idle' | 'checking' | 'available' | 'taken';
  usernameError: string;
  usernameCooldown: UsernameStatus | null;
  savingUsername: boolean;
  handleChangeUsername: (e: React.FormEvent) => void;
}

export function ProfileSection({
  currentUser, form, setField,
  avatarPreview, bannerPreview, uploadingAvatar, uploadingBanner,
  handleAvatarUpload, handleBannerUpload,
  newUsername, setNewUsername, usernameStatus, usernameError, usernameCooldown,
  savingUsername, handleChangeUsername,
}: ProfileSectionProps) {
  const { displayName, bio, city, state, phoneNumber, avatarUrl, bannerUrl,
    primaryCategory, secondaryCategory, email, contactEmail } = form;

  const [showPrimaryCategoryDropdown, setShowPrimaryCategoryDropdown] = useState(false);
  const [showSecondaryCategoryDropdown, setShowSecondaryCategoryDropdown] = useState(false);

  return (
    <div className="space-y-6">
      {/* Profile Media */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-digis-cyan" />
          Profile Media
        </h3>
        <div className="space-y-4">
          {/* Banner Preview - Clickable - Creators Only */}
          {currentUser?.role === 'creator' && (
            <label className="relative aspect-[3/1] md:aspect-[4/1] rounded-lg overflow-hidden bg-gradient-to-br from-digis-cyan/20 to-digis-pink/20 cursor-pointer group block">
              {(bannerPreview || bannerUrl) ? (
                <>
                  <img src={bannerPreview || bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                  <div className="absolute bottom-2 right-2 p-2 bg-black/60 backdrop-blur-sm rounded-lg flex items-center gap-1.5 text-white/80 group-hover:bg-cyan-500 group-hover:text-white transition-all">
                    <Upload className="w-4 h-4" />
                    <span className="text-xs font-medium">Edit</span>
                  </div>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="text-center">
                      <Upload className="w-6 h-6 text-white mx-auto mb-1" />
                      <p className="text-xs text-white font-medium">Change Banner</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 group-hover:text-digis-pink transition-colors">
                  <Upload className="w-8 h-8 mb-2" />
                  <p className="text-sm font-medium">Click to add banner</p>
                  <p className="text-xs mt-1 opacity-60">3000 x 1000px recommended</p>
                </div>
              )}
              {uploadingBanner && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <LoadingSpinner size="sm" />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleBannerUpload}
                disabled={uploadingBanner}
                className="hidden"
              />
            </label>
          )}
          {currentUser?.role === 'creator' && (
            <p className="text-xs text-gray-500">Recommended: 3000 x 1000px landscape image. Min 1500px wide for best quality.</p>
          )}

          {/* Avatar & Info */}
          <div className={`flex items-start gap-4 relative z-10 px-4 ${currentUser?.role === 'creator' ? '-mt-12' : ''}`}>
            <label className="relative cursor-pointer group flex-shrink-0">
              {(avatarPreview || avatarUrl) ? (
                <>
                  <img src={avatarPreview || avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover" />
                  <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 p-1.5 bg-cyan-500 rounded-full border-2 border-white group-hover:bg-cyan-400 transition-colors">
                    <Upload className="w-3 h-3 text-white" />
                  </div>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-white text-2xl font-bold group-hover:scale-105 transition-transform">
                    {currentUser?.username?.[0]?.toUpperCase()}
                  </div>
                  <div className="absolute -bottom-1 -right-1 p-1.5 bg-cyan-500 rounded-full border-2 border-white group-hover:bg-cyan-400 transition-colors">
                    <Upload className="w-3 h-3 text-white" />
                  </div>
                </>
              )}
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-black/70 rounded-full flex items-center justify-center border-4 border-white">
                  <LoadingSpinner size="sm" />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
                className="hidden"
              />
            </label>

            <div className="flex-1 mt-6">
              <h4 className="font-bold text-white text-lg">{displayName || 'Your Name'}</h4>
              <p className="text-sm text-gray-400">@{currentUser?.username}</p>
              {bio && (
                <p className="text-sm text-gray-300 mt-2 line-clamp-2">{bio}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="pt-6 border-t border-cyan-500/20">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-digis-pink" />
          <h3 className="text-lg font-semibold text-white">Profile Information</h3>
        </div>

        <div className="space-y-4">
          <GlassInput
            type="text"
            label="Display Name"
            placeholder="Your name"
            value={displayName}
            onChange={(e) => setField('displayName', e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              <MessageSquare className="w-4 h-4 inline mr-1" />
              Bio
            </label>
            <textarea
              className="w-full px-4 py-3 backdrop-blur-xl bg-white/5 border border-cyan-500/30 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-digis-cyan/50 backdrop-blur-sm resize-none"
              placeholder="Tell us about yourself..."
              rows={4}
              value={bio}
              onChange={(e) => setField('bio', e.target.value)}
              maxLength={500}
            />
            <p className="text-xs text-gray-400 mt-1">{bio.length}/500 characters</p>
          </div>

          {/* Category selectors - Only for creators */}
          {currentUser?.role === 'creator' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CategoryDropdown
                label="Primary Category"
                hint="Main content category for discovery"
                selectedValue={primaryCategory}
                isOpen={showPrimaryCategoryDropdown}
                onToggle={() => {
                  setShowPrimaryCategoryDropdown(!showPrimaryCategoryDropdown);
                  setShowSecondaryCategoryDropdown(false);
                }}
                onSelect={(value) => {
                  setField('primaryCategory', value);
                  setShowPrimaryCategoryDropdown(false);
                  if (secondaryCategory === value) {
                    setField('secondaryCategory', '');
                  }
                }}
              />
              <CategoryDropdown
                label="Secondary Category (Optional)"
                hint="Additional content category"
                selectedValue={secondaryCategory}
                excludeValue={primaryCategory}
                showNone
                isOpen={showSecondaryCategoryDropdown}
                onToggle={() => {
                  setShowSecondaryCategoryDropdown(!showSecondaryCategoryDropdown);
                  setShowPrimaryCategoryDropdown(false);
                }}
                onSelect={(value) => {
                  setField('secondaryCategory', value);
                  setShowSecondaryCategoryDropdown(false);
                }}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GlassInput
              type="text"
              label="City"
              placeholder="Los Angeles"
              value={city}
              onChange={(e) => setField('city', e.target.value)}
            />

            <GlassInput
              type="text"
              label="State"
              placeholder="California"
              value={state}
              onChange={(e) => setField('state', e.target.value)}
            />
          </div>

          <GlassInput
            type="tel"
            label="Phone Number"
            placeholder="+1 (555) 123-4567"
            value={phoneNumber}
            onChange={(e) => setField('phoneNumber', e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300 flex items-center gap-2">
              <Mail className="w-4 h-4 text-cyan-400" />
              Contact Email
            </label>
            <input
              type="email"
              placeholder="your@email.com"
              value={contactEmail}
              onChange={(e) => setField('contactEmail', e.target.value)}
              className="w-full px-4 py-3 backdrop-blur-xl bg-white/5 border border-cyan-500/30 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
            <p className="text-xs text-gray-400 mt-1">Contact email shown on your public profile</p>
          </div>
        </div>
      </div>

      {/* Account Details Section */}
      <div className="pt-6 border-t border-cyan-500/20">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-digis-purple" />
          <h3 className="text-lg font-semibold text-white">Account</h3>
        </div>

        <div className="space-y-4">
          {/* Username - Editable */}
          <div className="p-3 backdrop-blur-xl bg-white/5 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AtSign className="w-4 h-4 text-digis-purple" />
              <p className="text-xs text-gray-400">Username</p>
            </div>
            {usernameCooldown && !usernameCooldown.canChange ? (
              <p className="text-xs text-yellow-300 mb-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Can change in {usernameCooldown.daysRemaining} day{usernameCooldown.daysRemaining !== 1 ? 's' : ''}
              </p>
            ) : usernameCooldown && (
              <p className="text-xs text-gray-400 mb-2">
                {usernameCooldown.changesRemaining} of {usernameCooldown.maxChanges} changes left this month
              </p>
            )}
            <div className="relative">
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                disabled={usernameCooldown?.canChange === false}
                placeholder={currentUser?.username}
                className={`w-full px-3 py-2 bg-black/30 border rounded-lg text-white text-sm font-medium placeholder-gray-500 focus:outline-none transition-all ${
                  !newUsername || newUsername === currentUser?.username || newUsername.length < 3
                    ? 'border-white/10 focus:border-digis-cyan'
                    : usernameStatus === 'checking'
                    ? 'border-yellow-400'
                    : usernameStatus === 'available'
                    ? 'border-green-500'
                    : usernameStatus === 'taken'
                    ? 'border-red-500'
                    : 'border-white/10'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              />
              {newUsername && newUsername !== currentUser?.username && newUsername.length >= 3 && (
                <div className="absolute right-2 top-2">
                  {usernameStatus === 'checking' && (
                    <div className="flex items-center gap-1">
                      <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
                      <span className="text-xs text-yellow-500">Checking...</span>
                    </div>
                  )}
                  {usernameStatus === 'available' && (
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-xs text-green-500">Available</span>
                    </div>
                  )}
                  {usernameStatus === 'taken' && (
                    <div className="flex items-center gap-1">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="text-xs text-red-500">Taken</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            {usernameError && newUsername.length >= 3 && (
              <p className="text-xs text-red-400 mt-1">{usernameError}</p>
            )}
            {newUsername && newUsername !== currentUser?.username && usernameStatus === 'available' && (
              <button
                type="button"
                onClick={handleChangeUsername}
                disabled={savingUsername}
                className="mt-2 px-3 py-1.5 bg-gradient-to-r from-digis-cyan to-digis-purple text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {savingUsername ? 'Saving...' : 'Update Username'}
              </button>
            )}
          </div>

          {/* Login Email - Editable */}
          <div className="p-3 backdrop-blur-xl bg-white/5 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 text-digis-cyan" />
              <p className="text-xs text-gray-400">Login Email</p>
            </div>
            <div className="relative">
              <input
                type="email"
                className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-digis-cyan transition-all"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setField('email', e.target.value)}
              />
              {currentUser?.email && email === currentUser.email && (
                <span className="absolute right-2 top-2 text-xs text-green-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                </span>
              )}
            </div>
            {email !== currentUser?.email && (
              <p className="text-xs text-yellow-400 mt-1">Click &quot;Save Profile&quot; below to receive a verification email</p>
            )}
          </div>

          {/* Account Type & Member Since - Read Only */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 backdrop-blur-xl bg-white/5 rounded-lg">
              <div className={`p-1.5 bg-gradient-to-br ${currentUser?.role === 'creator' ? 'from-digis-pink to-purple-500' : 'from-digis-cyan to-blue-500'} rounded-md`}>
                {currentUser?.role === 'creator' ? (
                  <Crown className="w-3 h-3 text-white" />
                ) : (
                  <User className="w-3 h-3 text-white" />
                )}
              </div>
              <div>
                <p className="text-xs text-gray-400">Type</p>
                <p className="text-sm font-medium text-white capitalize">{currentUser?.role}</p>
              </div>
            </div>

            {currentUser?.createdAt && (
              <div className="flex items-center gap-2 p-3 backdrop-blur-xl bg-white/5 rounded-lg">
                <div className="p-1.5 bg-gradient-to-br from-digis-purple to-digis-cyan rounded-md">
                  <Calendar className="w-3 h-3 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Joined</p>
                  <p className="text-sm font-medium text-white">
                    {new Date(currentUser.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Spend Tier Progress - Fans Only */}
          {currentUser?.role === 'fan' && (() => {
            const lifetimeSpending = currentUser?.lifetimeSpending || 0;
            const spendTier = currentUser?.spendTier || 'none';
            const progress = getNextTierProgress(lifetimeSpending);
            const currentTierConfig = getTierConfig(spendTier as SpendTier);

            return (
              <div className="p-4 backdrop-blur-xl bg-white/5 rounded-lg border border-cyan-500/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-digis-cyan" />
                    <p className="text-xs text-gray-400">Spend Tier</p>
                  </div>
                  <p className={`text-sm font-bold ${currentTierConfig.color}`}>
                    {currentTierConfig.emoji && `${currentTierConfig.emoji} `}{currentTierConfig.displayName}
                  </p>
                </div>

                {progress.nextTier && (
                  <>
                    <div className="mb-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">{lifetimeSpending.toLocaleString()} coins</span>
                        <span className="text-gray-400">{progress.nextTier.minCoins.toLocaleString()} coins</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-digis-cyan to-digis-pink transition-all duration-500"
                          style={{ width: `${progress.progressPercent}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">
                      {progress.coinsToNext.toLocaleString()} coins until {progress.nextTier.emoji} {progress.nextTier.displayName}
                    </p>
                  </>
                )}

                {!progress.nextTier && (
                  <p className="text-xs text-gray-400">
                    Maximum tier achieved! Total: {lifetimeSpending.toLocaleString()} coins
                  </p>
                )}
              </div>
            );
          })()}

          {/* Creator Tier Progress - Creators Only */}
          {currentUser?.role === 'creator' && (() => {
            const lifetimeTips = currentUser?.lifetimeTipsReceived || 0;
            const progress = getCreatorNextTierProgress(lifetimeTips);
            const currentTierConfig = progress.currentTier;

            return (
              <div className={`p-4 backdrop-blur-xl bg-gradient-to-br ${currentTierConfig.bgColor} rounded-lg border border-cyan-500/20`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <p className="text-xs text-gray-400">Creator Status</p>
                  </div>
                  <p className={`text-sm font-bold ${currentTierConfig.color}`}>
                    {currentTierConfig.emoji} {currentTierConfig.displayName}
                  </p>
                </div>

                {progress.nextTier && (
                  <>
                    <div className="mb-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">{lifetimeTips.toLocaleString()} coins received</span>
                        <span className="text-gray-400">{progress.nextTier.minCoins.toLocaleString()} coins</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r from-purple-500 to-amber-500 transition-all duration-500`}
                          style={{ width: `${progress.progressPercent}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">
                      {progress.coinsToNext.toLocaleString()} coins until {progress.nextTier.emoji} {progress.nextTier.displayName}
                    </p>
                  </>
                )}

                {!progress.nextTier && (
                  <p className="text-xs text-gray-400">
                    Maximum status achieved! Total coins: {lifetimeTips.toLocaleString()}
                  </p>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
