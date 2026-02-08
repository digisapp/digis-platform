'use client';

import { useParams, useRouter } from 'next/navigation';
import { useStreamControl } from '@/hooks/useStreamControl';
import { useToastContext } from '@/context/ToastContext';
import { ControlChat, ControlPanel, ControlStats, ControlModals } from '@/components/stream-control';
import {
  Users, Radio, Coins, Volume2, VolumeX,
  MessageCircle, Settings, BarChart2,
} from 'lucide-react';
import type { TabType } from '@/components/stream-control/types';

export default function StreamRemoteControlPage() {
  const params = useParams();
  const router = useRouter();
  const streamId = params.streamId as string;
  const { showSuccess } = useToastContext();
  const c = useStreamControl(streamId);

  if (c.loading || c.authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (c.error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-500 mb-4">{c.error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-white/10 rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/90 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Radio className={`w-4 h-4 ${c.isConnected ? 'text-red-500 animate-pulse' : 'text-gray-500'}`} />
            <span className={`font-semibold text-sm ${c.isConnected ? 'text-red-500' : 'text-gray-500'}`}>
              {c.isConnected ? 'LIVE' : 'CONNECTING...'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-400">
            <Users className="w-4 h-4" />
            <span className="text-sm">{c.viewerCount || c.stream?.currentViewers || 0}</span>
          </div>
          <div className="flex items-center gap-1.5 text-yellow-400">
            <Coins className="w-4 h-4" />
            <span className="text-sm">{c.totalEarnings}</span>
          </div>
        </div>

        <button
          onClick={() => c.setSoundEnabled(!c.soundEnabled)}
          className={`p-2 rounded-lg ${c.soundEnabled ? 'bg-green-500/20 text-green-500' : 'bg-white/10 text-gray-400'}`}
        >
          {c.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-white/10">
        {(['chat', 'controls', 'stats'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => c.setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
              c.activeTab === tab
                ? 'text-white border-b-2 border-digis-cyan'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab === 'chat' && <MessageCircle className="w-4 h-4 inline mr-1.5" />}
            {tab === 'controls' && <Settings className="w-4 h-4 inline mr-1.5" />}
            {tab === 'stats' && <BarChart2 className="w-4 h-4 inline mr-1.5" />}
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {c.activeTab === 'chat' && (
        <ControlChat
          messages={c.messages}
          chatMessage={c.chatMessage}
          setChatMessage={c.setChatMessage}
          isSending={c.isSending}
          isAutoScroll={c.isAutoScroll}
          setIsAutoScroll={c.setIsAutoScroll}
          currentUserId={c.user?.id}
          messagesContainerRef={c.messagesContainerRef}
          messagesEndRef={c.messagesEndRef}
          chatInputRef={c.chatInputRef}
          onScroll={c.handleScroll}
          onSendMessage={c.sendChatMessage}
          onSelectUser={c.setSelectedUser}
        />
      )}

      {c.activeTab === 'controls' && (
        <ControlPanel
          goals={c.goals}
          activePoll={c.activePoll}
          activeCountdown={c.activeCountdown}
          announcedShow={c.announcedShow}
          vipModeActive={c.vipModeActive}
          startingVipStream={c.startingVipStream}
          menuEnabled={c.menuEnabled}
          onShowGoalModal={() => c.setShowGoalModal(true)}
          onDeleteGoal={c.handleDeleteGoal}
          onShowAnnounceModal={() => c.setShowAnnounceModal(true)}
          onStartVipShow={c.startVipShow}
          onShowCreatePollModal={() => c.setShowCreatePollModal(true)}
          onEndPoll={c.endPoll}
          onShowCreateCountdownModal={() => c.setShowCreateCountdownModal(true)}
          onCancelCountdown={c.cancelCountdown}
          onToggleTipMenu={c.toggleTipMenu}
          onShowEndConfirm={() => c.setShowEndConfirm(true)}
        />
      )}

      {c.activeTab === 'stats' && (
        <ControlStats
          currentViewers={c.viewerCount || c.stream?.currentViewers || 0}
          peakViewers={c.peakViewers}
          totalEarnings={c.totalEarnings}
          leaderboard={c.leaderboard}
        />
      )}

      {/* Modals */}
      <ControlModals
        streamId={streamId}
        currentViewers={c.viewerCount || c.stream?.currentViewers || 0}
        selectedUser={c.selectedUser}
        onTimeout={c.handleTimeout}
        onBan={c.handleBan}
        onCloseModeration={() => c.setSelectedUser(null)}
        showEndConfirm={c.showEndConfirm}
        isEnding={c.isEnding}
        onEndStream={c.handleEndStream}
        onCloseEndConfirm={() => c.setShowEndConfirm(false)}
        showGoalModal={c.showGoalModal}
        editingGoal={c.editingGoal}
        onCloseGoalModal={() => { c.setShowGoalModal(false); c.setEditingGoal(null); }}
        onGoalCreated={c.handleGoalCreated}
        showCreatePollModal={c.showCreatePollModal}
        onClosePollModal={() => c.setShowCreatePollModal(false)}
        onPollCreated={c.handlePollCreated}
        showCreateCountdownModal={c.showCreateCountdownModal}
        onCloseCountdownModal={() => c.setShowCreateCountdownModal(false)}
        onCountdownCreated={c.handleCountdownCreated}
        showAnnounceModal={c.showAnnounceModal}
        onCloseAnnounceModal={() => c.setShowAnnounceModal(false)}
        onAnnounceSuccess={(show) => {
          c.setAnnouncedShow({
            id: show.id,
            title: show.title,
            ticketPrice: show.ticketPrice,
            startsAt: show.startsAt instanceof Date ? show.startsAt : new Date(show.startsAt),
          });
          c.setShowAnnounceModal(false);
          showSuccess('VIP show announced!');
        }}
      />

      {/* Stream Title Footer */}
      <div className="px-4 py-3 border-t border-white/10 bg-black/90">
        <p className="text-gray-400 text-sm truncate">{c.stream?.title}</p>
      </div>
    </div>
  );
}
