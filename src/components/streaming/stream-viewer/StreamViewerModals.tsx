'use client';

import { useRouter } from 'next/navigation';
import { GiftSelector } from '@/components/streaming/GiftSelector';
import { GuestInvitePopup } from '@/components/streaming/GuestInvitePopup';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { X, Coins, Video, Phone, Heart, Eye } from 'lucide-react';
import type { StreamWithCreator, FeaturedCreator, CreatorCallSettings, ActiveGuest, GuestInviteData } from './types';

interface StreamViewerModalsProps {
  stream: StreamWithCreator;
  streamId: string;
  userBalance: number;
  spotlightedCreator: FeaturedCreator | null;
  // Gift panel
  showGiftPanel: boolean;
  onCloseGiftPanel: () => void;
  onSendGift: (giftId: string, qty: number, recipientCreatorId?: string, recipientUsername?: string) => Promise<void>;
  onSendTip: (amount: number, recipientCreatorId?: string, recipientUsername?: string, message?: string) => Promise<void>;
  // Call request
  showCallRequestModal: boolean;
  onCloseCallModal: () => void;
  creatorCallSettings: CreatorCallSettings | null;
  isRequestingCall: boolean;
  callRequestError: string | null;
  onRequestCall: (callType: 'video' | 'voice') => void;
  // Guest invite
  guestInvite: GuestInviteData | null;
  currentUserId: string | null;
  onGuestAccepted: (inviteType: 'video' | 'voice') => void;
  onGuestDeclined: () => void;
  // Stream ended
  streamEnded: boolean;
  viewerCount: number;
  peakViewers: number;
}

export function StreamViewerModals({
  stream, streamId, userBalance, spotlightedCreator,
  showGiftPanel, onCloseGiftPanel, onSendGift, onSendTip,
  showCallRequestModal, onCloseCallModal, creatorCallSettings,
  isRequestingCall, callRequestError, onRequestCall,
  guestInvite, currentUserId, onGuestAccepted, onGuestDeclined,
  streamEnded, viewerCount, peakViewers,
}: StreamViewerModalsProps) {
  const router = useRouter();

  return (
    <>
      {/* Gift Panel */}
      {showGiftPanel && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50" onClick={onCloseGiftPanel} />
          <div className="fixed bottom-0 left-0 right-0 z-50 lg:bottom-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-[500px]">
            <div className="bg-black/95 backdrop-blur-xl rounded-t-3xl lg:rounded-3xl border border-white/20 p-6 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold">Send a Gift</h3>
                  <p className="text-sm text-gray-400">Support {stream.creator?.username}</p>
                </div>
                <button onClick={onCloseGiftPanel} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl mb-6">
                <span className="text-gray-400">Your Balance</span>
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-yellow-400" />
                  <span className="text-xl font-bold text-yellow-400">{userBalance.toLocaleString()}</span>
                </div>
              </div>
              <GiftSelector
                streamId={streamId}
                onSendGift={async (giftId, qty, recipientCreatorId, recipientUsername) => {
                  await onSendGift(giftId, qty, recipientCreatorId, recipientUsername);
                  onCloseGiftPanel();
                }}
                onSendTip={async (amount, recipientCreatorId, recipientUsername, message) => {
                  await onSendTip(amount, recipientCreatorId, recipientUsername, message);
                  onCloseGiftPanel();
                }}
                userBalance={userBalance}
                spotlightedCreator={spotlightedCreator}
                hostName={stream.creator?.username || 'Host'}
              />
            </div>
          </div>
        </>
      )}

      {/* Call Request Modal */}
      {showCallRequestModal && creatorCallSettings && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50" onClick={onCloseCallModal} />
          <div className="fixed bottom-0 left-0 right-0 z-50 lg:bottom-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-[450px]">
            <div className="bg-black/95 backdrop-blur-xl rounded-t-3xl lg:rounded-3xl border border-white/20 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold">Request Private Call</h3>
                  <p className="text-sm text-gray-400">with {stream.creator?.username}</p>
                </div>
                <button onClick={onCloseCallModal} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl mb-6">
                <span className="text-gray-400">Your Balance</span>
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-yellow-400" />
                  <span className="text-xl font-bold text-yellow-400">{userBalance.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-3">
                {creatorCallSettings.isAvailableForCalls && (
                  <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center">
                          <Video className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white">Video Call</h4>
                          <p className="text-sm text-gray-400">{creatorCallSettings.minimumCallDuration} min minimum</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-cyan-400">{creatorCallSettings.callRatePerMinute} coins/min</div>
                        <div className="text-xs text-gray-400">~{creatorCallSettings.callRatePerMinute * creatorCallSettings.minimumCallDuration} coins min</div>
                      </div>
                    </div>
                    <button
                      onClick={() => onRequestCall('video')}
                      disabled={isRequestingCall || userBalance < creatorCallSettings.callRatePerMinute * creatorCallSettings.minimumCallDuration}
                      className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isRequestingCall ? <LoadingSpinner size="sm" /> : <><Video className="w-5 h-5" />Request Video Call</>}
                    </button>
                  </div>
                )}

                {creatorCallSettings.isAvailableForVoiceCalls && (
                  <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                          <Phone className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white">Voice Call</h4>
                          <p className="text-sm text-gray-400">{creatorCallSettings.minimumVoiceCallDuration} min minimum</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-purple-400">{creatorCallSettings.voiceCallRatePerMinute} coins/min</div>
                        <div className="text-xs text-gray-400">~{creatorCallSettings.voiceCallRatePerMinute * creatorCallSettings.minimumVoiceCallDuration} coins min</div>
                      </div>
                    </div>
                    <button
                      onClick={() => onRequestCall('voice')}
                      disabled={isRequestingCall || userBalance < creatorCallSettings.voiceCallRatePerMinute * creatorCallSettings.minimumVoiceCallDuration}
                      className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isRequestingCall ? <LoadingSpinner size="sm" /> : <><Phone className="w-5 h-5" />Request Voice Call</>}
                    </button>
                  </div>
                )}

                {!creatorCallSettings.isAvailableForCalls && !creatorCallSettings.isAvailableForVoiceCalls && (
                  <div className="p-4 bg-white/5 rounded-xl text-center">
                    <p className="text-gray-400">This creator is not currently available for calls</p>
                  </div>
                )}
              </div>

              {callRequestError && (
                <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl">
                  <p className="text-red-400 text-sm text-center">{callRequestError}</p>
                </div>
              )}

              {creatorCallSettings.isAvailableForCalls &&
                userBalance < creatorCallSettings.callRatePerMinute * creatorCallSettings.minimumCallDuration && (
                <div className="mt-4 p-3 bg-amber-500/20 border border-amber-500/50 rounded-xl">
                  <p className="text-amber-400 text-sm text-center">
                    You need at least {creatorCallSettings.callRatePerMinute * creatorCallSettings.minimumCallDuration} coins for a video call
                  </p>
                  <button onClick={() => router.push('/wallet')} className="w-full mt-2 py-2 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg text-amber-400 font-semibold text-sm transition-colors">
                    Get Coins
                  </button>
                </div>
              )}

              <p className="mt-4 text-xs text-gray-500 text-center">
                The creator will be notified of your request. You'll be charged based on actual call duration.
              </p>
            </div>
          </div>
        </>
      )}

      {/* Guest Invite Popup */}
      {guestInvite && (
        <GuestInvitePopup
          streamId={streamId}
          invite={guestInvite}
          onAccepted={onGuestAccepted}
          onDeclined={onGuestDeclined}
        />
      )}

      {/* Stream Ended Modal */}
      {streamEnded && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />
          <div className="relative w-full max-w-md animate-in zoom-in-95 duration-300">
            <div className="bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500/20 to-pink-500/20 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center shadow-lg shadow-red-500/30">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                      </svg>
                    </div>
                  </div>
                  <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-white text-center mb-2">Stream Has Ended</h2>

              {stream?.creator && (
                <div className="flex items-center justify-center gap-3 mb-6">
                  {stream.creator.avatarUrl ? (
                    <img src={stream.creator.avatarUrl} alt={stream.creator.username || ''} className="w-10 h-10 rounded-full object-cover ring-2 ring-white/20" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-sm font-bold">
                      {stream.creator.username?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-gray-400 text-sm">Thanks for watching</p>
                    <p className="text-white font-semibold">@{stream.creator.username}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-cyan-400">{viewerCount}</div>
                  <div className="text-xs text-gray-400">Viewers</div>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-purple-400">{peakViewers}</div>
                  <div className="text-xs text-gray-400">Peak Viewers</div>
                </div>
              </div>

              <div className="space-y-3">
                {stream?.creator?.username && (
                  <button
                    onClick={() => router.push(`/${stream.creator?.username}`)}
                    className="w-full py-3 px-4 bg-gradient-to-r from-digis-cyan to-digis-pink rounded-xl font-bold text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <Heart className="w-5 h-5" />Follow @{stream.creator.username}
                  </button>
                )}
                <button
                  onClick={() => router.push('/streams')}
                  className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 rounded-xl font-semibold text-white transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-5 h-5" />Browse Streams
                </button>
                <button onClick={() => router.push('/')} className="w-full py-2.5 px-4 text-gray-400 hover:text-white transition-colors text-sm font-medium">
                  Homepage
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
