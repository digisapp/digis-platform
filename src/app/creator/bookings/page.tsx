'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard, GlassButton, LoadingSpinner } from '@/components/ui';
import { useToastContext } from '@/context/ToastContext';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Calendar, Clock, Video, Phone, Settings, X } from 'lucide-react';

interface Booking {
  id: string;
  callType: 'video' | 'voice';
  scheduledStart: string;
  scheduledEnd: string;
  status: 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  coinsCharged: number;
  notes: string | null;
  fan: { id: string; displayName: string; username: string; avatarUrl: string | null };
  creator: { id: string; displayName: string; username: string; avatarUrl: string | null };
}

export default function CreatorBookingsPage() {
  const router = useRouter();
  const { showError, showSuccess } = useToastContext();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await fetch('/api/bookings?role=creator');
      const data = await res.json();
      if (res.ok) setBookings(data.bookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId: string) => {
    if (!confirm('Cancel this booking? The fan will be refunded based on the cancellation policy.')) return;
    setCancelling(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled by creator' }),
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(`Booking cancelled. Refund: ${data.refundAmount} coins (${data.refundPercent}%)`);
        fetchBookings();
      } else {
        showError(data.error || 'Failed to cancel');
      }
    } catch {
      showError('Failed to cancel booking');
    } finally {
      setCancelling(null);
    }
  };

  const handleStartCall = async (bookingId: string) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/start`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        router.push(`/calls/${data.call.id}`);
      } else {
        showError(data.error || 'Cannot start call yet');
      }
    } catch {
      showError('Failed to start call');
    }
  };

  const upcoming = bookings.filter(b => b.status === 'confirmed' && new Date(b.scheduledStart) > new Date());
  const past = bookings.filter(b => b.status !== 'confirmed' || new Date(b.scheduledStart) <= new Date());

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-400';
      case 'completed': return 'text-blue-400';
      case 'cancelled': return 'text-red-400';
      case 'no_show': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <MobileHeader />
      <div className="max-w-2xl mx-auto p-4 pt-20 space-y-6">
        {/* Quick actions */}
        <GlassButton
          onClick={() => router.push('/creator/bookings/availability')}
          className="w-full flex items-center justify-center gap-2"
        >
          <Settings size={16} /> Set Availability
        </GlassButton>

        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner /></div>
        ) : (
          <>
            {/* Upcoming */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Upcoming ({upcoming.length})</h2>
              {upcoming.length === 0 ? (
                <GlassCard className="p-6 text-center">
                  <p className="text-gray-400">No upcoming bookings</p>
                </GlassCard>
              ) : (
                <div className="space-y-3">
                  {upcoming.map((booking) => {
                    const minutesUntil = (new Date(booking.scheduledStart).getTime() - Date.now()) / (1000 * 60);
                    const canStart = minutesUntil <= 5 && minutesUntil >= -30;
                    return (
                      <GlassCard key={booking.id} className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                            {booking.fan.avatarUrl ? (
                              <img src={booking.fan.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-500">
                                {booking.fan.displayName?.[0] || '?'}
                              </div>
                            )}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{booking.fan.displayName}</span>
                              {booking.callType === 'video' ? <Video size={14} className="text-blue-400" /> : <Phone size={14} className="text-green-400" />}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                              <Calendar size={12} /> {formatDate(booking.scheduledStart)}
                              <Clock size={12} /> {formatTime(booking.scheduledStart)}
                            </div>
                            <div className="text-sm text-yellow-400 mt-1">{booking.coinsCharged} coins</div>
                            {booking.notes && (
                              <p className="text-xs text-gray-500 mt-1 italic">&quot;{booking.notes}&quot;</p>
                            )}

                            <div className="flex gap-2 mt-3">
                              {canStart && (
                                <GlassButton
                                  onClick={() => handleStartCall(booking.id)}
                                  className="text-xs px-3 py-1"
                                >
                                  Start Call
                                </GlassButton>
                              )}
                              <button
                                onClick={() => handleCancel(booking.id)}
                                disabled={cancelling === booking.id}
                                className="text-xs px-3 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 flex items-center gap-1"
                              >
                                <X size={12} /> {cancelling === booking.id ? '...' : 'Cancel'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </GlassCard>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Past */}
            {past.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3">Past Bookings</h2>
                <div className="space-y-2">
                  {past.slice(0, 20).map((booking) => (
                    <GlassCard key={booking.id} className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                          {booking.fan.avatarUrl ? (
                            <img src={booking.fan.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                              {booking.fan.displayName?.[0]}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-medium">{booking.fan.displayName}</span>
                          <span className="text-xs text-gray-500 ml-2">{formatDate(booking.scheduledStart)}</span>
                        </div>
                        <span className={`text-xs capitalize ${statusColor(booking.status)}`}>
                          {booking.status}
                        </span>
                        <span className="text-xs text-yellow-400">{booking.coinsCharged}</span>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
