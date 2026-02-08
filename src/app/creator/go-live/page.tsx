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
import { Video } from 'lucide-react';

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

            {/* Right Column: Device Preview */}
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
              disabled={!data.title.trim() || !devices.mediaStream || data.isCreating}
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
