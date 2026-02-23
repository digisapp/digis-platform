'use client';

import { CheckCircle, Sparkles, MessageCircle, Gift, Bot } from 'lucide-react';
import { AnimatedAvatar } from '@/components/profile/AnimatedAvatar';
import { RequestCallButton } from '@/components/calls/RequestCallButton';
import type { ProfileData } from './types';

interface ProfileHeaderCardProps {
  profile: ProfileData;
  isFollowing: boolean;
  followLoading: boolean;
  isSubscribed: boolean;
  subscriptionTier: any;
  currentUserId: string | null;
  isAuthenticated: boolean;
  aiTwinEnabled: boolean;
  onFollowToggle: () => void;
  onSubscribeClick: () => void;
  onMessageClick: () => void;
  onTipClick: () => void;
  onAiTwinClick: () => void;
  onRequireAuth: (action: string) => void;
}

export function ProfileHeaderCard({
  profile,
  isFollowing,
  followLoading,
  isSubscribed,
  subscriptionTier,
  currentUserId,
  isAuthenticated,
  aiTwinEnabled,
  onFollowToggle,
  onSubscribeClick,
  onMessageClick,
  onTipClick,
  onAiTwinClick,
  onRequireAuth,
}: ProfileHeaderCardProps) {
  const { user } = profile;

  return (
    <div className="relative -mt-24 sm:-mt-28 mb-8">
      <div className="backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 shadow-2xl p-6 sm:p-8">
        {/* Top Row: Avatar, Name, Follow Button */}
        <div className="flex items-start gap-4 sm:gap-6">
          {/* Animated Avatar with Neon Glow */}
          <div className="relative group flex-shrink-0">
            <div className="absolute -inset-1 bg-gradient-to-r from-digis-cyan via-digis-purple to-digis-pink rounded-full blur-lg group-hover:blur-xl transition-all opacity-75 group-hover:opacity-100"></div>
            <div className="relative">
              <AnimatedAvatar
                src={user.avatarUrl}
                alt={user.displayName || user.username}
                size="large"
                isOnline={user.isOnline}
              />
            </div>
          </div>

          {/* Name, Username, Followers + Buttons */}
          <div className="flex-1 min-w-0">
            {/* Name with Verification Badge */}
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white truncate bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent">
                {user.displayName || user.username}
              </h1>
              {user.isCreatorVerified && (
                <div className="relative flex-shrink-0 group" title="Verified Creator">
                  <div className="absolute -inset-1 bg-blue-500 rounded-full blur opacity-75 group-hover:opacity-100"></div>
                  <CheckCircle className="relative w-5 h-5 sm:w-6 sm:h-6 text-white fill-blue-500" strokeWidth={2.5} />
                </div>
              )}
            </div>
            {/* Username slug — below display name */}
            {user.displayName && (
              <p className="text-xs text-gray-500 mb-1 tracking-wide">{user.username}</p>
            )}

            {/* New Creator Badge */}
            {(() => {
              if (user.role !== 'creator') return null;
              const daysSinceJoined = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
              return daysSinceJoined <= 30 ? (
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-amber-400 mb-3">
                  <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>New Creator</span>
                </div>
              ) : null;
            })()}

            {/* Follow & Subscribe Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={onFollowToggle}
                disabled={followLoading}
                className={`px-3 py-1 rounded-full font-medium text-xs transition-all duration-300 disabled:opacity-50 ${
                  isFollowing
                    ? 'bg-white/10 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:scale-105 shadow-sm shadow-cyan-500/30'
                }`}
              >
                {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
              </button>

              {user.role === 'creator' && subscriptionTier && !isSubscribed && currentUserId !== user.id && (
                <button
                  onClick={onSubscribeClick}
                  className="px-3 py-1 rounded-full font-medium text-xs transition-all duration-300 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:scale-105 shadow-sm shadow-purple-500/30"
                >
                  Sub
                </button>
              )}

              {user.role === 'creator' && isSubscribed && currentUserId !== user.id && (
                <div className="px-3 py-1 rounded-full font-medium text-xs bg-white/10 border border-purple-500/50 text-purple-400">
                  Subscribed
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {user.bio && (
          <p className="text-gray-300 mt-4 text-sm sm:text-base leading-relaxed line-clamp-3">
            {user.bio}
          </p>
        )}

        {/* Social Links - Icon Only */}
        {profile.socialLinks && (
          <div className="flex items-center gap-3 mt-3">
            {profile.socialLinks.instagram && (
              <a
                href={`https://instagram.com/${profile.socialLinks.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/70 hover:text-white hover:scale-110 transition-all"
                title={`@${profile.socialLinks.instagram}`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            )}
            {profile.socialLinks.tiktok && (
              <a
                href={`https://tiktok.com/@${profile.socialLinks.tiktok}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/70 hover:text-white hover:scale-110 transition-all"
                title={`@${profile.socialLinks.tiktok}`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </a>
            )}
            {profile.socialLinks.twitter && (
              <a
                href={`https://x.com/${profile.socialLinks.twitter}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/70 hover:text-white hover:scale-110 transition-all"
                title={`@${profile.socialLinks.twitter}`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            )}
            {profile.socialLinks.snapchat && (
              <a
                href={`https://snapchat.com/add/${profile.socialLinks.snapchat}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/70 hover:text-white hover:scale-110 transition-all"
                title={`@${profile.socialLinks.snapchat}`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-.809-.329-1.224-.72-1.227-1.153-.015-.36.27-.69.72-.854.149-.06.314-.09.494-.09.12 0 .284.015.435.09.375.18.72.3 1.034.3.21 0 .314-.044.389-.074-.007-.18-.022-.345-.029-.525l-.006-.061c-.105-1.627-.225-3.654.3-4.848C7.849 1.069 11.205.793 12.191.793h.03z"/>
                </svg>
              </a>
            )}
            {profile.socialLinks.youtube && (
              <a
                href={`https://youtube.com/@${profile.socialLinks.youtube}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/70 hover:text-white hover:scale-110 transition-all"
                title={`@${profile.socialLinks.youtube}`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
            )}
          </div>
        )}

        {/* Primary CTA: Gift */}
        {user.role === 'creator' && currentUserId !== user.id && (
          <button
            onClick={onTipClick}
            className="mt-5 w-full py-3 rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 hover:scale-[1.02] transition-all active:scale-[0.98]"
          >
            <Gift className="w-4 h-4" />
            Send a Gift
          </button>
        )}

        {/* Secondary Actions: calls, chat, AI twin */}
        <div className="mt-3 flex flex-wrap gap-2">
          {user.role === 'creator' && profile.callSettings?.isAvailableForCalls && currentUserId !== user.id && (
            <RequestCallButton
              creatorId={user.id}
              creatorName={user.displayName || user.username}
              ratePerMinute={profile.callSettings.callRatePerMinute}
              minimumDuration={profile.callSettings.minimumCallDuration}
              isAvailable={true}
              iconOnly={false}
              callType="video"
            />
          )}

          {user.role === 'creator' && profile.callSettings?.isAvailableForVoiceCalls && currentUserId !== user.id && (
            <RequestCallButton
              creatorId={user.id}
              creatorName={user.displayName || user.username}
              ratePerMinute={profile.callSettings.voiceCallRatePerMinute}
              minimumDuration={profile.callSettings.minimumVoiceCallDuration}
              isAvailable={true}
              iconOnly={false}
              callType="voice"
            />
          )}

          <button
            onClick={onMessageClick}
            className="group px-4 py-2 rounded-full bg-white/10 border border-white/20 hover:border-digis-cyan/50 transition-all hover:scale-105 flex items-center gap-2 text-white text-sm font-semibold"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Chat</span>
          </button>

          {user.role === 'creator' && aiTwinEnabled && currentUserId !== user.id && (
            <button
              onClick={onAiTwinClick}
              className="group px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/50 hover:border-cyan-400 transition-all hover:scale-105 flex items-center gap-2 text-white text-sm font-semibold"
            >
              <Bot className="w-4 h-4 text-cyan-400" />
              <span>AI Twin</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
