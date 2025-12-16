'use client';

import { useState, useEffect } from 'react';
import { XCircle, Check, BarChart2, X } from 'lucide-react';
import { useToastContext } from '@/context/ToastContext';

interface Poll {
  id: string;
  question: string;
  options: string[];
  voteCounts: number[];
  totalVotes: number;
  endsAt: string;
  isActive: boolean;
}

interface StreamPollProps {
  poll: Poll;
  isBroadcaster?: boolean;
  streamId: string;
  onPollEnded?: () => void;
  onVoted?: () => void;
}

export function StreamPoll({ poll, isBroadcaster = false, streamId, onPollEnded, onVoted }: StreamPollProps) {
  const { showError, showSuccess } = useToastContext();
  const [voting, setVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedOption, setVotedOption] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [ending, setEnding] = useState(false);
  const [localVoteCounts, setLocalVoteCounts] = useState<number[]>(poll.voteCounts);
  const [localTotalVotes, setLocalTotalVotes] = useState(poll.totalVotes);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  // Check if user has already voted
  useEffect(() => {
    const checkVote = async () => {
      try {
        const response = await fetch(`/api/streams/${streamId}/polls/${poll.id}/vote`);
        const data = await response.json();
        if (data.hasVoted) {
          setHasVoted(true);
          setVotedOption(data.votedOption);
        }
      } catch (err) {
        console.error('Error checking vote:', err);
      }
    };
    checkVote();
  }, [poll.id, streamId]);

  // Countdown timer
  useEffect(() => {
    const updateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(poll.endsAt).getTime();
      const diff = Math.max(0, Math.floor((end - now) / 1000));
      setTimeLeft(diff);

      if (diff === 0 && poll.isActive) {
        onPollEnded?.();
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [poll.endsAt, poll.isActive, onPollEnded]);

  // Update local counts when poll prop changes
  useEffect(() => {
    setLocalVoteCounts(poll.voteCounts);
    setLocalTotalVotes(poll.totalVotes);
  }, [poll.voteCounts, poll.totalVotes]);

  const handleVote = async (optionIndex: number) => {
    if (hasVoted || voting || !poll.isActive || timeLeft === 0) return;

    setVoting(true);
    try {
      const response = await fetch(`/api/streams/${streamId}/polls/${poll.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionIndex }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to vote');
      }

      setHasVoted(true);
      setVotedOption(optionIndex);

      // Update local counts immediately
      const newCounts = [...localVoteCounts];
      newCounts[optionIndex] = (newCounts[optionIndex] || 0) + 1;
      setLocalVoteCounts(newCounts);
      setLocalTotalVotes(localTotalVotes + 1);

      showSuccess('Vote recorded!');
      onVoted?.();
    } catch (error: any) {
      showError(error.message || 'Failed to vote');
    } finally {
      setVoting(false);
    }
  };

  const handleEndPoll = async () => {
    setEnding(true);
    try {
      const response = await fetch(`/api/streams/${streamId}/polls/${poll.id}/end`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to end poll');
      }

      onPollEnded?.();
    } catch (error: any) {
      showError(error.message || 'Failed to end poll');
    } finally {
      setEnding(false);
      setShowEndConfirm(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  const isEnded = !poll.isActive || timeLeft === 0;
  const showResults = hasVoted || isEnded || isBroadcaster;

  return (
    <>
      {/* Tron-themed End Poll Confirmation Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowEndConfirm(false)} />
          <div className="relative bg-black/95 rounded-2xl border border-purple-500/50 shadow-[0_0_40px_rgba(168,85,247,0.3)] p-5 max-w-xs w-full">
            {/* Tron glow effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-purple-500/10 to-transparent pointer-events-none" />

            {/* Close button */}
            <button
              onClick={() => setShowEndConfirm(false)}
              className="absolute top-3 right-3 p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>

            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center">
                <BarChart2 className="w-6 h-6 text-purple-400" />
              </div>
            </div>

            {/* Content */}
            <div className="text-center mb-5">
              <h3 className="text-lg font-bold text-white mb-1">End Poll?</h3>
              <p className="text-gray-400 text-sm">This will close voting and show final results.</p>
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition-colors"
              >
                Keep Open
              </button>
              <button
                onClick={handleEndPoll}
                disabled={ending}
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
              >
                {ending ? 'Ending...' : 'End Poll'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Poll Card - Mobile Optimized */}
      <div className="bg-black/70 backdrop-blur-md rounded-xl border border-purple-500/30 p-3 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-purple-400" />
            <span className="text-purple-400 font-semibold text-xs">POLL</span>
          </div>
          <div className="flex items-center gap-1.5">
            {!isEnded && (
              <span className="text-yellow-400 font-mono text-xs">
                {formatTime(timeLeft)}
              </span>
            )}
            {isEnded && (
              <span className="text-gray-400 text-xs">Ended</span>
            )}
            {isBroadcaster && !isEnded && (
              <button
                onClick={() => setShowEndConfirm(true)}
                disabled={ending}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                title="End poll"
              >
                <XCircle className="w-3.5 h-3.5 text-red-400" />
              </button>
            )}
          </div>
        </div>

        {/* Question */}
        <h4 className="text-white font-semibold text-sm mb-2 line-clamp-2">{poll.question}</h4>

        {/* Options */}
        <div className="space-y-1.5">
          {poll.options.map((option, index) => {
            const votes = localVoteCounts[index] || 0;
            const percentage = localTotalVotes > 0 ? Math.round((votes / localTotalVotes) * 100) : 0;
            const isWinner = isEnded && votes === Math.max(...localVoteCounts);
            const isMyVote = votedOption === index;

            return (
              <button
                key={index}
                onClick={() => handleVote(index)}
                disabled={hasVoted || voting || isEnded}
                className={`w-full relative overflow-hidden rounded-lg transition-all ${
                  hasVoted || isEnded
                    ? 'cursor-default'
                    : 'hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
                } ${
                  isMyVote
                    ? 'border-2 border-purple-500'
                    : 'border border-white/10'
                }`}
              >
                {/* Background progress bar */}
                {showResults && (
                  <div
                    className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                      isWinner
                        ? 'bg-gradient-to-r from-purple-600/40 to-pink-600/40'
                        : 'bg-white/10'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                )}

                {/* Content */}
                <div className="relative flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {isMyVote && <Check className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />}
                    <span className={`text-sm font-medium truncate ${isWinner ? 'text-white' : 'text-gray-200'}`}>
                      {option}
                    </span>
                  </div>
                  {showResults && (
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      <span className="text-xs text-gray-400">{votes}</span>
                      <span className={`text-xs font-semibold ${isWinner ? 'text-purple-400' : 'text-gray-400'}`}>
                        {percentage}%
                      </span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Total votes */}
        <div className="mt-2 text-center text-xs text-gray-400">
          {localTotalVotes} vote{localTotalVotes !== 1 ? 's' : ''}
        </div>
      </div>
    </>
  );
}
