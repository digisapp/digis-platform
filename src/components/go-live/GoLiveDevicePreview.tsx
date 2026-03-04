'use client';

import { useState } from 'react';
import { VideoPreviewSkeleton } from '@/components/ui/SkeletonLoader';
import { HelpCircle, Camera, RefreshCw } from 'lucide-react';

interface GoLiveDevicePreviewProps {
  orientation: 'landscape' | 'portrait';
  setOrientation: (v: 'landscape' | 'portrait') => void;
  devicesLoading: boolean;
  previewError: string;
  videoPlaying: boolean;
  setVideoPlaying: (v: boolean) => void;
  mediaStream: MediaStream | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoDevices: MediaDeviceInfo[];
  audioDevices: MediaDeviceInfo[];
  selectedVideoDevice: string;
  setSelectedVideoDevice: (v: string) => void;
  selectedAudioDevice: string;
  setSelectedAudioDevice: (v: string) => void;
  audioLevel: number;
  hasAiTwin: boolean;
  aiChatModEnabled: boolean;
  setAiChatModEnabled: (v: boolean) => void;
  onInitializeDevices: () => void;
  onTapToPlay: () => void;
  onShowStreamingTips: () => void;
}

export function GoLiveDevicePreview({
  orientation, setOrientation,
  devicesLoading, previewError, videoPlaying, setVideoPlaying,
  mediaStream, videoRef, videoDevices, audioDevices,
  selectedVideoDevice, setSelectedVideoDevice,
  selectedAudioDevice, setSelectedAudioDevice,
  audioLevel, hasAiTwin, aiChatModEnabled, setAiChatModEnabled,
  onInitializeDevices, onTapToPlay, onShowStreamingTips,
}: GoLiveDevicePreviewProps) {
  return (
    <div className="backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-2xl border-2 border-purple-500/30 p-6 md:p-8 space-y-4 hover:border-purple-500/50 transition-all duration-300 shadow-[0_0_30px_rgba(168,85,247,0.15)]">
      {/* Video Preview */}
      {devicesLoading ? (
        <VideoPreviewSkeleton />
      ) : previewError ? (
        <PermissionErrorState
          previewError={previewError}
          onInitializeDevices={onInitializeDevices}
        />
      ) : (
        <div className={`relative bg-black rounded-xl overflow-hidden border-2 border-purple-500/30 group mx-auto ${
          orientation === 'portrait'
            ? 'aspect-[9/16] max-w-[280px]'
            : 'aspect-video w-full'
        }`}>
          <video
            ref={videoRef as React.RefObject<HTMLVideoElement>}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full -scale-x-100"
            style={{ objectFit: 'cover' }}
            onPlaying={() => setVideoPlaying(true)}
          />
          {/* Tap to play overlay for iOS */}
          {!videoPlaying && mediaStream && (
            <button
              type="button"
              onClick={onTapToPlay}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 text-white"
            >
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-4 animate-pulse">
                <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <p className="text-lg font-semibold">Tap to Start Preview</p>
              <p className="text-sm text-gray-400 mt-1">Camera is ready</p>
            </button>
          )}
          {/* Live indicator */}
          {videoPlaying && (
            <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 animate-pulse">
              <div className="w-2 h-2 bg-white rounded-full" />
              PREVIEW
            </div>
          )}
        </div>
      )}

      {/* Orientation Picker — directly below preview */}
      <div>
        <label className="block text-sm font-semibold text-white mb-2">
          Stream Orientation
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setOrientation('portrait')}
            className={`p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
              orientation === 'portrait'
                ? 'border-cyan-500 bg-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.3)]'
                : 'border-white/20 bg-white/5 hover:border-white/40'
            }`}
          >
            <span className="text-2xl">📱</span>
            <div className="text-left">
              <div className="font-semibold text-white text-sm">Portrait</div>
              <div className="text-xs text-gray-400">9:16 vertical</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setOrientation('landscape')}
            className={`p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
              orientation === 'landscape'
                ? 'border-cyan-500 bg-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.3)]'
                : 'border-white/20 bg-white/5 hover:border-white/40'
            }`}
          >
            <span className="text-2xl rotate-90 inline-block">📱</span>
            <div className="text-left">
              <div className="font-semibold text-white text-sm">Landscape</div>
              <div className="text-xs text-gray-400">16:9 horizontal</div>
            </div>
          </button>
        </div>
      </div>

      {/* Device Selectors */}
      <div className="space-y-4">
        {/* Camera */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-white">
              📹 Camera
            </label>
            <button
              type="button"
              onClick={onShowStreamingTips}
              className="p-1 text-gray-400 hover:text-cyan-400 transition-colors"
              title="Streaming tips"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
          <select
            value={selectedVideoDevice}
            onChange={(e) => setSelectedVideoDevice(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300"
            disabled={videoDevices.length === 0}
          >
            {videoDevices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
              </option>
            ))}
          </select>
        </div>

        {/* Microphone */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2">
            🎤 Microphone
          </label>
          <select
            value={selectedAudioDevice}
            onChange={(e) => setSelectedAudioDevice(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300"
            disabled={audioDevices.length === 0}
          >
            {audioDevices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Microphone ${device.deviceId.slice(0, 5)}`}
              </option>
            ))}
          </select>
        </div>

        {/* Audio Level */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2">
            Audio Level
          </label>
          <div className="relative w-full h-4 bg-white/5 rounded-full overflow-hidden border-2 border-white/10">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-400 via-digis-cyan to-digis-pink transition-all duration-100 rounded-full"
              style={{ width: `${Math.min(audioLevel, 100)}%` }}
            />
            <div className="absolute inset-0 flex items-center px-1">
              <div className="flex-1 h-px bg-white/30" />
              <div className="w-px h-full bg-yellow-400/50" style={{ position: 'absolute', left: '70%' }} />
              <div className="w-px h-full bg-red-400/50" style={{ position: 'absolute', left: '90%' }} />
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-300 font-semibold">
              {audioLevel > 5 ? '🟢 Microphone active' : '🔴 Speak to test mic'}
            </p>
            <p className="text-xs text-gray-400">
              {Math.round(audioLevel)}%
            </p>
          </div>
        </div>

        {/* AI Chat Moderator */}
        {hasAiTwin && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-white">
                🤖 AI Chat Moderator
              </label>
              <div className="group relative">
                <HelpCircle className="w-4 h-4 text-gray-400 hover:text-cyan-400 cursor-help" />
                <div className="absolute right-0 bottom-full mb-2 w-48 p-2 bg-black/90 border border-white/10 rounded-lg text-xs text-gray-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  Your AI Twin greets viewers, answers questions, and thanks gifters automatically.
                </div>
              </div>
            </div>
            <div className="p-3 rounded-xl border-2 border-cyan-500/30 bg-cyan-500/5 flex items-center justify-between">
              <span className="text-sm text-white">Enable during stream</span>
              <button
                type="button"
                onClick={() => setAiChatModEnabled(!aiChatModEnabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  aiChatModEnabled ? 'bg-cyan-500' : 'bg-gray-600'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  aiChatModEnabled ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PermissionErrorState({
  previewError,
  onInitializeDevices,
}: {
  previewError: string;
  onInitializeDevices: () => void;
}) {
  const [retrying, setRetrying] = useState(false);
  const isDenied = previewError === 'denied';

  const isSafari = typeof navigator !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isChrome = typeof navigator !== 'undefined' && /chrome/i.test(navigator.userAgent) && !/edg/i.test(navigator.userAgent);
  const isFirefox = typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent);

  const handleRetry = async () => {
    setRetrying(true);
    onInitializeDevices();
    // Give the async init time before clearing retry state
    setTimeout(() => setRetrying(false), 2000);
  };

  if (isDenied) {
    return (
      <div className="relative aspect-video bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-xl overflow-hidden border-2 border-purple-500/30">
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
              <Camera className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Camera Access Needed</h3>
            <p className="text-gray-400 text-sm mb-4">
              Camera permission was denied. To enable it:
            </p>
            <div className="text-left space-y-2 mb-5 text-sm">
              {isChrome && (
                <>
                  <p className="text-gray-300">1. Click the <span className="text-white font-medium">lock icon</span> in the address bar</p>
                  <p className="text-gray-300">2. Set Camera and Microphone to <span className="text-white font-medium">Allow</span></p>
                  <p className="text-gray-300">3. Click the button below to retry</p>
                </>
              )}
              {isSafari && (
                <>
                  <p className="text-gray-300">1. Go to <span className="text-white font-medium">Safari → Settings → Websites</span></p>
                  <p className="text-gray-300">2. Find <span className="text-white font-medium">Camera</span> and <span className="text-white font-medium">Microphone</span></p>
                  <p className="text-gray-300">3. Set this site to <span className="text-white font-medium">Allow</span>, then reload</p>
                </>
              )}
              {isFirefox && (
                <>
                  <p className="text-gray-300">1. Click the <span className="text-white font-medium">lock icon</span> in the address bar</p>
                  <p className="text-gray-300">2. Clear the camera and microphone <span className="text-white font-medium">permissions</span></p>
                  <p className="text-gray-300">3. Click the button below to retry</p>
                </>
              )}
              {!isChrome && !isSafari && !isFirefox && (
                <>
                  <p className="text-gray-300">1. Open your browser&apos;s <span className="text-white font-medium">site settings</span></p>
                  <p className="text-gray-300">2. Allow Camera and Microphone for this site</p>
                  <p className="text-gray-300">3. Click the button below to retry</p>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={handleRetry}
              disabled={retrying}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 flex items-center gap-2 mx-auto"
            >
              <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
              {retrying ? 'Requesting Access...' : 'Try Again'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Generic error (not found, in use, etc.)
  return (
    <div className="relative aspect-video bg-gradient-to-br from-red-500/10 to-pink-500/10 rounded-xl overflow-hidden border-2 border-red-500/30">
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-2">📷</div>
          <p className="text-red-400 text-sm font-semibold">{previewError}</p>
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            className="mt-4 px-4 py-2 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
          >
            <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}
