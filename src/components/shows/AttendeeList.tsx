'use client';

import { useEffect, useState } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { format } from 'date-fns';

interface Attendee {
  id: string;
  userId: string;
  ticketNumber: number;
  coinsPaid: number;
  purchasedAt: string;
  checkInTime: string | null;
  isValid: boolean;
  user: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

interface AttendeeListProps {
  showId: string;
}

export function AttendeeList({ showId }: AttendeeListProps) {
  const [loading, setLoading] = useState(true);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [filter, setFilter] = useState<'all' | 'checked-in' | 'not-checked-in'>('all');

  useEffect(() => {
    fetchAttendees();
  }, [showId]);

  const fetchAttendees = async () => {
    try {
      const response = await fetch(`/api/shows/${showId}/attendees`);
      const data = await response.json();

      if (response.ok) {
        setAttendees(data.attendees || []);
      }
    } catch (err) {
      console.error('Error fetching attendees:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAttendees = attendees.filter((attendee) => {
    if (filter === 'checked-in') return attendee.checkInTime !== null;
    if (filter === 'not-checked-in') return attendee.checkInTime === null;
    return true;
  });

  const checkedInCount = attendees.filter((a) => a.checkInTime !== null).length;

  if (loading) {
    return (
      <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-12 text-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white">Ticket Holders</h3>
          <p className="text-sm text-gray-400">
            {attendees.length} ticket{attendees.length !== 1 ? 's' : ''} sold • {checkedInCount} checked in
          </p>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              filter === 'all'
                ? 'bg-digis-cyan text-black'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('checked-in')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              filter === 'checked-in'
                ? 'bg-green-500 text-black'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            Checked In
          </button>
          <button
            onClick={() => setFilter('not-checked-in')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              filter === 'not-checked-in'
                ? 'bg-gray-500 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            Not Checked In
          </button>
        </div>
      </div>

      {filteredAttendees.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">🎫</div>
          <p className="text-gray-400 text-sm">
            {filter === 'all'
              ? 'No tickets sold yet'
              : filter === 'checked-in'
              ? 'No attendees have checked in yet'
              : 'All ticket holders have checked in'}
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredAttendees.map((attendee) => (
            <div
              key={attendee.id}
              className="flex items-center gap-4 bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors"
            >
              {/* Ticket Number */}
              <div className="text-sm font-bold text-gray-500 w-12">
                #{attendee.ticketNumber}
              </div>

              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink overflow-hidden flex-shrink-0">
                {attendee.user.avatarUrl ? (
                  <img
                    src={attendee.user.avatarUrl}
                    alt={attendee.user.displayName || attendee.user.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold">
                    {(attendee.user.displayName || attendee.user.username)?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white truncate">
                  {attendee.user.displayName || attendee.user.username}
                </div>
                <div className="text-xs text-gray-400">
                  Purchased {format(new Date(attendee.purchasedAt), 'MMM d, yyyy')}
                </div>
              </div>

              {/* Check-in Status */}
              {attendee.checkInTime ? (
                <div className="flex items-center gap-1 text-green-400 text-xs">
                  <span>✓</span>
                  <span>Checked in</span>
                </div>
              ) : (
                <div className="text-gray-500 text-xs">
                  Not checked in
                </div>
              )}

              {/* Coins Paid */}
              <div className="text-right">
                <div className="text-sm font-bold text-yellow-400">
                  {attendee.coinsPaid}
                </div>
                <div className="text-xs text-gray-400">coins</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
