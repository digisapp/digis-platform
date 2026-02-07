'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui';
import { Share2, Instagram, Youtube, Link2, ExternalLink, Twitch, ShoppingBag, Plus, Pencil, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { extractInstagramHandle, extractTiktokHandle, extractTwitterHandle, extractSnapchatHandle, extractYoutubeHandle } from '@/lib/utils/social-handles';
import type { SettingsFormState } from '@/hooks/useSettingsForm';
import type { CreatorLink } from './types';

interface SocialSectionProps {
  currentUser: any;
  form: SettingsFormState;
  setField: <K extends keyof SettingsFormState>(key: K, value: SettingsFormState[K]) => void;
  creatorLinks: CreatorLink[];
  linksLoading: boolean;
  handleOpenLinkModal: (link?: CreatorLink) => void;
  handleDeleteLink: (linkId: string) => void;
  handleToggleLinkActive: (link: CreatorLink) => void;
  moveLink: (index: number, direction: 'up' | 'down') => void;
}

export function SocialSection({
  currentUser, form, setField,
  creatorLinks, linksLoading,
  handleOpenLinkModal, handleDeleteLink, handleToggleLinkActive, moveLink,
}: SocialSectionProps) {
  const router = useRouter();
  const [showAllSocials, setShowAllSocials] = useState(false);

  const { instagramHandle, tiktokHandle, youtubeHandle, twitterHandle,
    snapchatHandle, twitchHandle, amazonHandle, showSocialLinks } = form;

  if (currentUser?.role !== 'creator') {
    return (
      <div className="text-center py-8 text-gray-400">
        <Share2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Social media settings are only available for creators.</p>
        <button
          onClick={() => router.push('/creator/apply')}
          className="mt-4 px-4 py-2 bg-gradient-to-r from-digis-cyan to-digis-pink rounded-lg text-white font-medium text-sm hover:opacity-90 transition-opacity"
        >
          Become a Creator
        </button>
      </div>
    );
  }

  const primaryPlatforms = [
    { key: 'instagram', icon: Instagram, color: 'pink-500', value: instagramHandle, fieldKey: 'instagramHandle' as const, placeholder: 'username', extract: extractInstagramHandle },
    { key: 'tiktok', icon: null, svgPath: 'M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z', color: 'cyan-500', value: tiktokHandle, fieldKey: 'tiktokHandle' as const, placeholder: 'username', extract: extractTiktokHandle },
    { key: 'youtube', icon: Youtube, color: 'red-500', value: youtubeHandle, fieldKey: 'youtubeHandle' as const, placeholder: 'channel', extract: extractYoutubeHandle },
  ];

  const secondaryPlatforms = [
    { key: 'twitter', icon: null, svgPath: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z', color: 'gray-500', value: twitterHandle, fieldKey: 'twitterHandle' as const, placeholder: 'username', extract: extractTwitterHandle, label: 'X (Twitter)' },
    { key: 'snapchat', icon: null, svgPath: 'M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-.809-.329-1.224-.72-1.227-1.153-.015-.36.27-.69.72-.854.149-.06.314-.09.494-.09.12 0 .284.015.435.09.375.18.72.3 1.034.3.21 0 .314-.044.389-.074-.007-.18-.022-.345-.029-.525l-.006-.061c-.105-1.627-.225-3.654.3-4.848C7.849 1.069 11.205.793 12.191.793h.03z', color: 'yellow-400', value: snapchatHandle, fieldKey: 'snapchatHandle' as const, placeholder: 'username', extract: extractSnapchatHandle },
    { key: 'twitch', icon: Twitch, color: 'purple-500', value: twitchHandle, fieldKey: 'twitchHandle' as const, placeholder: 'username', extract: (v: string) => v.replace(/^@/, '') },
    { key: 'amazon', icon: ShoppingBag, color: 'orange-500', value: amazonHandle, fieldKey: 'amazonHandle' as const, placeholder: 'https://amazon.com/hz/wishlist/...', isUrl: true, label: 'Amazon Wishlist' },
  ];

  const renderSocialInput = (platform: typeof primaryPlatforms[0] | typeof secondaryPlatforms[0]) => {
    const Icon = platform.icon;
    const isUrl = 'isUrl' in platform && platform.isUrl;
    const isEmail = 'isEmail' in platform && platform.isEmail;

    return (
      <div key={platform.key} className="relative">
        <label className="block text-sm font-medium mb-2 text-gray-300 flex items-center gap-2">
          {Icon ? (
            <Icon className={`w-4 h-4 text-${platform.color}`} />
          ) : platform.svgPath ? (
            <svg className={`w-4 h-4 text-${platform.color}`} viewBox="0 0 24 24" fill="currentColor">
              <path d={platform.svgPath} />
            </svg>
          ) : null}
          {'label' in platform ? platform.label : platform.key.charAt(0).toUpperCase() + platform.key.slice(1)}
        </label>
        <div className="relative">
          {!isUrl && !isEmail && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">@</span>
          )}
          <input
            type={isEmail ? 'email' : isUrl ? 'url' : 'text'}
            placeholder={platform.placeholder}
            value={platform.value}
            onChange={(e) => {
              const extract = 'extract' in platform ? platform.extract : undefined;
              setField(platform.fieldKey, extract ? extract(e.target.value) : e.target.value);
            }}
            className={`w-full ${!isUrl && !isEmail ? 'pl-8' : 'pl-4'} pr-4 py-3 backdrop-blur-xl bg-white/5 border border-cyan-500/30 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-${platform.color}/50`}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Social Media Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Share2 className="w-5 h-5 text-digis-purple" />
            Social Media
          </h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm text-gray-400">Show on profile</span>
            <div className="relative">
              <input
                type="checkbox"
                checked={showSocialLinks}
                onChange={(e) => setField('showSocialLinks', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-gray-700 rounded-full peer peer-checked:bg-gradient-to-r peer-checked:from-digis-cyan peer-checked:to-digis-purple transition-all"></div>
              <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-5"></div>
            </div>
          </label>
        </div>
        <p className="text-sm text-gray-400 mb-4">Add your social media profiles. Links will appear as icons on your public profile.</p>

        {/* Primary Platforms (always visible) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {primaryPlatforms.map(renderSocialInput)}
        </div>

        {/* Show More Button */}
        <button
          type="button"
          onClick={() => setShowAllSocials(!showAllSocials)}
          className="mt-4 w-full py-2 text-sm text-gray-400 hover:text-white border border-white/10 hover:border-cyan-500/30 rounded-lg transition-all flex items-center justify-center gap-2"
        >
          {showAllSocials ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Show fewer platforms
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show more platforms
            </>
          )}
        </button>

        {/* Secondary Platforms (collapsible) */}
        {showAllSocials && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {secondaryPlatforms.map(renderSocialInput)}
          </div>
        )}
      </div>

      {/* My Links Section */}
      <div className="pt-6 border-t border-cyan-500/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Link2 className="w-5 h-5 text-cyan-400" />
            My Links
          </h3>
          {creatorLinks.length > 0 && (
            <span className="text-sm text-gray-400">{creatorLinks.length}/8 links</span>
          )}
        </div>
        <p className="text-sm text-gray-400 mb-4">
          Add affiliate deals, discount codes, wishlists, and promo links to your profile.
        </p>

        {/* Add Link Button */}
        {creatorLinks.length < 8 && (
          <button
            type="button"
            onClick={() => handleOpenLinkModal()}
            className="w-full mb-4 p-3 border-2 border-dashed border-white/20 hover:border-cyan-500/50 rounded-xl text-gray-400 hover:text-cyan-400 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Add New Link</span>
          </button>
        )}

        {/* Links List */}
        {linksLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="sm" />
          </div>
        ) : creatorLinks.length === 0 ? (
          <div className="text-center py-6 bg-white/5 rounded-xl border border-white/10">
            <Link2 className="w-8 h-8 text-gray-500 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No links yet</p>
            <p className="text-gray-500 text-xs mt-1">Add your first link above</p>
          </div>
        ) : (
          <div className="space-y-2">
            {creatorLinks.map((link, index) => (
              <div
                key={link.id}
                className={`group p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all ${
                  !link.isActive ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Order Number */}
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs font-bold text-cyan-400">
                    {index + 1}
                  </div>

                  {/* Up/Down Arrows */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveLink(index, 'up')}
                      disabled={index === 0}
                      className="p-0.5 text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLink(index, 'down')}
                      disabled={index === creatorLinks.length - 1}
                      className="p-0.5 text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Emoji */}
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-lg flex-shrink-0">
                    {link.emoji || '🔗'}
                  </div>

                  {/* Title & URL */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white text-sm truncate">{link.title}</h4>
                    <p className="text-xs text-gray-400 truncate">{link.url}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    {/* Active Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleLinkActive(link)}
                      className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
                        link.isActive ? 'bg-green-500' : 'bg-gray-600'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform mx-0.5 ${
                        link.isActive ? 'translate-x-4' : ''
                      }`} />
                    </button>

                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => handleOpenLinkModal(link)}
                      className="p-1.5 text-gray-400 hover:text-cyan-400 hover:bg-white/10 rounded-lg transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleDeleteLink(link.id)}
                      className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-white/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Preview Link */}
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
