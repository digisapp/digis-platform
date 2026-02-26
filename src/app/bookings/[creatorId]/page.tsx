'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { GlassCard, GlassButton, LoadingSpinner } from '@/components/ui';
import { useToastContext } from '@/context/ToastContext';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Calendar, Clock, Video, Phone, ChevronLeft, ChevronRight } from 'lucide-react';

interface Slot {
  startTime: string;
  endTime: string;
  available: boolean;
}

interface ScheduleDay {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  timezone: string;
}

export default function BookCreatorPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const creatorId = params.creatorId as string;
  const { showError, showSuccess } = useToastContext();

  // Pre-select call type from query param (e.g., from stream viewer "Schedule Call" button)
  const preselectedCallType = searchParams.get('callType');
  const initialCallType = preselectedCallType === 'voice' ? 'voice' : 'video';

  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [callType, setCallType] = useState<'video' | 'voice'>(initialCallType);
  const [notes, setNotes] = useState('');
  const [rates, setRates] = useState<{ videoPerMinute: number; voicePerMinute: number } | null>(null);
  const [slotDuration, setSlotDuration] = useState(30);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [creator, setCreator] = useState<{ displayName: string } | null>(null);

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const res = await fetch(`/api/bookings/availability/${creatorId}`);
        const data = await res.json();
        if (res.ok) {
          setSchedule(data.schedule);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAvailability();

    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
  }, [creatorId]);

  useEffect(() => {
    if (selectedDate) fetchSlots(selectedDate);
  }, [selectedDate]);

  const fetchSlots = async (date: string) => {
    setLoadingSlots(true);
    setSelectedSlot(null);
    try {
      const res = await fetch(`/api/bookings/slots/${creatorId}?date=${date}`);
      const data = await res.json();
      if (res.ok) {
        setSlots(data.allSlots || []);
        setRates(data.rates);
        setSlotDuration(data.slotDurationMinutes || 30);
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleBook = async () => {
    if (!selectedSlot || !selectedDate) return;
    setBooking(true);
    try {
      const scheduledStart = `${selectedDate}T${selectedSlot.startTime}:00`;
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId,
          callType,
          scheduledStart,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(`Booked! ${data.charged} coins charged`);
        router.push('/dashboard');
      } else {
        showError(data.error || 'Failed to book');
      }
    } catch {
      showError('Failed to book');
    } finally {
      setBooking(false);
    }
  };

  const navigateDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const rate = rates
    ? (callType === 'voice' ? rates.voicePerMinute : rates.videoPerMinute)
    : 0;
  const totalCost = rate * slotDuration;

  const formatDateDisplay = (date: string) => {
    const d = new Date(date + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  // Available days from schedule
  const availableDays = new Set(schedule.map(s => s.dayOfWeek));

  return (
    <div className="min-h-screen bg-black text-white">
      <MobileHeader />
      <div className="max-w-md mx-auto p-4 pt-20 space-y-6">
        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner /></div>
        ) : schedule.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <p className="text-gray-400">This creator hasn&apos;t set up booking availability yet.</p>
          </GlassCard>
        ) : (
          <>
            {/* Call type */}
            <GlassCard className="p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Call Type</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => setCallType('video')}
                  className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 ${
                    callType === 'video' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-gray-400'
                  }`}
                >
                  <Video size={18} /> Video
                </button>
                <button
                  onClick={() => setCallType('voice')}
                  className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 ${
                    callType === 'voice' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/5 text-gray-400'
                  }`}
                >
                  <Phone size={18} /> Voice
                </button>
              </div>
            </GlassCard>

            {/* Date picker */}
            <GlassCard className="p-4">
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-white/10 rounded">
                  <ChevronLeft size={18} />
                </button>
                <span className="font-medium">{formatDateDisplay(selectedDate)}</span>
                <button onClick={() => navigateDate(1)} className="p-2 hover:bg-white/10 rounded">
                  <ChevronRight size={18} />
                </button>
              </div>
            </GlassCard>

            {/* Time slots */}
            <GlassCard className="p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Available Times</h3>
              {loadingSlots ? (
                <div className="flex justify-center py-4"><LoadingSpinner /></div>
              ) : slots.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No available slots on this day</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {slots.map((slot) => (
                    <button
                      key={slot.startTime}
                      onClick={() => slot.available && setSelectedSlot(slot)}
                      disabled={!slot.available}
                      className={`py-2 px-3 rounded-lg text-sm text-center ${
                        !slot.available
                          ? 'bg-white/5 text-gray-600 cursor-not-allowed line-through'
                          : selectedSlot?.startTime === slot.startTime
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : 'bg-white/5 text-white hover:bg-white/10'
                      }`}
                    >
                      {slot.startTime}
                    </button>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* Notes */}
            <GlassCard className="p-4">
              <label className="text-sm text-gray-400 block mb-1">Note (optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What would you like to discuss?"
                maxLength={200}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
              />
            </GlassCard>

            {/* Summary & book */}
            {selectedSlot && (
              <GlassCard className="p-4 space-y-3">
                <h3 className="font-semibold">Summary</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Date</span>
                  <span>{formatDateDisplay(selectedDate)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Time</span>
                  <span>{selectedSlot.startTime} - {selectedSlot.endTime}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Duration</span>
                  <span>{slotDuration} minutes</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Rate</span>
                  <span>{rate} coins/min</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-white/10 pt-2">
                  <span>Total</span>
                  <span className="text-yellow-400">{totalCost} coins</span>
                </div>

                <GlassButton onClick={handleBook} disabled={booking} className="w-full mt-3">
                  {booking ? 'Booking...' : `Book for ${totalCost} coins`}
                </GlassButton>
              </GlassCard>
            )}
          </>
        )}
      </div>
    </div>
  );
}
