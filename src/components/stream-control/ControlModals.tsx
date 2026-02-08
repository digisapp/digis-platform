'use client';

import { Clock, Ban } from 'lucide-react';
import { SetGoalModal } from '@/components/streaming/SetGoalModal';
import { CreatePollModal } from '@/components/streaming/CreatePollModal';
import { CreateCountdownModal } from '@/components/streaming/CreateCountdownModal';
import { AnnounceTicketedStreamModal } from '@/components/streaming/AnnounceTicketedStreamModal';
import type { StreamGoal } from './types';

interface ControlModalsProps {
  streamId: string;
  currentViewers: number;
  // Moderation
  selectedUser: { id: string; username: string } | null;
  onTimeout: (userId: string, username: string) => void;
  onBan: (userId: string, username: string) => void;
  onCloseModeration: () => void;
  // End stream
  showEndConfirm: boolean;
  isEnding: boolean;
  onEndStream: () => void;
  onCloseEndConfirm: () => void;
  // Goal
  showGoalModal: boolean;
  editingGoal: StreamGoal | null;
  onCloseGoalModal: () => void;
  onGoalCreated: () => void;
  // Poll
  showCreatePollModal: boolean;
  onClosePollModal: () => void;
  onPollCreated: () => void;
  // Countdown
  showCreateCountdownModal: boolean;
  onCloseCountdownModal: () => void;
  onCountdownCreated: () => void;
  // Announce
  showAnnounceModal: boolean;
  onCloseAnnounceModal: () => void;
  onAnnounceSuccess: (show: { id: string; title: string; ticketPrice: number; startsAt: Date }) => void;
}

export function ControlModals({
  streamId, currentViewers,
  selectedUser, onTimeout, onBan, onCloseModeration,
  showEndConfirm, isEnding, onEndStream, onCloseEndConfirm,
  showGoalModal, editingGoal, onCloseGoalModal, onGoalCreated,
  showCreatePollModal, onClosePollModal, onPollCreated,
  showCreateCountdownModal, onCloseCountdownModal, onCountdownCreated,
  showAnnounceModal, onCloseAnnounceModal, onAnnounceSuccess,
}: ControlModalsProps) {
  return (
    <>
      {/* Moderation Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-50" onClick={onCloseModeration}>
          <div className="bg-gray-900 w-full max-w-md rounded-t-2xl p-4 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-1 bg-gray-700 rounded-full mx-auto mb-4" />
            <p className="text-center text-lg mb-4">@{selectedUser.username}</p>
            <div className="space-y-2">
              <button
                onClick={() => onTimeout(selectedUser.id, selectedUser.username)}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-yellow-500/20 text-yellow-400 rounded-xl"
              >
                <Clock className="w-5 h-5" />
                <span className="font-medium">Timeout (5 min)</span>
              </button>
              <button
                onClick={() => onBan(selectedUser.id, selectedUser.username)}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-red-500/20 text-red-400 rounded-xl"
              >
                <Ban className="w-5 h-5" />
                <span className="font-medium">Ban from Stream</span>
              </button>
              <button
                onClick={onCloseModeration}
                className="w-full px-4 py-3 bg-white/10 text-gray-400 rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Stream Confirm Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onCloseEndConfirm}>
          <div className="bg-gray-900 w-full max-w-sm rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-center mb-2">End Stream?</h3>
            <p className="text-gray-400 text-center mb-6">This will end your stream for all viewers.</p>
            <div className="space-y-2">
              <button
                onClick={onEndStream}
                disabled={isEnding}
                className="w-full py-3 bg-red-500 text-white rounded-xl font-medium disabled:opacity-50"
              >
                {isEnding ? 'Ending...' : 'End Stream'}
              </button>
              <button
                onClick={onCloseEndConfirm}
                className="w-full py-3 bg-white/10 text-gray-400 rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feature Modals */}
      {showGoalModal && (
        <SetGoalModal
          isOpen={showGoalModal}
          streamId={streamId}
          existingGoal={editingGoal}
          onClose={onCloseGoalModal}
          onGoalCreated={onGoalCreated}
        />
      )}

      {showCreatePollModal && (
        <CreatePollModal
          isOpen={showCreatePollModal}
          streamId={streamId}
          onClose={onClosePollModal}
          onPollCreated={onPollCreated}
        />
      )}

      {showCreateCountdownModal && (
        <CreateCountdownModal
          isOpen={showCreateCountdownModal}
          streamId={streamId}
          onClose={onCloseCountdownModal}
          onCountdownCreated={onCountdownCreated}
        />
      )}

      {showAnnounceModal && (
        <AnnounceTicketedStreamModal
          streamId={streamId}
          currentViewers={currentViewers}
          onClose={onCloseAnnounceModal}
          onSuccess={onAnnounceSuccess}
        />
      )}
    </>
  );
}
