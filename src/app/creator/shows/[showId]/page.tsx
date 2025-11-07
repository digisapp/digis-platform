'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { ShowControls } from '@/components/shows/ShowControls';
import { AttendeeList } from '@/components/shows/AttendeeList';

interface Show {
  id: string;
  title: string;
  description: string | null;
  showType: string;
  ticketPrice: number;
  maxTickets: number | null;
  ticketsSold: number;
  scheduledStart: string;
  scheduledEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  durationMinutes: number;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  coverImageUrl: string | null;
  totalRevenue: number;
  roomName: string | null;
}

interface Stats {
  ticketsSold: number;
  totalRevenue: number;
  attendees: number;
  checkedIn: number;
  creatorEarnings: number;
}

export default function ShowManagementPage() {
  const router = useRouter();
  const params = useParams();
  const showId = params?.showId as string;

  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState<Show | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (showId) {
      checkAuth();
      fetchShow();
      fetchStats();
    }
  }, [showId]);

  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/');
      return;
    }

    const response = await fetch('/api/user/profile');
    const data = await response.json();

    if (data.user?.role !== 'creator') {
      router.push('/dashboard');
      return;
    }

    setLoading(false);
  };

  const fetchShow = async () => {
    try {
      const response = await fetch(`/api/shows/${showId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch show');
      }

      setShow(data.show);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load show');
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/shows/${showId}/stats`);
      const data = await response.json();

      if (response.ok) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleShowUpdate = () => {
    fetchShow();
    fetchStats();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !show) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-2">Show Not Found</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <GlassButton
            variant="gradient"
            onClick={() => router.push('/creator/shows')}
          >
            Back to Shows
          </GlassButton>
        </div>
      </div>
    );
  }

  const scheduledDate = new Date(show.scheduledStart);
  const isSoldOut = show.maxTickets !== null && show.ticketsSold >= show.maxTickets;
  const ticketsSoldPercent = show.maxTickets
    ? Math.round((show.ticketsSold / show.maxTickets) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push('/creator/shows')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <span className="text-xl">←</span>
          <span>Back to Shows</span>
        </button>

        {/* Header */}
        <div className="mb-8">
          {/* Cover Image */}
          {show.coverImageUrl && (
            <div className="aspect-video rounded-2xl overflow-hidden mb-6 border-2 border-white/10">
              <img
                src={show.coverImageUrl}
                alt={show.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-3xl md:text-4xl font-bold text-white">{show.title}</h1>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    show.status === 'live'
                      ? 'bg-red-500 text-white animate-pulse'
                      : show.status === 'scheduled'
                      ? 'bg-blue-500/20 border border-blue-500 text-blue-300'
                      : show.status === 'ended'
                      ? 'bg-gray-500/20 border border-gray-500 text-gray-300'
                      : 'bg-orange-500/20 border border-orange-500 text-orange-300'
                  }`}
                >
                  {show.status === 'live' && '🔴 '}
                  {show.status.toUpperCase()}
                </span>
              </div>

              {show.description && (
                <p className="text-gray-400 mb-4">{show.description}</p>
              )}

              <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <span>📅</span>
                  <span>{format(scheduledDate, 'PPP')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>⏰</span>
                  <span>{format(scheduledDate, 'p')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>⏱️</span>
                  <span>{show.durationMinutes} minutes</span>
                </div>
              </div>
            </div>

            {/* Show Controls */}
            <ShowControls show={show} onUpdate={handleShowUpdate} />
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-md rounded-xl border border-blue-500/30 p-5 text-center">
              <div className="text-3xl mb-2">🎫</div>
              <div className="text-2xl font-bold text-white mb-1">{stats.ticketsSold}</div>
              <div className="text-xs text-gray-400">Tickets Sold</div>
            </div>

            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-md rounded-xl border border-green-500/30 p-5 text-center">
              <div className="text-3xl mb-2">💰</div>
              <div className="text-2xl font-bold text-white mb-1">{stats.totalRevenue}</div>
              <div className="text-xs text-gray-400">Total Revenue</div>
            </div>

            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-xl border border-purple-500/30 p-5 text-center">
              <div className="text-3xl mb-2">👤</div>
              <div className="text-2xl font-bold text-white mb-1">{stats.checkedIn}</div>
              <div className="text-xs text-gray-400">Checked In</div>
            </div>

            <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-md rounded-xl border border-yellow-500/30 p-5 text-center">
              <div className="text-3xl mb-2">🌟</div>
              <div className="text-2xl font-bold text-white mb-1">{stats.creatorEarnings}</div>
              <div className="text-xs text-gray-400">Your Earnings (100%)</div>
            </div>
          </div>
        )}

        {/* Ticket Sales Progress */}
        <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-white">Ticket Sales</h3>
            {isSoldOut && (
              <span className="px-3 py-1 bg-yellow-500 text-black text-xs font-bold rounded-full">
                SOLD OUT
              </span>
            )}
          </div>

          {show.maxTickets ? (
            <>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-400">{show.ticketsSold} / {show.maxTickets} sold</span>
                <span className="text-white font-bold">{ticketsSoldPercent}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-digis-cyan to-digis-pink h-full transition-all"
                  style={{ width: `${ticketsSoldPercent}%` }}
                />
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-400">
              {show.ticketsSold} tickets sold • Unlimited capacity
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Revenue per ticket:</span>
              <span className="text-white font-bold">{show.ticketPrice} coins</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-gray-400">Your earnings per ticket (100%):</span>
              <span className="text-green-400 font-bold">{show.ticketPrice} coins</span>
            </div>
          </div>
        </div>

        {/* Attendee List */}
        <AttendeeList showId={showId} />
      </div>
    </div>
  );
}
