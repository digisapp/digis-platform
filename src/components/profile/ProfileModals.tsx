'use client';

import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { MessageCircle, Star, Coins } from 'lucide-react';
import type { ProfileData, TipSuccessGift, InsufficientFundsDetails } from './types';

interface ProfileModalsProps {
  profile: ProfileData;
  mounted: boolean;
  // Tip success
  showTipSuccessModal: boolean;
  onCloseTipSuccess: () => void;
  tipSuccessAmount: number;
  tipSuccessGift: TipSuccessGift | null;
  // Video player
  selectedVideo: any;
  onCloseVideo: () => void;
  // Photo viewer
  selectedPhoto: any;
  onClosePhoto: () => void;
  // Message confirmation
  showMessageModal: boolean;
  onCloseMessage: () => void;
  messageLoading: boolean;
  isColdOutreach: boolean;
  onCreateConversation: () => void;
  // Subscribe confirm
  showSubscribeConfirmModal: boolean;
  onCloseSubscribeConfirm: () => void;
  subscriptionTier: any;
  subscribeLoading: boolean;
  onSubscribe: () => void;
  // Insufficient funds
  showInsufficientFundsModal: boolean;
  onCloseInsufficientFunds: () => void;
  insufficientFundsAmount: number;
  insufficientFundsDetails: InsufficientFundsDetails | null;
  // Subscribe success
  showSubscribeSuccessModal: boolean;
  onCloseSubscribeSuccess: () => void;
}

export function ProfileModals({
  profile,
  mounted,
  showTipSuccessModal,
  onCloseTipSuccess,
  tipSuccessAmount,
  tipSuccessGift,
  selectedVideo,
  onCloseVideo,
  selectedPhoto,
  onClosePhoto,
  showMessageModal,
  onCloseMessage,
  messageLoading,
  isColdOutreach,
  onCreateConversation,
  showSubscribeConfirmModal,
  onCloseSubscribeConfirm,
  subscriptionTier,
  subscribeLoading,
  onSubscribe,
  showInsufficientFundsModal,
  onCloseInsufficientFunds,
  insufficientFundsAmount,
  insufficientFundsDetails,
  showSubscribeSuccessModal,
  onCloseSubscribeSuccess,
}: ProfileModalsProps) {
  const router = useRouter();

  return (
    <>
      {/* Tip Success Modal */}
      {showTipSuccessModal && mounted && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
          onClick={onCloseTipSuccess}
        >
          <div
            className="relative backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-3xl p-8 max-w-sm w-full border-2 border-green-500/30 shadow-[0_0_50px_rgba(34,197,94,0.3)] animate-in zoom-in-95 duration-200 mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/0 via-green-500/20 to-green-500/0 animate-shimmer" style={{animation: 'shimmer 3s infinite'}} />
            </div>
            <div className="relative text-center">
              <div className="relative inline-block mb-4">
                <div className="absolute -inset-3 bg-green-500/30 rounded-full blur-xl animate-pulse"></div>
                <div className="relative w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-[0_0_40px_rgba(34,197,94,0.5)]">
                  <span className="text-4xl">{tipSuccessGift ? tipSuccessGift.emoji : '🪙'}</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-white via-green-100 to-white bg-clip-text text-transparent mb-2">
                Gift Sent!
              </h3>
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl p-4 mb-4 border border-green-500/30">
                {tipSuccessGift ? (
                  <>
                    <div className="text-4xl mb-1">{tipSuccessGift.emoji}</div>
                    <div className="text-xl font-bold text-white mb-1">{tipSuccessGift.name}</div>
                    <p className="text-green-400 text-sm">{tipSuccessAmount} coins</p>
                  </>
                ) : (
                  <div className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                    {tipSuccessAmount}
                  </div>
                )}
                <p className="text-gray-400 text-sm mt-2">sent to</p>
                <p className="text-white font-semibold">{profile.user.displayName || profile.user.username}</p>
              </div>
              <button
                onClick={onCloseTipSuccess}
                className="w-full px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:scale-105 transition-all shadow-lg"
              >
                Awesome!
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Video Player Modal */}
      {selectedVideo && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onCloseVideo}
        >
          <div
            className="relative max-w-5xl w-full bg-gray-900 rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onCloseVideo}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <video src={selectedVideo.url} controls autoPlay className="w-full aspect-video bg-black" />
            <div className="p-6 bg-gray-900">
              <h3 className="text-xl font-bold text-white mb-2">{selectedVideo.title}</h3>
              {selectedVideo.description && (
                <p className="text-gray-300 text-sm">{selectedVideo.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Photo Viewer Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4"
          onClick={onClosePhoto}
        >
          <div
            className="relative max-w-5xl w-full max-h-[95vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClosePhoto}
              className="absolute top-2 right-2 md:top-4 md:right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex-1 flex items-center justify-center min-h-0">
              <img
                src={selectedPhoto.url || selectedPhoto.thumbnail}
                alt={selectedPhoto.title || 'Photo'}
                className="max-w-full max-h-[70vh] md:max-h-[80vh] object-contain rounded-xl md:rounded-2xl"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src !== selectedPhoto.thumbnail && selectedPhoto.thumbnail) {
                    target.src = selectedPhoto.thumbnail;
                  }
                }}
              />
            </div>
            <div className="mt-2 md:mt-4 p-4 md:p-6 bg-gray-900 rounded-xl md:rounded-2xl">
              <h3 className="text-lg md:text-xl font-bold text-white mb-1 md:mb-2">{selectedPhoto.title}</h3>
              {selectedPhoto.description && (
                <p className="text-gray-300 text-sm">{selectedPhoto.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Message Confirmation Modal */}
      {showMessageModal && mounted && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
          onClick={onCloseMessage}
        >
          <div
            className="relative backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-3xl p-8 max-w-sm w-full border-2 border-cyan-500/30 shadow-[0_0_50px_rgba(34,211,238,0.3)] animate-in zoom-in-95 duration-200 mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/20 to-cyan-500/0 animate-shimmer" style={{animation: 'shimmer 3s infinite'}} />
            </div>
            <div className="relative">
              <button
                onClick={onCloseMessage}
                className="absolute top-0 right-0 text-gray-400 hover:text-white transition-colors z-10"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="text-center mb-6">
                <div className="relative inline-block mb-4">
                  <div className="absolute -inset-2 bg-cyan-500/30 rounded-full blur-xl"></div>
                  <div className="relative w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.4)]">
                    <MessageCircle className="w-8 h-8 text-white" />
                  </div>
                </div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent mb-1">
                  Start Chat
                </h3>
                <p className="text-gray-400 text-sm">with {profile.user.displayName || profile.user.username}</p>
              </div>
              <div className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-xl p-6 mb-6 text-center border-2 border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                <p className="text-gray-400 text-sm mb-2 font-medium">
                  {isColdOutreach ? 'One-time unlock fee' : 'Cost per message'}
                </p>
                <div className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  {profile.messageRate && profile.messageRate > 0 ? profile.messageRate : 50}
                </div>
                <p className="text-gray-400 text-sm mt-1 font-medium">coins</p>
                {isColdOutreach && (
                  <p className="text-gray-500 text-xs mt-2">Messages are free after unlocking</p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onCloseMessage}
                  className="flex-1 px-6 py-3 rounded-xl font-semibold bg-white/5 hover:bg-white/10 text-gray-300 transition-all border border-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={onCreateConversation}
                  disabled={messageLoading}
                  className="flex-1 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:scale-105 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {messageLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Starting...</span>
                    </div>
                  ) : (
                    'Start Chat'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Subscribe Confirmation Modal */}
      {showSubscribeConfirmModal && subscriptionTier && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={onCloseSubscribeConfirm}
        >
          <div
            className="relative w-full max-w-sm bg-black/95 rounded-3xl p-8 border-2 border-purple-500/50 shadow-[0_0_60px_rgba(168,85,247,0.4),inset_0_0_40px_rgba(168,85,247,0.1)] animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onCloseSubscribeConfirm}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute -inset-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-lg opacity-75 animate-pulse" />
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_40px_rgba(168,85,247,0.6)]">
                  <Star className="w-10 h-10 text-white" />
                </div>
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-white mb-2">
                Subscribe to {profile.user.displayName || profile.user.username}
              </h2>
            </div>
            <div className="flex justify-center mb-4">
              <div className="px-6 py-4 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                <div className="text-center">
                  <span className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    {subscriptionTier.pricePerMonth}
                  </span>
                  <span className="text-gray-300 ml-2">coins/month</span>
                </div>
              </div>
            </div>
            <div className="mb-6 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
              <p className="text-xs text-purple-300 font-medium mb-3 text-center">Subscribers Get</p>
              <div className="flex justify-center">
                <div className="flex items-center gap-2 text-white text-sm">
                  <span className="text-base">🔴</span>
                  <span>Subs Only Streams</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onCloseSubscribeConfirm}
                className="flex-1 py-3 px-4 rounded-xl font-semibold bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onCloseSubscribeConfirm();
                  onSubscribe();
                }}
                disabled={subscribeLoading}
                className="flex-1 py-3 px-4 rounded-xl font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:scale-105 transition-all shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:hover:scale-100"
              >
                {subscribeLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                ) : (
                  'Subscribe'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insufficient Funds Modal */}
      {showInsufficientFundsModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={onCloseInsufficientFunds}
        >
          <div
            className="relative w-full max-w-sm bg-black/95 rounded-3xl p-8 border-2 border-cyan-500/50 shadow-[0_0_60px_rgba(34,211,238,0.4),inset_0_0_40px_rgba(34,211,238,0.1)] animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-cyan-500/20 via-yellow-500/20 to-cyan-500/20 blur-xl -z-10 animate-pulse" />
            <button
              onClick={onCloseInsufficientFunds}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute -inset-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full blur-lg opacity-75 animate-pulse" />
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50 flex items-center justify-center shadow-[0_0_40px_rgba(234,179,8,0.4)]">
                  <Coins className="w-10 h-10 text-yellow-400" />
                </div>
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">
                {insufficientFundsDetails?.held ? 'Coins Unavailable' : 'Not Enough Coins'}
              </h2>
              <p className="text-gray-400 mb-6">
                {insufficientFundsDetails?.held ? (
                  <>Some of your coins are held for active calls</>
                ) : insufficientFundsAmount > 0 ? (
                  `You need ${insufficientFundsAmount} coins to subscribe`
                ) : (
                  'You need more coins to complete this action'
                )}
              </p>
            </div>
            <div className="flex flex-col items-center gap-3 mb-6">
              {insufficientFundsDetails?.held ? (
                <>
                  <div className="px-6 py-3 rounded-2xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 w-full">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Total Balance</span>
                      <span className="text-xl font-bold text-yellow-400">{insufficientFundsDetails.total} coins</span>
                    </div>
                  </div>
                  <div className="px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 w-full">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Held for Calls</span>
                      <span className="text-xl font-bold text-orange-400">-{insufficientFundsDetails.held} coins</span>
                    </div>
                  </div>
                  <div className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 w-full">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Available</span>
                      <span className="text-xl font-bold text-cyan-400">{insufficientFundsDetails.available} coins</span>
                    </div>
                  </div>
                  <div className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 w-full">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Need for Subscribe</span>
                      <span className="text-xl font-bold text-purple-400">{insufficientFundsAmount} coins</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 text-center mt-2">
                    Held coins will be released when your call ends
                  </p>
                </>
              ) : (
                <div className="px-6 py-4 rounded-2xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30">
                  <div className="flex items-center gap-3">
                    <Coins className="w-8 h-8 text-yellow-400" />
                    <span className="text-3xl font-bold text-yellow-400">
                      {insufficientFundsAmount > 0 ? insufficientFundsAmount : '???'}
                    </span>
                    <span className="text-gray-400">needed</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onCloseInsufficientFunds}
                className="flex-1 py-3 px-4 rounded-xl font-semibold bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onCloseInsufficientFunds();
                  router.push('/wallet');
                }}
                className="flex-1 py-3 px-4 rounded-xl font-semibold bg-gradient-to-r from-yellow-500 to-orange-500 text-black hover:scale-105 transition-all shadow-lg shadow-yellow-500/30 flex items-center justify-center gap-2"
              >
                <Coins className="w-5 h-5" />
                Buy Coins
              </button>
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
          </div>
        </div>
      )}

      {/* Subscribe Success Modal */}
      {showSubscribeSuccessModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={onCloseSubscribeSuccess}
        >
          <div
            className="relative w-full max-w-sm bg-black/95 rounded-3xl p-8 border-2 border-purple-500/50 shadow-[0_0_60px_rgba(168,85,247,0.4),inset_0_0_40px_rgba(168,85,247,0.1)] animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20 blur-xl -z-10 animate-pulse" />
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute -inset-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-lg opacity-75 animate-pulse" />
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_40px_rgba(168,85,247,0.6)]">
                  <Star className="w-10 h-10 text-white fill-white" />
                </div>
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-3">
                You're In! 🎉
              </h2>
              <p className="text-gray-300 mb-2">Welcome to the inner circle of</p>
              <p className="text-xl font-bold text-white mb-6">
                {profile.user.displayName || profile.user.username}
              </p>
            </div>
            <button
              onClick={onCloseSubscribeSuccess}
              className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 rounded-xl text-white font-bold transition-all hover:scale-[1.02] shadow-[0_0_30px_rgba(168,85,247,0.4)]"
            >
              Let's Go!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
