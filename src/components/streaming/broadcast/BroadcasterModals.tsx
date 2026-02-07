'use client';

import { SetGoalModal } from '@/components/streaming/SetGoalModal';
import { SaveStreamModal } from '@/components/streaming/SaveStreamModal';
import { StreamSummaryModal } from '@/components/streaming/StreamSummaryModal';
import { StreamEndConfirmationModal } from '@/components/streaming/StreamEndConfirmationModal';
import { VipShowChoiceModal } from '@/components/streaming/VipShowChoiceModal';
import { CreatePollModal } from '@/components/streaming/CreatePollModal';
import { CreateCountdownModal } from '@/components/streaming/CreateCountdownModal';
import { SaveRecordingsModal } from '@/components/streaming/SaveRecordingsModal';
import { AnnounceTicketedStreamModal } from '@/components/streaming/AnnounceTicketedStreamModal';
import { RemoteControlQRModal } from '@/components/streaming/broadcast/RemoteControlQRModal';
import type { StreamGoal, Stream } from '@/db/schema';
import type { StreamRecording } from '@/hooks/useStreamRecorder';

interface BroadcasterModalsProps {
  streamId: string;
  stream: Stream | null;
  // Goal modal
  showGoalModal: boolean;
  setShowGoalModal: React.Dispatch<React.SetStateAction<boolean>>;
  editingGoal: StreamGoal | null;
  setEditingGoal: React.Dispatch<React.SetStateAction<StreamGoal | null>>;
  fetchGoals: () => Promise<void>;
  // Poll modal
  showCreatePollModal: boolean;
  setShowCreatePollModal: React.Dispatch<React.SetStateAction<boolean>>;
  fetchPoll: () => Promise<void>;
  // Countdown modal
  showCreateCountdownModal: boolean;
  setShowCreateCountdownModal: React.Dispatch<React.SetStateAction<boolean>>;
  fetchCountdown: () => Promise<void>;
  // End confirm modal
  showEndConfirm: boolean;
  setShowEndConfirm: React.Dispatch<React.SetStateAction<boolean>>;
  isLeaveAttempt: boolean;
  isEnding: boolean;
  handleEndStream: () => Promise<void>;
  // VIP choice modal
  showVipEndChoice: boolean;
  setShowVipEndChoice: React.Dispatch<React.SetStateAction<boolean>>;
  announcedTicketedStream: { id: string; title: string; ticketPrice: number; startsAt: Date } | null;
  vipTicketCount: number;
  handleEndStreamKeepVip: () => Promise<void>;
  handleEndStreamCancelVip: () => Promise<void>;
  // Summary modal
  showStreamSummary: boolean;
  streamSummary: any;
  onSummaryClose: () => void;
  // Save stream modal
  showSaveStreamModal: boolean;
  setShowSaveStreamModal: React.Dispatch<React.SetStateAction<boolean>>;
  showSuccess: (msg: string) => void;
  // Save recordings modal
  showSaveRecordingsModal: boolean;
  setShowSaveRecordingsModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowStreamSummary: React.Dispatch<React.SetStateAction<boolean>>;
  recordings: StreamRecording[];
  formatRecordingDuration: (seconds: number) => string;
  // Announce modal
  showAnnounceModal: boolean;
  setShowAnnounceModal: React.Dispatch<React.SetStateAction<boolean>>;
  viewerCount: number;
  setAnnouncedTicketedStream: (s: { id: string; title: string; ticketPrice: number; startsAt: Date } | null) => void;
  // QR modal
  showQRCode: boolean;
  setShowQRCode: React.Dispatch<React.SetStateAction<boolean>>;
}

export function BroadcasterModals({
  streamId,
  stream,
  showGoalModal,
  setShowGoalModal,
  editingGoal,
  setEditingGoal,
  fetchGoals,
  showCreatePollModal,
  setShowCreatePollModal,
  fetchPoll,
  showCreateCountdownModal,
  setShowCreateCountdownModal,
  fetchCountdown,
  showEndConfirm,
  setShowEndConfirm,
  isLeaveAttempt,
  isEnding,
  handleEndStream,
  showVipEndChoice,
  setShowVipEndChoice,
  announcedTicketedStream,
  vipTicketCount,
  handleEndStreamKeepVip,
  handleEndStreamCancelVip,
  showStreamSummary,
  streamSummary,
  onSummaryClose,
  showSaveStreamModal,
  setShowSaveStreamModal,
  showSuccess,
  showSaveRecordingsModal,
  setShowSaveRecordingsModal,
  setShowStreamSummary,
  recordings,
  formatRecordingDuration,
  showAnnounceModal,
  setShowAnnounceModal,
  viewerCount,
  setAnnouncedTicketedStream,
  showQRCode,
  setShowQRCode,
}: BroadcasterModalsProps) {
  return (
    <>
      {/* Set Goal Modal */}
      <SetGoalModal
        isOpen={showGoalModal}
        onClose={() => {
          setShowGoalModal(false);
          setEditingGoal(null);
        }}
        streamId={streamId}
        onGoalCreated={() => {
          fetchGoals();
          setEditingGoal(null);
        }}
        existingGoal={editingGoal}
      />

      {/* Create Poll Modal */}
      <CreatePollModal
        isOpen={showCreatePollModal}
        onClose={() => setShowCreatePollModal(false)}
        streamId={streamId}
        onPollCreated={fetchPoll}
      />

      {/* Create Countdown Modal */}
      <CreateCountdownModal
        isOpen={showCreateCountdownModal}
        onClose={() => setShowCreateCountdownModal(false)}
        streamId={streamId}
        onCountdownCreated={fetchCountdown}
      />

      {/* End Stream Confirmation Modal */}
      {showEndConfirm && (
        <StreamEndConfirmationModal
          isLeaveAttempt={isLeaveAttempt}
          isEnding={isEnding}
          onEndStream={handleEndStream}
          onCancel={() => setShowEndConfirm(false)}
        />
      )}

      {/* VIP Show Choice Modal */}
      {showVipEndChoice && announcedTicketedStream && (
        <VipShowChoiceModal
          announcedTicketedStream={announcedTicketedStream}
          vipTicketCount={vipTicketCount}
          isEnding={isEnding}
          onKeepVip={handleEndStreamKeepVip}
          onCancelVip={handleEndStreamCancelVip}
          onClose={() => setShowVipEndChoice(false)}
        />
      )}

      {/* Stream Summary Modal */}
      {showStreamSummary && streamSummary && (
        <StreamSummaryModal
          summary={streamSummary}
          onClose={onSummaryClose}
        />
      )}

      {/* Save Stream Modal */}
      {stream && (
        <SaveStreamModal
          isOpen={showSaveStreamModal}
          onClose={() => setShowSaveStreamModal(false)}
          streamId={streamId}
          streamTitle={stream.title}
          streamDescription={stream.description || undefined}
          onSaved={(vodId) => {
            console.log('Stream saved as VOD:', vodId);
            showSuccess('Stream saved! You can find it in your VOD library.');
          }}
        />
      )}

      {/* Save Recordings Modal */}
      {showSaveRecordingsModal && recordings.length > 0 && (
        <SaveRecordingsModal
          recordings={recordings}
          streamId={streamId}
          onClose={() => {
            setShowSaveRecordingsModal(false);
            setShowStreamSummary(true);
          }}
          onSaveComplete={() => {
            setShowSaveRecordingsModal(false);
            setShowStreamSummary(true);
            showSuccess('Recordings saved! They will appear in your Streams tab.');
          }}
          formatDuration={formatRecordingDuration}
        />
      )}

      {/* Announce Ticketed Stream Modal */}
      {showAnnounceModal && (
        <AnnounceTicketedStreamModal
          streamId={streamId}
          currentViewers={viewerCount}
          onClose={() => setShowAnnounceModal(false)}
          onSuccess={(ticketedStream) => {
            setShowAnnounceModal(false);
            setAnnouncedTicketedStream(ticketedStream);
          }}
        />
      )}

      {/* QR Code Modal */}
      <RemoteControlQRModal
        isOpen={showQRCode}
        onClose={() => setShowQRCode(false)}
        streamId={streamId}
      />
    </>
  );
}
