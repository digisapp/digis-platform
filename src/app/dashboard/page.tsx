'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { createClient } from '@/lib/supabase/client';
import { Calendar, Clock, Ticket, Phone, Video, MapPin, Play, Library, Search } from 'lucide-react';
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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 md:pl-20 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 md:pl-20 relative overflow-hidden">
      {/* Mobile Header with Logo */}
      <MobileHeader />

      {/* Animated Background Mesh - Desktop only */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[500px] h-[500px] -top-48 -left-48 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute w-[600px] h-[600px] top-1/3 -right-48 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute w-[400px] h-[400px] bottom-1/4 left-1/3 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="container mx-auto px-4 pt-14 md:pt-10 pb-24 md:pb-8 relative z-10">
        {/* Upcoming Events Section */}
        {loadingEvents ? (
          <div className="mb-8 backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-8">
            <div className="flex items-center justify-center">
              <LoadingSpinner size="md" />
              <span className="ml-3 text-gray-300">Loading your upcoming events...</span>
            </div>
          </div>
        ) : upcomingEvents.length > 0 && (
          <div className="mb-8 backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-cyan-400" />
                  Upcoming Events
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  {upcomingEvents.length} event{upcomingEvents.length > 1 ? 's' : ''} scheduled
                </p>
              </div>
              <button
                onClick={() => router.push('/shows/my-tickets')}
                className="text-sm text-cyan-400 hover:text-pink-400 transition-colors font-semibold"
              >
                View all →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingEvents.slice(0, 4).map((event) => (
                <div
                  key={event.id}
                  className="group relative cursor-pointer"
                  onClick={() => {
                    if (event.type === 'show') {
                      router.push(`/shows/${event.id.replace('show-', '')}`);
                    } else {
                      router.push('/calls/history');
                    }
                  }}
                >
                  {/* Neon Glow Effect */}
                  <div className={`absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-75 blur transition duration-500 ${
                    event.type === 'show'
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-500'
                      : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                  }`}></div>

                  <div className="relative backdrop-blur-xl bg-white/10 rounded-2xl p-4 border border-white/20 hover:border-cyan-500/50 transition-all">
                    {/* Event Type Badge */}
                    <div className="absolute top-4 right-4">
                      {event.type === 'show' ? (
                        <div className="bg-purple-500/30 text-purple-300 px-2 py-1 rounded-full flex items-center gap-1">
                          <Ticket className="w-3 h-3" />
                          <span className="text-xs font-semibold">Ticket</span>
                        </div>
                      ) : (
                        <div className="bg-blue-500/30 text-blue-300 px-2 py-1 rounded-full flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <span className="text-xs font-semibold">Call</span>
                        </div>
                      )}
                    </div>

                    {/* Event Icon */}
                    <div className="mb-3">
                      {event.type === 'show' ? (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/30 to-indigo-500/30 flex items-center justify-center">
                          <Video className="w-6 h-6 text-purple-400" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/30 to-cyan-500/30 flex items-center justify-center">
                          <Phone className="w-6 h-6 text-blue-400" />
                        </div>
                      )}
                    </div>

                    {/* Event Details */}
                    <h3 className="font-bold text-white mb-1 pr-20">{event.title}</h3>
                    <p className="text-sm text-gray-400 mb-3">with {event.creatorName}</p>

                    {/* Date & Time */}
                    <div className="flex flex-col gap-2 mb-3">
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>
                          {event.scheduledFor.toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>
                          {event.scheduledFor.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {event.duration && (
                          <span className="text-gray-400">({event.duration} min)</span>
                        )}
                      </div>
                    </div>

                    {/* Countdown */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/20">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm font-semibold text-cyan-400">
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
                        className="text-sm text-cyan-400 hover:text-pink-400 transition-colors font-semibold"
                      >
                        View details →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {upcomingEvents.length > 4 && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => router.push('/shows/my-tickets')}
                  className="text-sm text-gray-400 hover:text-cyan-400 transition-colors"
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
            className="group relative backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-6 hover:border-cyan-500/50 hover:scale-105 transition-all text-left"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl opacity-0 group-hover:opacity-75 blur transition duration-500"></div>
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 flex items-center justify-center mb-3">
                <Play className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Live Streams</h3>
              <p className="text-sm text-gray-400">Watch creators streaming now</p>
            </div>
          </button>

          <button
            onClick={() => router.push('/shows')}
            className="group relative backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-6 hover:border-purple-500/50 hover:scale-105 transition-all text-left"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl opacity-0 group-hover:opacity-75 blur transition duration-500"></div>
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/30 to-indigo-500/30 flex items-center justify-center mb-3">
                <Ticket className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Ticketed Shows</h3>
              <p className="text-sm text-gray-400">Exclusive live events & your tickets</p>
            </div>
          </button>

          <button
            onClick={() => router.push('/calls/history')}
            className="group relative backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-6 hover:border-pink-500/50 hover:scale-105 transition-all text-left"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl opacity-0 group-hover:opacity-75 blur transition duration-500"></div>
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500/30 to-rose-500/30 flex items-center justify-center mb-3">
                <Phone className="w-6 h-6 text-pink-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Video Calls</h3>
              <p className="text-sm text-gray-400">Book 1-on-1 calls with creators</p>
            </div>
          </button>

          <button
            onClick={() => router.push('/content/library')}
            className="group relative backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-6 hover:border-cyan-500/50 hover:scale-105 transition-all text-left"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-2xl opacity-0 group-hover:opacity-75 blur transition duration-500"></div>
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/30 to-teal-500/30 flex items-center justify-center mb-3">
                <Library className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">My Content</h3>
              <p className="text-sm text-gray-400">View purchased content</p>
            </div>
          </button>

          <button
            onClick={() => router.push('/explore')}
            className="group relative backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-6 hover:border-cyan-500/50 hover:scale-105 transition-all text-left"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-2xl opacity-0 group-hover:opacity-75 blur transition duration-500"></div>
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30 flex items-center justify-center mb-3">
                <Search className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Explore Creators</h3>
              <p className="text-sm text-gray-400">Find new creators to follow</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
