'use client';

import { useState } from 'react';
import { Video, Mic, X, Loader2, Sparkles } from 'lucide-react';

interface GuestInvite {
  inviteId: string;
  viewerId: string;
  inviteType: 'video' | 'voice';
  host: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  streamTitle: string;
}

interface GuestInvitePopupProps {
  streamId: string;
  invite: GuestInvite;
  onAccepted: (inviteType: 'video' | 'voice') => void;
  onDeclined: () => void;
}

export function GuestInvitePopup({ streamId, invite, onAccepted, onDeclined }: GuestInvitePopupProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  const handleAccept = async () => {
    setIsAccepting(true);

    try {
      const response = await fetch(`/api/streams/${streamId}/guest/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: invite.inviteId }),
      });

      if (response.ok) {
        onAccepted(invite.inviteType);
      } else {
        const data = await response.json();
        console.error('Failed to accept invite:', data.error);
      }
    } catch (error) {
      console.error('Error accepting invite:', error);
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = async () => {
    setIsDeclining(true);

    try {
      const response = await fetch(`/api/streams/${streamId}/guest/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: invite.inviteId }),
      });

      if (response.ok) {
        onDeclined();
      }
    } catch (error) {
      console.error('Error declining invite:', error);
    } finally {
      setIsDeclining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-sm animate-in zoom-in-95 duration-300">
        <div className="bg-gradient-to-br from-purple-900/95 via-gray-900/95 to-cyan-900/95 backdrop-blur-xl rounded-3xl border-2 border-purple-500/50 p-6 shadow-2xl shadow-purple-500/20">
          {/* Sparkles decoration */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-1 px-4 py-1.5 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-white text-sm font-bold">You're Invited!</span>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleDecline}
            disabled={isDeclining}
            className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Host Info */}
          <div className="mt-4 mb-6 text-center">
            <div className="flex justify-center mb-3">
              {invite.host.avatarUrl ? (
                <img
                  src={invite.host.avatarUrl}
                  alt={invite.host.displayName || invite.host.username}
                  className="w-20 h-20 rounded-full object-cover ring-4 ring-purple-500 ring-offset-2 ring-offset-gray-900"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-2xl font-bold ring-4 ring-purple-500 ring-offset-2 ring-offset-gray-900">
                  {(invite.host.displayName || invite.host.username)?.[0]?.toUpperCase() || '?'}
                </div>
              )}
            </div>

            <h3 className="text-xl font-bold text-white mb-1">
              {invite.host.displayName || invite.host.username}
            </h3>
            <p className="text-gray-400 text-sm">@{invite.host.username}</p>
          </div>

          {/* Invite Message */}
          <div className="bg-white/10 rounded-xl p-4 mb-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              {invite.inviteType === 'video' ? (
                <Video className="w-5 h-5 text-cyan-400" />
              ) : (
                <Mic className="w-5 h-5 text-purple-400" />
              )}
              <span className="text-white font-semibold">
                {invite.inviteType === 'video' ? 'Video Call' : 'Voice Call'}
              </span>
            </div>
            <p className="text-gray-300 text-sm">
              wants you to join the stream as a co-host!
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleDecline}
              disabled={isDeclining || isAccepting}
              className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/20 rounded-xl font-semibold text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isDeclining ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Decline'
              )}
            </button>
            <button
              onClick={handleAccept}
              disabled={isAccepting || isDeclining}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30 disabled:opacity-50"
            >
              {isAccepting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {invite.inviteType === 'video' ? (
                    <Video className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                  Join Now
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
