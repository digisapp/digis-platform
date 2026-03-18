'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Code, Copy, Check, ExternalLink, Globe } from 'lucide-react';

export default function EmbedGeneratorPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedWidget, setCopiedWidget] = useState(false);
  const [copiedButton, setCopiedButton] = useState(false);
  const [copiedBadge, setCopiedBadge] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<'card' | 'button' | 'badge'>('card');

  useEffect(() => {
    fetch('/api/dashboard/summary')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (data.data?.profile?.username) {
          setUsername(data.data.profile.username);
        } else {
          router.push('/login');
        }
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading || !username) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://digis.cc';

  const widgetCode = `<iframe src="${baseUrl}/embed/${username}" width="360" height="200" frameborder="0" style="border:none;border-radius:16px;overflow:hidden;" allow="web-share"></iframe>`;

  const buttonCode = `<a href="${baseUrl}/${username}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;padding:10px 20px;background:linear-gradient(135deg,#06b6d4,#a855f7);color:white;font-weight:600;font-size:14px;border-radius:12px;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,sans-serif;transition:opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
  View me on Digis
</a>`;

  const badgeCode = `<a href="${baseUrl}/${username}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:#0f172a;border:1px solid rgba(34,211,238,0.3);color:#22d3ee;font-weight:600;font-size:12px;border-radius:20px;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
  @${username} on Digis
</a>`;

  const copy = (text: string, setter: (_v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20">
      <MobileHeader />
      <div className="md:hidden" style={{ height: 'calc(48px + env(safe-area-inset-top, 0px))' }} />

      <div className="container mx-auto px-4 pt-2 md:pt-10 pb-24 md:pb-10 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Code className="w-6 h-6 text-cyan-400" />
          <h1 className="text-2xl font-bold text-white">Embed & Share</h1>
        </div>

        <p className="text-gray-400 text-sm mb-6">
          Add your Digis profile to your website, blog, or link-in-bio. Copy the code below and paste it into your site.
        </p>

        {/* Style Selector */}
        <div className="flex gap-2 mb-6">
          {(['card', 'button', 'badge'] as const).map(style => (
            <button
              key={style}
              onClick={() => setSelectedStyle(style)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${
                selectedStyle === style
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'bg-white/5 text-gray-400 border border-white/10 hover:border-white/20'
              }`}
            >
              {style === 'card' ? 'Profile Card' : style === 'button' ? 'CTA Button' : 'Badge'}
            </button>
          ))}
        </div>

        {/* Preview */}
        <div className="mb-6 p-6 rounded-2xl bg-white/5 border border-white/10">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Preview</h3>
          <div className="flex justify-center p-4 bg-white/5 rounded-xl">
            {selectedStyle === 'card' && (
              <iframe
                src={`/embed/${username}`}
                width="360"
                height="200"
                style={{ border: 'none', borderRadius: 16, overflow: 'hidden' }}
              />
            )}
            {selectedStyle === 'button' && (
              <a
                href={`/${username}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold text-sm rounded-xl hover:opacity-90 transition-opacity"
              >
                <Globe className="w-4 h-4" />
                View me on Digis
              </a>
            )}
            {selectedStyle === 'badge' && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0f172a] border border-cyan-500/30 text-cyan-400 font-semibold text-xs rounded-full">
                @{username} on Digis
              </span>
            )}
          </div>
        </div>

        {/* Code */}
        <div className="mb-6 rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="text-sm font-medium text-gray-400">HTML Code</span>
            <button
              onClick={() => copy(
                selectedStyle === 'card' ? widgetCode : selectedStyle === 'button' ? buttonCode : badgeCode,
                selectedStyle === 'card' ? setCopiedWidget : selectedStyle === 'button' ? setCopiedButton : setCopiedBadge,
              )}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-300 transition-colors"
            >
              {(selectedStyle === 'card' ? copiedWidget : selectedStyle === 'button' ? copiedButton : copiedBadge) ? (
                <><Check className="w-3.5 h-3.5 text-green-400" /> Copied!</>
              ) : (
                <><Copy className="w-3.5 h-3.5" /> Copy</>
              )}
            </button>
          </div>
          <pre className="p-4 text-xs text-cyan-300 overflow-x-auto whitespace-pre-wrap">
            {selectedStyle === 'card' ? widgetCode : selectedStyle === 'button' ? buttonCode : badgeCode}
          </pre>
        </div>

        {/* Direct Link */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Direct Profile Link</h3>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-black/30 rounded-lg text-sm text-cyan-400 truncate">
              {baseUrl}/{username}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${baseUrl}/${username}`);
              }}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>
            <a
              href={`/${username}`}
              target="_blank"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
