'use client';

import { Target, Ticket, BarChart2, Clock, Square } from 'lucide-react';
import type { StreamGoal, Poll, Countdown } from './types';

interface ControlPanelProps {
  goals: StreamGoal[];
  activePoll: Poll | null;
  activeCountdown: Countdown | null;
  announcedShow: { id: string; title: string; ticketPrice: number; startsAt: Date } | null;
  vipModeActive: boolean;
  startingVipStream: boolean;
  menuEnabled: boolean;
  onShowGoalModal: () => void;
  onDeleteGoal: (goalId: string) => void;
  onShowAnnounceModal: () => void;
  onStartVipShow: () => void;
  onShowCreatePollModal: () => void;
  onEndPoll: () => void;
  onShowCreateCountdownModal: () => void;
  onCancelCountdown: () => void;
  onToggleTipMenu: () => void;
  onShowEndConfirm: () => void;
}

export function ControlPanel({
  goals, activePoll, activeCountdown, announcedShow, vipModeActive, startingVipStream,
  menuEnabled, onShowGoalModal, onDeleteGoal, onShowAnnounceModal, onStartVipShow,
  onShowCreatePollModal, onEndPoll, onShowCreateCountdownModal, onCancelCountdown,
  onToggleTipMenu, onShowEndConfirm,
}: ControlPanelProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Goals Section */}
      <div className="bg-white/5 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Target className="w-5 h-5 text-green-400" />
            Goals
          </h3>
          <button
            onClick={onShowGoalModal}
            className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm"
          >
            + Add
          </button>
        </div>
        {goals.length === 0 ? (
          <p className="text-gray-500 text-sm">No active goals</p>
        ) : (
          <div className="space-y-2">
            {goals.filter(g => g.isActive).map((goal) => (
              <div key={goal.id} className="bg-white/5 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium">{goal.title}</span>
                  <button
                    onClick={() => onDeleteGoal(goal.id)}
                    className="text-red-400 text-xs"
                  >
                    Delete
                  </button>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {goal.currentAmount} / {goal.targetAmount} coins
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* VIP Show Section */}
      <div className="bg-white/5 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Ticket className="w-5 h-5 text-purple-400" />
            VIP Show
          </h3>
          {!announcedShow && !vipModeActive && (
            <button
              onClick={onShowAnnounceModal}
              className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-sm"
            >
              Announce
            </button>
          )}
        </div>
        {vipModeActive ? (
          <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-3">
            <p className="text-purple-400 font-medium">VIP Show Active</p>
            <p className="text-sm text-gray-400">Only ticket holders can view</p>
          </div>
        ) : announcedShow ? (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <p className="font-medium">{announcedShow.title}</p>
            <p className="text-sm text-gray-400">{announcedShow.ticketPrice} coins</p>
            <button
              onClick={onStartVipShow}
              disabled={startingVipStream}
              className="mt-2 w-full py-2 bg-purple-500 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {startingVipStream ? 'Starting...' : 'Start VIP Show'}
            </button>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No VIP show announced</p>
        )}
      </div>

      {/* Polls Section */}
      <div className="bg-white/5 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-blue-400" />
            Poll
          </h3>
          {!activePoll && (
            <button
              onClick={onShowCreatePollModal}
              className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-sm"
            >
              Create
            </button>
          )}
        </div>
        {activePoll ? (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <p className="font-medium mb-2">{activePoll.question}</p>
            {activePoll.options.map((opt, i) => (
              <div key={i} className="flex justify-between text-sm mb-1">
                <span>{opt}</span>
                <span className="text-blue-400">{activePoll.voteCounts[i]} votes</span>
              </div>
            ))}
            <button
              onClick={onEndPoll}
              className="mt-2 w-full py-2 bg-red-500/20 text-red-400 rounded-lg text-sm"
            >
              End Poll
            </button>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No active poll</p>
        )}
      </div>

      {/* Countdown Section */}
      <div className="bg-white/5 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-400" />
            Countdown
          </h3>
          {!activeCountdown && (
            <button
              onClick={onShowCreateCountdownModal}
              className="px-3 py-1.5 bg-orange-500/20 text-orange-400 rounded-lg text-sm"
            >
              Start
            </button>
          )}
        </div>
        {activeCountdown ? (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
            <p className="font-medium">{activeCountdown.label}</p>
            <button
              onClick={onCancelCountdown}
              className="mt-2 w-full py-2 bg-red-500/20 text-red-400 rounded-lg text-sm"
            >
              Cancel
            </button>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No active countdown</p>
        )}
      </div>

      {/* Creator Menu Toggle */}
      <div className="bg-white/5 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Creator Menu</h3>
          <button
            onClick={onToggleTipMenu}
            className={`px-4 py-2 rounded-lg font-medium ${
              menuEnabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}
          >
            {menuEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </div>

      {/* End Stream */}
      <button
        onClick={onShowEndConfirm}
        className="w-full py-3 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl font-medium flex items-center justify-center gap-2"
      >
        <Square className="w-5 h-5" />
        End Stream
      </button>
    </div>
  );
}
