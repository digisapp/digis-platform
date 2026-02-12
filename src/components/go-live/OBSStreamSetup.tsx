'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Check, Eye, EyeOff, Monitor, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { GlassButton } from '@/components/ui/GlassButton';
import { MobileHeader } from '@/components/layout/MobileHeader';

interface OBSStreamSetupProps {
  url: string;
  streamKey: string;
  streamId: string;
}

export function OBSStreamSetup({ url, streamKey, streamId }: OBSStreamSetupProps) {
  const router = useRouter();
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<string>('ENDPOINT_INACTIVE');
  const [polling, setPolling] = useState(true);

  const copyToClipboard = async (text: string, type: 'url' | 'key') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'url') {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      } else {
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
      }
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/streams/${streamId}/ingress/status`);
      const result = await res.json();
      if (res.ok && result.data) {
        setStatus(result.data.status);

        // Auto-navigate when OBS connects
        if (result.data.status === 'ENDPOINT_PUBLISHING') {
          setPolling(false);
          router.push(`/stream/live/${streamId}?method=rtmp`);
        }
      }
    } catch {
      // Silent fail, will retry
    }
  }, [streamId, router]);

  // Poll for ingress status every 3 seconds
  useEffect(() => {
    if (!polling) return;

    const interval = setInterval(checkStatus, 3000);
    // Check immediately too
    checkStatus();

    return () => clearInterval(interval);
  }, [polling, checkStatus]);

  // Send heartbeats to keep the stream alive while the creator sets up OBS
  useEffect(() => {
    const sendHeartbeat = () => {
      fetch(`/api/streams/${streamId}/heartbeat`, { method: 'POST' }).catch(() => {});
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 30000);

    return () => clearInterval(interval);
  }, [streamId]);

  const isConnected = status === 'ENDPOINT_PUBLISHING';
  const isBuffering = status === 'ENDPOINT_BUFFERING';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20">
      <MobileHeader />

      <div className="container mx-auto px-4 pt-20 md:pt-10 pb-32 md:pb-10 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center border border-purple-500/40 mb-4">
            <Monitor className="w-10 h-10 text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">OBS Stream Setup</h1>
          <p className="text-gray-400">Copy these credentials into your streaming software</p>
        </div>

        {/* RTMP Credentials */}
        <div className="space-y-4 mb-8">
          {/* Server URL */}
          <div className="backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-2xl border-2 border-white/10 p-5">
            <label className="block text-sm font-semibold text-gray-400 mb-2">Server URL</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2.5 bg-black/60 rounded-lg text-cyan-400 font-mono text-sm border border-white/10 overflow-x-auto">
                {url}
              </code>
              <button
                onClick={() => copyToClipboard(url, 'url')}
                className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 transition-colors flex-shrink-0"
              >
                {copiedUrl ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-white" />}
              </button>
            </div>
          </div>

          {/* Stream Key */}
          <div className="backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-2xl border-2 border-white/10 p-5">
            <label className="block text-sm font-semibold text-gray-400 mb-2">Stream Key</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2.5 bg-black/60 rounded-lg text-cyan-400 font-mono text-sm border border-white/10 overflow-x-auto">
                {showKey ? streamKey : '••••••••••••••••••••••••'}
              </code>
              <button
                onClick={() => setShowKey(!showKey)}
                className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 transition-colors flex-shrink-0"
              >
                {showKey ? <EyeOff className="w-5 h-5 text-white" /> : <Eye className="w-5 h-5 text-white" />}
              </button>
              <button
                onClick={() => copyToClipboard(streamKey, 'key')}
                className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 transition-colors flex-shrink-0"
              >
                {copiedKey ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-white" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Keep this secret. Do not share on stream.</p>
          </div>
        </div>

        {/* Connection Status */}
        <div className={`rounded-2xl border-2 p-5 mb-8 text-center transition-all duration-500 ${
          isConnected
            ? 'border-green-500/50 bg-green-500/10'
            : isBuffering
              ? 'border-yellow-500/50 bg-yellow-500/10'
              : 'border-white/10 bg-white/5'
        }`}>
          <div className="flex items-center justify-center gap-3">
            {isConnected ? (
              <Wifi className="w-6 h-6 text-green-400" />
            ) : isBuffering ? (
              <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
            ) : (
              <WifiOff className="w-6 h-6 text-gray-400" />
            )}
            <span className={`font-semibold text-lg ${
              isConnected ? 'text-green-400' : isBuffering ? 'text-yellow-400' : 'text-gray-400'
            }`}>
              {isConnected
                ? 'OBS Connected!'
                : isBuffering
                  ? 'Buffering...'
                  : 'Waiting for OBS signal...'}
            </span>
          </div>
          {!isConnected && !isBuffering && (
            <p className="text-gray-500 text-sm mt-2">
              Open OBS, paste the credentials above, and click &quot;Start Streaming&quot;
            </p>
          )}
        </div>

        {/* OBS Setup Instructions */}
        <div className="backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-2xl border-2 border-white/10 p-5 mb-8">
          <h3 className="text-white font-bold mb-4">Quick Setup Guide</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="bg-purple-500/20 text-purple-400 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
              <p className="text-gray-300">Open <span className="text-white font-semibold">OBS Studio</span> or <span className="text-white font-semibold">Streamlabs</span></p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-purple-500/20 text-purple-400 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
              <p className="text-gray-300">Go to <span className="text-white font-semibold">Settings → Stream</span></p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-purple-500/20 text-purple-400 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
              <p className="text-gray-300">Set Service to <span className="text-white font-semibold">Custom</span></p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-purple-500/20 text-purple-400 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">4</span>
              <p className="text-gray-300">Paste the <span className="text-white font-semibold">Server URL</span> and <span className="text-white font-semibold">Stream Key</span> from above</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-purple-500/20 text-purple-400 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">5</span>
              <p className="text-gray-300">Click <span className="text-white font-semibold">Start Streaming</span> in OBS</p>
            </div>
          </div>
        </div>

        {/* Skip to broadcaster page */}
        <div className="text-center">
          <GlassButton
            variant="gradient"
            size="lg"
            onClick={() => router.push(`/stream/live/${streamId}?method=rtmp`)}
            className="w-full"
            shimmer
            glow
          >
            Go to Broadcast Dashboard
          </GlassButton>
          <p className="text-gray-500 text-xs mt-2">
            You can also wait — this page auto-navigates when OBS connects
          </p>
        </div>
      </div>
    </div>
  );
}
