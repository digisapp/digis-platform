'use client';

import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

type ShowType = 'performance' | 'class' | 'qna' | 'hangout' | 'date' | 'gaming' | 'workshop' | 'other';

interface Show {
  id: string;
  title: string;
  description: string | null;
  showType: ShowType;
  ticketPrice: number;
  maxTickets: number | null;
  ticketsSold: number;
  scheduledStart: string;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  coverImageUrl: string | null;
  totalRevenue: number;
  creator?: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

interface ShowCardProps {
  show: Show;
  isCreator?: boolean;
  onUpdate?: () => void;
}

const showTypeIcons: Record<ShowType, string> = {
  performance: '🎭',
  class: '🧘',
  qna: '💬',
  hangout: '💕',
  gaming: '🎮',
  workshop: '🎓',
  other: '🎪',
};

const showTypeLabels: Record<ShowType, string> = {
  performance: 'Performance',
  class: 'Class',
  qna: 'Q&A',
  hangout: 'Hangout',
  gaming: 'Gaming',
  workshop: 'Workshop',
  other: 'Other',
};

const statusColors = {
  scheduled: 'bg-blue-500/20 border-blue-500 text-blue-300',
  live: 'bg-red-500/20 border-red-500 text-red-300 animate-pulse',
  ended: 'bg-gray-500/20 border-gray-500 text-gray-300',
  cancelled: 'bg-orange-500/20 border-orange-500 text-orange-300',
};

export function ShowCard({ show, isCreator, onUpdate }: ShowCardProps) {
  const router = useRouter();

  const handleClick = () => {
    if (isCreator) {
      router.push(`/creator/shows/${show.id}`);
    } else {
      router.push(`/shows/${show.id}`);
    }
  };

  const scheduledDate = new Date(show.scheduledStart);
  const isPast = scheduledDate < new Date();
  const isSoldOut = show.maxTickets !== null && show.ticketsSold >= show.maxTickets;

  // Calculate time until show
  const getTimeDisplay = () => {
    if (show.status === 'live') return 'LIVE NOW';
    if (show.status === 'ended') return 'Ended';
    if (show.status === 'cancelled') return 'Cancelled';

    if (isPast) return 'Starting soon';

    return `Starts ${formatDistanceToNow(scheduledDate, { addSuffix: true })}`;
  };

  return (
    <div
      onClick={handleClick}
      className="group cursor-pointer bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 hover:border-digis-cyan/50 overflow-hidden transition-all hover:scale-105"
    >
      {/* Cover Image */}
      <div className="relative aspect-video bg-gradient-to-br from-digis-cyan/20 to-digis-pink/20">
        {show.coverImageUrl ? (
          <img
            src={show.coverImageUrl}
            alt={show.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">
            {showTypeIcons[show.showType]}
          </div>
        )}

        {/* Status Badge */}
        <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold border-2 ${statusColors[show.status]}`}>
          {show.status === 'live' && '🔴 '}{show.status.toUpperCase()}
        </div>

        {/* Sold Out Badge */}
        {isSoldOut && show.status === 'scheduled' && (
          <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold bg-yellow-500 text-black">
            🎫 SOLD OUT
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Show Type */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-digis-cyan font-medium">
            {showTypeIcons[show.showType]} {showTypeLabels[show.showType]}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-digis-cyan transition-colors">
          {show.title}
        </h3>

        {/* Creator (if not creator view) */}
        {!isCreator && show.creator && (
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink overflow-hidden">
              {show.creator.avatarUrl ? (
                <img
                  src={show.creator.avatarUrl}
                  alt={show.creator.displayName || show.creator.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-white font-bold">
                  {(show.creator.displayName || show.creator.username)[0].toUpperCase()}
                </div>
              )}
            </div>
            <span className="text-sm text-gray-400">
              {show.creator.displayName || show.creator.username}
            </span>
          </div>
        )}

        {/* Time */}
        <div className="text-sm text-gray-400 mb-3">
          ⏰ {getTimeDisplay()}
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <div className="flex items-center gap-4">
            {/* Ticket Price */}
            <div className="flex items-center gap-1">
              <span className="text-yellow-400 font-bold text-lg">{show.ticketPrice}</span>
              <span className="text-xs text-gray-400">coins</span>
            </div>

            {/* Tickets Sold */}
            <div className="text-sm text-gray-400">
              🎫 {show.ticketsSold}
              {show.maxTickets && `/${show.maxTickets}`}
            </div>
          </div>

          {/* Revenue (Creator only) */}
          {isCreator && (
            <div className="text-sm">
              <span className="text-green-400 font-bold">{show.totalRevenue}</span>
              <span className="text-gray-400"> coins</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
