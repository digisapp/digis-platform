'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ParticleEffect, SuccessAnimation } from '@/components/ui/ParticleEffect';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { useGoLiveData } from '@/hooks/useGoLiveData';
import { useGoLiveDevices } from '@/hooks/useGoLiveDevices';
import {
  GoLiveStreamForm,
  GoLiveDevicePreview,
  GoLiveActiveStream,
  StreamingTipsModal,
} from '@/components/go-live';
import { OBSStreamSetup } from '@/components/go-live/OBSStreamSetup';
import { Video, Monitor, Camera } from 'lucide-react';

export default function GoLivePage() {
  const router = useRouter();
  const data = useGoLiveData();
  const devices = useGoLiveDevices();

  useEffect(() => {
    data.checkCreatorStatus();
    devices.initializeDevices();
  }, []);

  if (data.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!data.isCreator) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-2xl border-2 border-purple-500/30 p-8 text-center shadow-[0_0_30px_rgba(168,85,247,0.2)]">
          <div className="text-6xl mb-4">🎥</div>
          <h1 className="text-2xl font-bold text-white mb-4">Creator Access Required</h1>
          <p className="text-gray-300 mb-6">
            You need to be a verified creator to start live streaming.
          </p>
          <GlassButton
            variant="gradient"
            size="lg"
            onClick={() => router.push('/creator/apply')}
            className="w-full"
            shimmer
            glow
          >
            Apply to Be a Creator
          </GlassButton>
        </div>
      </div>
    );
  }

  if (data.activeStream) {
    return (
      <GoLiveActiveStream
        activeStream={data.activeStream}
        isMobile={data.isMobile}
        onStreamEnded={() => data.setActiveStream(null)}
      />
    );
  }

  // Show OBS setup screen after RTMP stream creation
  if (data.rtmpInfo) {
    return (
      <OBSStreamSetup
        url={data.rtmpInfo.url}
        streamKey={data.rtmpInfo.streamKey}
        streamId={data.rtmpInfo.streamId}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20">
      <ParticleEffect trigger={data.showParticles} />
      <SuccessAnimation show={data.showSuccess} />

      <MobileHeader />

      <div className="container mx-auto px-4 pt-20 md:pt-10 pb-32 md:pb-10">
        {/* Streaming Tips Banner */}
        <button
          type="button"
          onClick={() => data.setShowStreamingTipsModal(true)}
          className="w-full mb-6 p-4 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 hover:from-cyan-500/30 hover:via-purple-500/30 hover:to-pink-500/30 border-2 border-cyan-500/40 hover:border-cyan-500/60 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(34,211,238,0.15)] hover:shadow-[0_0_30px_rgba(34,211,238,0.25)] group"
        >
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Video className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <div className="font-bold text-white text-lg">New to Streaming?</div>
              <div className="text-sm text-gray-300">Tap here for pro tips on video quality</div>
            </div>
            <div className="text-cyan-400 text-2xl animate-pulse">→</div>
          </div>
        </button>

        {/* Stats */}
        {data.recentStats.totalStreams > 0 && (
          <div className="flex flex-wrap items-center gap-3 md:gap-6 text-sm mb-8">
            <div className="backdrop-blur-xl bg-white/5 rounded-lg px-4 py-2 border border-cyan-500/30">
              <span className="text-gray-300">Avg Viewers:</span>
              <span className="ml-2 font-bold text-cyan-400">{data.recentStats.avgViewers}</span>
            </div>
            <div className="backdrop-blur-xl bg-white/5 rounded-lg px-4 py-2 border border-purple-500/30">
              <span className="text-gray-300">Total Streams:</span>
              <span className="ml-2 font-bold text-purple-400">{data.recentStats.totalStreams}</span>
            </div>
          </div>
        )}

        {/* Stream Method Toggle */}
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => data.setStreamMethod('browser')}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all duration-300 ${
              data.streamMethod === 'browser'
                ? 'border-purple-500 bg-purple-500/20 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
            }`}
          >
            <Camera className="w-5 h-5" />
            <span className="font-semibold">Browser Camera</span>
          </button>
          <button
            type="button"
            onClick={() => data.setStreamMethod('rtmp')}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all duration-300 ${
              data.streamMethod === 'rtmp'
                ? 'border-purple-500 bg-purple-500/20 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
            }`}
          >
            <Monitor className="w-5 h-5" />
            <span className="font-semibold">OBS / Encoder</span>
          </button>
        </div>

        {/* 2-Column Layout */}
        <form
          onSubmit={(e) => data.handleStartStream(e, {
            mediaStream: devices.mediaStream,
            selectedVideoDevice: devices.selectedVideoDevice,
            selectedAudioDevice: devices.selectedAudioDevice,
            stopAllTracks: devices.stopAllTracks,
          })}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
            {/* Left Column: Form */}
            <GoLiveStreamForm
              title={data.title}
              setTitle={data.setTitle}
              category={data.category}
              setCategory={data.setCategory}
              showCategoryDropdown={data.showCategoryDropdown}
              setShowCategoryDropdown={data.setShowCategoryDropdown}
              tags={data.tags}
              setTags={data.setTags}
              tagInput={data.tagInput}
              setTagInput={data.setTagInput}
              privacy={data.privacy}
              setPrivacy={data.setPrivacy}
              orientation={data.orientation}
              setOrientation={data.setOrientation}
              goPrivateEnabled={data.goPrivateEnabled}
              setGoPrivateEnabled={data.setGoPrivateEnabled}
              goPrivateRate={data.goPrivateRate}
              setGoPrivateRate={data.setGoPrivateRate}
              goPrivateMinDuration={data.goPrivateMinDuration}
              setGoPrivateMinDuration={data.setGoPrivateMinDuration}
              defaultCallSettings={data.defaultCallSettings}
            />

            {/* Right Column: Device Preview or RTMP Info */}
            {data.streamMethod === 'browser' ? (
              <GoLiveDevicePreview
                orientation={data.orientation}
                devicesLoading={devices.devicesLoading}
                previewError={devices.previewError}
                videoPlaying={devices.videoPlaying}
                setVideoPlaying={devices.setVideoPlaying}
                mediaStream={devices.mediaStream}
                videoRef={devices.videoRef}
                videoDevices={devices.videoDevices}
                audioDevices={devices.audioDevices}
                selectedVideoDevice={devices.selectedVideoDevice}
                setSelectedVideoDevice={devices.setSelectedVideoDevice}
                selectedAudioDevice={devices.selectedAudioDevice}
                setSelectedAudioDevice={devices.setSelectedAudioDevice}
                audioLevel={devices.audioLevel}
                hasAiTwin={data.hasAiTwin}
                aiChatModEnabled={data.aiChatModEnabled}
                setAiChatModEnabled={data.setAiChatModEnabled}
                featuredCreators={data.featuredCreators}
                setFeaturedCreators={data.setFeaturedCreators}
                featuredCreatorCommission={data.featuredCreatorCommission}
                setFeaturedCreatorCommission={data.setFeaturedCreatorCommission}
                onInitializeDevices={devices.initializeDevices}
                onTapToPlay={devices.handleTapToPlay}
                onShowStreamingTips={() => data.setShowStreamingTipsModal(true)}
              />
            ) : (
              <div className="backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-2xl border-2 border-purple-500/30 p-6 md:p-8 space-y-6 hover:border-purple-500/50 transition-all duration-300 shadow-[0_0_30px_rgba(168,85,247,0.15)]">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center border border-purple-500/40">
                    <Monitor className="w-8 h-8 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">OBS / Encoder Mode</h3>
                  <p className="text-gray-400 text-sm max-w-sm mx-auto">
                    Stream from OBS Studio, Streamlabs, or any RTMP-compatible encoder.
                    After clicking Start Stream, you&apos;ll receive an RTMP URL and stream key.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-lg mt-0.5">1.</span>
                    <p className="text-sm text-gray-300">Click <span className="text-white font-semibold">Start Stream</span> below to get your RTMP credentials</p>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-lg mt-0.5">2.</span>
                    <p className="text-sm text-gray-300">Copy the <span className="text-white font-semibold">Server URL</span> and <span className="text-white font-semibold">Stream Key</span> into OBS</p>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-lg mt-0.5">3.</span>
                    <p className="text-sm text-gray-300">Click <span className="text-white font-semibold">Start Streaming</span> in OBS — viewers will see your feed</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {data.error && (
            <div className="bg-red-500/20 border-2 border-red-500 rounded-xl p-4 max-w-7xl mx-auto animate-shake">
              <p className="text-red-600 text-sm text-center font-semibold">{data.error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="max-w-7xl mx-auto">
            <GlassButton
              type="submit"
              variant="gradient"
              size="lg"
              disabled={!data.title.trim() || (data.streamMethod === 'browser' && !devices.mediaStream) || data.isCreating}
              className="w-full relative overflow-hidden group"
              shimmer
              glow
            >
              {data.isCreating ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2 text-white font-bold">Starting Stream...</span>
                </>
              ) : (
                <>
                  <span className="font-bold text-white">Start Stream</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </>
              )}
            </GlassButton>
          </div>
        </form>
      </div>

      {data.showStreamingTipsModal && (
        <StreamingTipsModal onClose={() => data.setShowStreamingTipsModal(false)} />
      )}

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}
