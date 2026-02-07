'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LiveKitRoom, RoomAudioRenderer, useConnectionState, useRemoteParticipants } from '@livekit/components-react';
import '@livekit/components-styles/themes/default';
import { ConnectionState, VideoPresets } from 'livekit-client';
import { PhoneOff, Loader2, Video } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { BuyCoinsModal } from '@/components/wallet/BuyCoinsModal';
import { CallErrorBoundary } from '@/components/error-boundaries';
import { FaceTimeVideoLayout } from '@/components/calls/FaceTimeVideoLayout';
import { VoiceCallUI } from '@/components/calls/VoiceCallUI';
import { ConnectionErrorModal, CallEndedModal, EndCallConfirmModal, CreatorSummaryModal } from '@/components/calls/CallModals';
import { LiveKitStyles } from '@/components/calls/LiveKitStyles';
import { useCallSession } from '@/hooks/useCallSession';

// Component to detect when remote participant disconnects
function RemoteParticipantMonitor({
  onRemoteLeft,
  hasStarted
}: {
  onRemoteLeft: () => void;
  hasStarted: boolean;
}) {
  const remoteParticipants = useRemoteParticipants();
  const connectionState = useConnectionState();
  const [hadRemoteParticipant, setHadRemoteParticipant] = useState(false);

  useEffect(() => {
    // Track if we ever had a remote participant
    if (remoteParticipants.length > 0) {
      setHadRemoteParticipant(true);
    }
  }, [remoteParticipants.length]);

  useEffect(() => {
    // If we had a remote participant and now they're gone, and call has started
    if (hadRemoteParticipant && remoteParticipants.length === 0 && hasStarted && connectionState === ConnectionState.Connected) {
      // Small delay to avoid false positives during reconnection
      const timeout = setTimeout(() => {
        if (remoteParticipants.length === 0) {
          onRemoteLeft();
        }
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [remoteParticipants.length, hadRemoteParticipant, hasStarted, connectionState, onRemoteLeft]);

  return null;
}

export default function VideoCallPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const callId = params.callId as string;

  const session = useCallSession({ callId, userId: user?.id, router });

  if (session.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-96 h-96 -top-10 -left-10 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute w-96 h-96 bottom-10 right-10 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>

        <div className="text-center relative z-10">
          <div className="relative inline-block mb-6">
            <div className="absolute -inset-4 bg-cyan-500/30 rounded-full blur-xl animate-pulse"></div>
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center shadow-[0_0_40px_rgba(34,211,238,0.5)]">
              <Video className="w-10 h-10 text-white animate-pulse" />
            </div>
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-2">Connecting...</h2>
          <p className="text-gray-400">Setting up your video call</p>
          <div className="mt-6 flex justify-center gap-1">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
          </div>
        </div>
      </div>
    );
  }

  if (session.error) {
    const isDeclined = session.error.includes('declined') || session.declineReason;
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute w-96 h-96 -top-10 -left-10 ${isDeclined ? 'bg-orange-500/10' : 'bg-red-500/10'} rounded-full blur-3xl`}></div>
        </div>

        <div className="text-center max-w-md mx-auto px-4 relative z-10">
          <div className={`backdrop-blur-2xl bg-gradient-to-br ${isDeclined ? 'from-orange-500/10 via-gray-900/60 to-black/40 border-orange-500/30 shadow-[0_0_50px_rgba(249,115,22,0.2)]' : 'from-red-500/10 via-gray-900/60 to-black/40 border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.2)]'} rounded-3xl p-8 border-2`}>
            <div className={`w-16 h-16 mx-auto mb-6 ${isDeclined ? 'bg-orange-500/20' : 'bg-red-500/20'} rounded-2xl flex items-center justify-center`}>
              <PhoneOff className={`w-8 h-8 ${isDeclined ? 'text-orange-400' : 'text-red-400'}`} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              {isDeclined ? 'Creator Unavailable' : 'Call Error'}
            </h2>
            {session.declineReason ? (
              <div className="mb-6">
                <p className="text-gray-400 mb-3">The creator left a message:</p>
                <div className="px-4 py-3 bg-white/5 rounded-xl border border-orange-500/20">
                  <p className="text-orange-300 italic">&quot;{session.declineReason}&quot;</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 mb-6">
                {isDeclined ? 'The creator is not available right now. Try again later!' : session.error}
              </p>
            )}
            <p className="text-gray-500 text-sm mb-4">Redirecting to dashboard...</p>
            <button
              onClick={() => router.push(session.isFan ? '/dashboard' : '/creator/dashboard')}
              className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-semibold hover:scale-105 transition-all shadow-lg"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session.callToken || !session.callData) {
    return null;
  }

  const isVoiceCall = session.callData.callType === 'voice';

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900 overflow-hidden" style={{ height: '100dvh', minHeight: '-webkit-fill-available' }}>
      {/* Static background effects - no animations to prevent glitching */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[600px] h-[600px] -top-20 -left-20 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute w-[500px] h-[500px] top-1/2 right-0 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute w-[400px] h-[400px] bottom-0 left-1/3 bg-pink-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Other Party Connection Error Modal */}
      {session.otherPartyError && (
        <ConnectionErrorModal
          otherPartyError={session.otherPartyError}
          onKeepWaiting={() => session.setOtherPartyError(null)}
          onEndCall={() => {
            fetch(`/api/calls/${callId}/end`, { method: 'POST' }).catch(() => {});
            router.push(session.isFan ? '/dashboard' : '/creator/dashboard');
          }}
        />
      )}

      {/* Call Ended by Other Party Modal - only show for fan, not when creator summary is showing */}
      {session.callEndedByOther && !session.showCreatorSummary && (
        <CallEndedModal
          hasStarted={session.hasStarted}
          duration={session.duration}
          estimatedCost={session.estimatedCost}
          formatDuration={session.formatDuration}
        />
      )}

      {/* End Call Confirmation Modal */}
      {session.showEndConfirm && (
        <EndCallConfirmModal
          hasStarted={session.hasStarted}
          duration={session.duration}
          estimatedCost={session.estimatedCost}
          isEnding={session.isEnding}
          formatDuration={session.formatDuration}
          onCancel={() => session.setShowEndConfirm(false)}
          onConfirm={session.confirmEndCall}
        />
      )}

      {/* Creator Call Summary Modal */}
      {session.showCreatorSummary && (
        <CreatorSummaryModal
          callData={session.callData}
          finalCallDuration={session.finalCallDuration}
          finalCallEarnings={session.finalCallEarnings}
          finalTipEarnings={session.finalTipEarnings}
          formatDuration={session.formatDuration}
          onBackToDashboard={() => router.push('/creator/dashboard')}
        />
      )}

      <CallErrorBoundary callId={callId} participantName={session.callData?.creator.displayName || session.callData?.creator.username} onEndCall={() => router.push('/dashboard')}>
      <LiveKitRoom
        token={session.callToken.token}
        serverUrl={session.callToken.wsUrl}
        connect={true}
        onConnected={session.handleConnected}
        audio={true}
        video={false}
        className="h-full"
        options={{
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: {
            resolution: VideoPresets.h1440,
            facingMode: 'user',
          },
          publishDefaults: {
            videoSimulcastLayers: [
              VideoPresets.h1440,
              VideoPresets.h1080,
              VideoPresets.h720,
            ],
            videoEncoding: {
              maxBitrate: 10_000_000,
              maxFramerate: 30,
              priority: 'high',
            },
            dtx: true,
            red: true,
          },
        }}
      >
        {/* Monitor for remote participant disconnection */}
        <RemoteParticipantMonitor onRemoteLeft={session.handleRemoteLeft} hasStarted={session.hasStarted} />

        {isVoiceCall ? (
          // Voice Call UI
          <>
            <VoiceCallUI
              callData={session.callData}
              duration={session.duration}
              estimatedCost={session.estimatedCost}
              isEnding={session.isEnding}
              onEndCall={session.handleEndCall}
              isFan={session.isFan}
              userBalance={session.userBalance}
              onSendTip={session.handleSendTip}
              onSendGift={session.handleSendGift}
              gifts={session.gifts}
              tipSending={session.tipSending}
              onBuyCoins={() => session.setShowBuyCoinsModal(true)}
            />
            <RoomAudioRenderer />
          </>
        ) : (
          // Video Call UI - FaceTime Style
          <>
            <FaceTimeVideoLayout
              callData={session.callData}
              onEndCall={session.handleEndCall}
              isEnding={session.isEnding}
              duration={session.duration}
              estimatedCost={session.estimatedCost}
              hasStarted={session.hasStarted}
              userBalance={session.userBalance}
              isFan={session.isFan}
              onSendTip={session.handleSendTip}
              onSendGift={session.handleSendGift}
              gifts={session.gifts}
              tipSending={session.tipSending}
              chatMessages={session.chatMessages}
              onSendMessage={session.handleSendMessage}
              messageInput={session.messageInput}
              setMessageInput={session.setMessageInput}
              onBuyCoins={() => session.setShowBuyCoinsModal(true)}
              totalTipsReceived={session.totalTipsReceived}
              onQuickTip={session.handleQuickTip}
            />
            <RoomAudioRenderer />
          </>
        )}
      </LiveKitRoom>
      </CallErrorBoundary>

      {/* Custom LiveKit Styles */}
      <LiveKitStyles />

      {/* Buy Coins Modal */}
      <BuyCoinsModal
        isOpen={session.showBuyCoinsModal}
        onClose={() => session.setShowBuyCoinsModal(false)}
        onSuccess={async () => {
          // Refresh balance after purchase
          try {
            const res = await fetch('/api/wallet/balance');
            if (res.ok) {
              const data = await res.json();
              session.setUserBalance(data.balance || 0);
            }
          } catch (err) {
            console.error('Error refreshing balance:', err);
          }
          session.setShowBuyCoinsModal(false);
        }}
      />
    </div>
  );
}
