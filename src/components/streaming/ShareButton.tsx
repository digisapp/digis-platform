'use client';

import { useState } from 'react';
import { GlassButton } from '@/components/ui/GlassButton';

type ShareButtonProps = {
  streamTitle: string;
  creatorName: string;
};

export function ShareButton({ streamTitle, creatorName }: ShareButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = `Watch "${streamTitle}" by ${creatorName} live on Digis!`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert('Failed to copy link');
    }
  };

  const shareToTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
  };

  const shareToFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: streamTitle,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    }
  };

  return (
    <div className="relative">
      <GlassButton
        variant="ghost"
        size="md"
        onClick={() => setShowMenu(!showMenu)}
      >
        🔗 Share
      </GlassButton>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 top-12 bg-black/95 backdrop-blur-xl rounded-xl border-2 border-white/20 p-3 min-w-[220px] z-50 shadow-2xl">
            <h4 className="font-semibold text-white mb-3 px-2">Share Stream</h4>

            <div className="space-y-1">
              <button
                onClick={copyLink}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg flex items-center gap-3 transition-colors"
              >
                <span className="text-xl">📋</span>
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>

              <button
                onClick={shareToTwitter}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg flex items-center gap-3 transition-colors"
              >
                <span className="text-xl">🐦</span>
                <span>Share on Twitter</span>
              </button>

              <button
                onClick={shareToFacebook}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg flex items-center gap-3 transition-colors"
              >
                <span className="text-xl">📘</span>
                <span>Share on Facebook</span>
              </button>

              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <>
                  <div className="border-t border-white/10 my-2" />
                  <button
                    onClick={shareNative}
                    className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg flex items-center gap-3 transition-colors"
                  >
                    <span className="text-xl">📤</span>
                    <span>Share...</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
