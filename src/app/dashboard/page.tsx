'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { createClient } from '@/lib/supabase/client';
import { Calendar, Clock, Ticket, Phone, Video, MapPin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface UpcomingEvent {
  id: string;
  type: 'show' | 'call';
  title: string;
  creatorName: string;
  creatorUsername?: string;
  scheduledFor: Date;
  location?: string;
  ticketPrice?: number;
  duration?: number;
  status?: string;
}

export default function FanDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchUpcomingEvents();
  }, []);

  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/');
      return;
    }

    setLoading(false);
  };

  const fetchUpcomingEvents = async () => {
    try {
      setLoadingEvents(true);
      const events: UpcomingEvent[] = [];

      // Fetch purchased tickets for upcoming shows
      const ticketsRes = await fetch('/api/shows/my-tickets');
      if (ticketsRes.ok) {
        const ticketsData = await ticketsRes.json();
        (ticketsData.data || [])
          .filter((ticket: any) => {
            const showDate = new Date(ticket.show?.scheduledFor);
            return showDate > new Date() && ticket.show?.status !== 'ended';
          })
          .forEach((ticket: any) => {
            events.push({
              id: `show-${ticket.show.id}`,
              type: 'show',
              title: ticket.show.title,
              creatorName: ticket.show.creatorName || 'Creator',
              creatorUsername: ticket.show.creatorUsername,
              scheduledFor: new Date(ticket.show.scheduledFor),
              ticketPrice: ticket.show.ticketPrice,
              status: ticket.show.status,
            });
          });
      }

      // Fetch scheduled calls
      const callsRes = await fetch('/api/calls/history?status=pending&limit=50');
      if (callsRes.ok) {
        const callsData = await callsRes.json();
        (callsData.data || [])
          .filter((call: any) => {
            if (!call.scheduledFor) return false;
            const callDate = new Date(call.scheduledFor);
            return callDate > new Date();
          })
          .forEach((call: any) => {
            events.push({
              id: `call-${call.id}`,
              type: 'call',
              title: `Video Call with ${call.creatorName || 'Creator'}`,
              creatorName: call.creatorName || 'Creator',
              creatorUsername: call.creatorUsername,
              scheduledFor: new Date(call.scheduledFor),
              duration: call.duration,
              status: call.status,
            });
          });
      }

      // Sort by date (soonest first)
      events.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
      setUpcomingEvents(events);
    } catch (err) {
      console.error('Error fetching upcoming events:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  const getTimeUntilEvent = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `in ${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `in ${hours} hour${hours > 1 ? 's' : ''}`;
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes > 0) return `in ${minutes} min${minutes > 1 ? 's' : ''}`;
    return 'Starting soon!';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-pastel-gradient flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pastel-gradient">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-digis-purple via-digis-pink to-digis-cyan bg-clip-text text-transparent mb-2">Welcome to Digis 👋</h1>
          <p className="text-gray-600 font-medium">Explore live streams, connect with creators, and more</p>
        </div>

        {/* Upcoming Events Section */}
        {loadingEvents ? (
          <div className="mb-8 glass rounded-2xl border border-purple-200 p-8 shadow-fun">
            <div className="flex items-center justify-center">
              <LoadingSpinner size="md" />
              <span className="ml-3 text-gray-600">Loading your upcoming events...</span>
            </div>
          </div>
        ) : upcomingEvents.length > 0 && (
          <div className="mb-8 glass rounded-2xl border border-purple-200 p-6 shadow-fun">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-digis-cyan" />
                  Upcoming Events
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {upcomingEvents.length} event{upcomingEvents.length > 1 ? 's' : ''} scheduled
                </p>
              </div>
              <button
                onClick={() => router.push('/shows/my-tickets')}
                className="text-sm text-digis-cyan hover:text-digis-pink transition-colors font-semibold"
              >
                View all →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingEvents.slice(0, 4).map((event) => (
                <div
                  key={event.id}
                  className="relative bg-white/60 rounded-xl p-4 border border-purple-100 hover:border-digis-cyan hover:bg-white/80 transition-all cursor-pointer group"
                  onClick={() => {
                    if (event.type === 'show') {
                      router.push(`/shows/${event.id.replace('show-', '')}`);
                    } else {
                      router.push('/calls/history');
                    }
                  }}
                >
                  {/* Event Type Badge */}
                  <div className="absolute top-4 right-4">
                    {event.type === 'show' ? (
                      <div className="bg-purple-500/20 text-purple-600 px-2 py-1 rounded-full flex items-center gap-1">
                        <Ticket className="w-3 h-3" />
                        <span className="text-xs font-semibold">Ticket</span>
                      </div>
                    ) : (
                      <div className="bg-blue-500/20 text-blue-600 px-2 py-1 rounded-full flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        <span className="text-xs font-semibold">Call</span>
                      </div>
                    )}
                  </div>

                  {/* Event Icon */}
                  <div className="mb-3">
                    {event.type === 'show' ? (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center">
                        <Video className="w-6 h-6 text-purple-500" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                        <Phone className="w-6 h-6 text-blue-500" />
                      </div>
                    )}
                  </div>

                  {/* Event Details */}
                  <h3 className="font-bold text-gray-800 mb-1 pr-20">{event.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">with {event.creatorName}</p>

                  {/* Date & Time */}
                  <div className="flex flex-col gap-2 mb-3">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Calendar className="w-4 h-4 text-gray-600" />
                      <span>
                        {event.scheduledFor.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Clock className="w-4 h-4 text-gray-600" />
                      <span>
                        {event.scheduledFor.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {event.duration && (
                        <span className="text-gray-600">({event.duration} min)</span>
                      )}
                    </div>
                  </div>

                  {/* Countdown */}
                  <div className="flex items-center justify-between pt-3 border-t border-purple-100">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-digis-cyan" />
                      <span className="text-sm font-semibold text-digis-cyan">
                        {getTimeUntilEvent(event.scheduledFor)}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (event.type === 'show') {
                          router.push(`/shows/${event.id.replace('show-', '')}`);
                        } else {
                          router.push('/calls/history');
                        }
                      }}
                      className="text-sm text-digis-cyan hover:text-digis-pink transition-colors font-semibold"
                    >
                      View details →
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {upcomingEvents.length > 4 && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => router.push('/shows/my-tickets')}
                  className="text-sm text-gray-600 hover:text-digis-cyan transition-colors"
                >
                  + {upcomingEvents.length - 4} more upcoming events
                </button>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => router.push('/live')}
            className="glass rounded-2xl border-2 border-cyan-200 p-6 hover:border-digis-cyan hover:scale-105 transition-all text-left shadow-fun"
          >
            <div className="text-4xl mb-3">🎥</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Live Streams</h3>
            <p className="text-sm text-gray-600">Watch creators streaming now</p>
          </button>

          <button
            onClick={() => router.push('/shows')}
            className="bg-gradient-to-br from-purple-500/20 to-indigo-500/20 backdrop-blur-md rounded-2xl border-2 border-purple-500 p-6 hover:scale-105 transition-all text-left shadow-fun"
          >
            <div className="text-4xl mb-3">🎟️</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Ticketed Shows</h3>
            <p className="text-sm text-gray-600">Exclusive live events</p>
          </button>

          <button
            onClick={() => router.push('/shows/my-tickets')}
            className="glass rounded-2xl border-2 border-purple-200 p-6 hover:border-purple-500 hover:scale-105 transition-all text-left shadow-fun"
          >
            <div className="text-4xl mb-3">🎫</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">My Tickets</h3>
            <p className="text-sm text-gray-600">View your purchased tickets</p>
          </button>

          <button
            onClick={() => router.push('/calls/history')}
            className="glass rounded-2xl border-2 border-pink-200 p-6 hover:border-digis-pink hover:scale-105 transition-all text-left shadow-fun"
          >
            <div className="text-4xl mb-3">📞</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Video Calls</h3>
            <p className="text-sm text-gray-600">Book 1-on-1 calls with creators</p>
          </button>

          <button
            onClick={() => router.push('/content/library')}
            className="glass rounded-2xl border-2 border-cyan-200 p-6 hover:border-digis-cyan hover:scale-105 transition-all text-left shadow-fun"
          >
            <div className="text-4xl mb-3">📚</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">My Library</h3>
            <p className="text-sm text-gray-600">View purchased content</p>
          </button>

          <button
            onClick={() => router.push('/explore')}
            className="glass rounded-2xl border-2 border-purple-200 p-6 hover:border-digis-cyan hover:scale-105 transition-all text-left shadow-fun"
          >
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Explore Creators</h3>
            <p className="text-sm text-gray-600">Find new creators to follow</p>
          </button>
        </div>
      </div>
    </div>
  );
}
