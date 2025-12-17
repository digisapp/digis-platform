'use client';

import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import Image from 'next/image';
import { Download, Share2, Check, Sparkles } from 'lucide-react';

interface ShareDigisCardProps {
  username: string;
  displayName?: string;
  profileImage?: string | null;
  bio?: string | null;
}

export function ShareDigisCard({
  username,
  displayName,
  profileImage,
  bio
}: ShareDigisCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const profileUrl = `https://digis.cc/${username}`;

  const handleDownload = async () => {
    if (!cardRef.current) return;

    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 3, // High resolution
        backgroundColor: '#0a0a0f',
      });

      const link = document.createElement('a');
      link.download = `digis-${username}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Failed to download card:', error);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${displayName || username} on Digis`,
          text: `Check out ${displayName || username} on Digis!`,
          url: profileUrl,
        });
      } catch (error) {
        // User cancelled or share failed
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* The Card - This gets exported as PNG */}
      <div
        ref={cardRef}
        className="relative w-[320px] p-6 rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)',
        }}
      >
        {/* Animated border effect */}
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.3), rgba(168, 85, 247, 0.3), rgba(34, 211, 238, 0.3))',
            padding: '2px',
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'xor',
            WebkitMaskComposite: 'xor',
          }}
        />

        {/* Glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-cyan-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-24 h-24 bg-purple-500/20 blur-3xl" />

        {/* Content */}
        <div className="relative flex flex-col items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-1 text-cyan-400">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-bold tracking-wider">DIGIS</span>
            <Sparkles className="w-4 h-4" />
          </div>

          {/* Profile Picture */}
          <div className="relative">
            <div
              className="absolute inset-0 rounded-full blur-md"
              style={{
                background: 'linear-gradient(135deg, #22d3ee, #a855f7)',
                transform: 'scale(1.1)',
              }}
            />
            <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-cyan-500/50">
              {profileImage ? (
                <Image
                  src={profileImage}
                  alt={displayName || username}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {(displayName || username).charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Name & Username */}
          <div className="text-center">
            {displayName && (
              <h3 className="text-lg font-bold text-white">{displayName}</h3>
            )}
            <p className="text-cyan-400 font-medium">@{username}</p>
          </div>

          {/* QR Code */}
          <div className="p-3 bg-white rounded-xl shadow-[0_0_30px_rgba(34,211,238,0.3)]">
            <QRCodeSVG
              value={profileUrl}
              size={140}
              level="H"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#0a0a0f"
            />
          </div>

          {/* URL */}
          <p className="text-sm text-gray-400">digis.cc/{username}</p>

          {/* Tagline */}
          <p className="text-xs text-gray-500 text-center">
            Scan to connect
          </p>
        </div>
      </div>

      {/* Action Buttons - Outside the card (not in PNG) */}
      <div className="flex gap-3">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-semibold rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] disabled:opacity-50"
        >
          <Download className="w-5 h-5" />
          {downloading ? 'Saving...' : 'Save Card'}
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all duration-300 border border-white/20 hover:border-cyan-500/50"
        >
          {copied ? (
            <>
              <Check className="w-5 h-5 text-green-400" />
              Copied!
            </>
          ) : (
            <>
              <Share2 className="w-5 h-5" />
              Share Link
            </>
          )}
        </button>
      </div>
    </div>
  );
}
