'use client';

import { useEffect, useState } from 'react';
import { GlassCard, GlassButton, LoadingSpinner } from '@/components/ui';
import { useToastContext } from '@/context/ToastContext';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Save, Plus, Trash2 } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface Availability {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  isActive: boolean;
  timezone: string;
}

interface Override {
  id: string;
  date: string;
  isBlocked: boolean;
  customStartTime: string | null;
  customEndTime: string | null;
  reason: string | null;
}

export default function AvailabilityPage() {
  const { showError, showSuccess } = useToastContext();
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);

  // New override form
  const [overrideDate, setOverrideDate] = useState('');
  const [overrideBlocked, setOverrideBlocked] = useState(true);
  const [overrideReason, setOverrideReason] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/bookings/availability');
      const data = await res.json();
      if (res.ok) setAvailability(data.availability);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDay = async (dayOfWeek: number, startTime: string, endTime: string, slotDuration: number, isActive: boolean) => {
    setSaving(dayOfWeek);
    try {
      const res = await fetch('/api/bookings/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayOfWeek,
          startTime,
          endTime,
          slotDurationMinutes: slotDuration,
          isActive,
        }),
      });
      if (res.ok) {
        showSuccess(`${DAYS[dayOfWeek]} saved`);
        fetchData();
      } else {
        const data = await res.json();
        showError(data.error || 'Failed to save');
      }
    } catch {
      showError('Failed to save');
    } finally {
      setSaving(null);
    }
  };

  const handleAddOverride = async () => {
    if (!overrideDate) {
      showError('Select a date');
      return;
    }
    try {
      const res = await fetch('/api/bookings/availability/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: overrideDate,
          isBlocked: overrideBlocked,
          reason: overrideReason || null,
        }),
      });
      if (res.ok) {
        showSuccess('Override added');
        setOverrideDate('');
        setOverrideReason('');
      } else {
        const data = await res.json();
        showError(data.error || 'Failed to add override');
      }
    } catch {
      showError('Failed to add override');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <MobileHeader />
      <div className="max-w-2xl mx-auto p-4 pt-20 space-y-6">
        {/* Weekly schedule */}
        <GlassCard className="p-4 space-y-4">
          <h2 className="font-semibold text-lg">Weekly Schedule</h2>
          <p className="text-sm text-gray-400">Set your available hours for each day</p>

          {DAYS.map((dayName, dayIndex) => {
            const dayAvail = availability.find(a => a.dayOfWeek === dayIndex);
            return (
              <DayRow
                key={dayIndex}
                dayName={dayName}
                dayIndex={dayIndex}
                initial={dayAvail}
                saving={saving === dayIndex}
                onSave={handleSaveDay}
              />
            );
          })}
        </GlassCard>

        {/* Date overrides */}
        <GlassCard className="p-4 space-y-4">
          <h2 className="font-semibold text-lg">Block Specific Dates</h2>
          <p className="text-sm text-gray-400">Mark days off or adjust hours for specific dates</p>

          <div className="flex gap-2">
            <input
              type="date"
              value={overrideDate}
              onChange={(e) => setOverrideDate(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
            />
            <input
              type="text"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Reason (optional)"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
            />
            <GlassButton onClick={handleAddOverride} className="px-4">
              <Plus size={16} />
            </GlassButton>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function DayRow({
  dayName, dayIndex, initial, saving, onSave,
}: {
  dayName: string;
  dayIndex: number;
  initial?: Availability;
  saving: boolean;
  onSave: (day: number, start: string, end: string, slot: number, active: boolean) => void;
}) {
  const [isActive, setIsActive] = useState(initial?.isActive ?? false);
  const [startTime, setStartTime] = useState(initial?.startTime ?? '09:00');
  const [endTime, setEndTime] = useState(initial?.endTime ?? '17:00');
  const [slotDuration, setSlotDuration] = useState(initial?.slotDurationMinutes ?? 30);

  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      <div className="w-20">
        <button
          onClick={() => setIsActive(!isActive)}
          className={`text-sm font-medium ${isActive ? 'text-green-400' : 'text-gray-500'}`}
        >
          {dayName.slice(0, 3)}
        </button>
      </div>

      {isActive ? (
        <>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white w-24"
          />
          <span className="text-gray-500">-</span>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white w-24"
          />
          <select
            value={slotDuration}
            onChange={(e) => setSlotDuration(parseInt(e.target.value))}
            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white"
          >
            <option value={15}>15m</option>
            <option value={30}>30m</option>
            <option value={45}>45m</option>
            <option value={60}>60m</option>
          </select>
        </>
      ) : (
        <span className="text-gray-500 text-sm">Unavailable</span>
      )}

      <button
        onClick={() => onSave(dayIndex, startTime, endTime, slotDuration, isActive)}
        disabled={saving}
        className="ml-auto text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20"
      >
        {saving ? '...' : <Save size={14} />}
      </button>
    </div>
  );
}
