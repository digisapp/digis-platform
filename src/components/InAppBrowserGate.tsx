'use client';

import { useState, useEffect, ReactNode } from 'react';
import Image from 'next/image';

type InAppSource = 'Instagram' | 'Facebook' | 'TikTok' | 'Snapchat' | 'Twitter' | 'LinkedIn' | null;

function detectInAppBrowser(ua: string): InAppSource {
  if (/Instagram/i.test(ua)) return 'Instagram';
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return 'Facebook';
  if (/musical_ly|TikTok|BytedanceWebview/i.test(ua)) return 'TikTok';
  if (/Snapchat/i.test(ua)) return 'Snapchat';
  if (/Twitter/i.test(ua)) return 'Twitter';
  if (/LinkedInApp/i.test(ua)) return 'LinkedIn';
  return null;
}

function isIOS(): boolean {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function openInExternalBrowser(url: string) {
  const ios = isIOS();

  if (ios) {
    // iOS: Use x-safari-https scheme or window.open trick
    // The most reliable method for Instagram on iOS
    const safariUrl = url.replace(/^https:\/\//, 'x-safari-https://').replace(/^http:\/\//, 'x-safari-http://');
    window.location.href = safariUrl;

    // Fallback: try window.open after a short delay
    setTimeout(() => {
      window.open(url, '_blank');
    }, 500);
  } else {
    // Android: Use intent URL for Chrome
    const intentUrl = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
    window.location.href = intentUrl;

    // Fallback
    setTimeout(() => {
      window.open(url, '_blank');
    }, 500);
  }
}

interface InAppBrowserGateProps {
  children: ReactNode;
}

export function InAppBrowserGate({ children }: InAppBrowserGateProps) {
  const [inAppSource, setInAppSource] = useState<InAppSource>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const source = detectInAppBrowser(navigator.userAgent);
    setInAppSource(source);
    setChecked(true);
  }, []);

  // Still checking — render nothing briefly
  if (!checked) return null;

  // Normal browser — render children
  if (!inAppSource) return <>{children}</>;

  const currentUrl = window.location.href;
  const browserName = isIOS() ? 'Safari' : 'Chrome';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[400px] h-[400px] -top-32 -left-32 bg-cyan-500/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute w-[400px] h-[400px] -bottom-32 -right-32 bg-purple-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 max-w-sm w-full text-center space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <Image
            src="/images/digis-logo-white.png"
            alt="Digis"
            width={120}
            height={40}
            priority
          />
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h1 className="text-xl font-bold text-white">
            Open in {browserName}
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            {inAppSource}&apos;s browser doesn&apos;t support payments, video calls, or login.
            Open in {browserName} for the full experience.
          </p>
        </div>

        {/* Open button */}
        <button
          onClick={() => openInExternalBrowser(currentUrl)}
          className="w-full py-4 px-6 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-2xl font-semibold text-lg shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
        >
          Open in {browserName}
        </button>

        {/* Manual instructions */}
        <div className="pt-2 space-y-2">
          <p className="text-gray-500 text-xs">
            Or copy the link and paste it in your browser:
          </p>
          <CopyLinkButton url={currentUrl} />
        </div>

        {/* Continue anyway (subtle) */}
        <button
          onClick={() => setInAppSource(null)}
          className="text-gray-600 text-xs hover:text-gray-400 transition-colors underline underline-offset-2"
        >
          Continue anyway
        </button>
      </div>
    </div>
  );
}

function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="w-full py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-300 hover:bg-white/10 hover:border-white/20 transition-all duration-200 flex items-center justify-center gap-2"
    >
      {copied ? (
        <>
          <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-400">Copied!</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          <span>Copy Link</span>
        </>
      )}
    </button>
  );
}
