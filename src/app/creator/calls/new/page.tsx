'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Phone, Clock, DollarSign, ToggleLeft, ToggleRight, ArrowLeft } from 'lucide-react';

export default function ScheduleCallPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    callRatePerMinute: 10,
    minimumCallDuration: 5,
    isAvailableForCalls: true,
    autoAcceptCalls: false,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/creator/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSettings({
            callRatePerMinute: data.settings.callRatePerMinute || 10,
            minimumCallDuration: data.settings.minimumCallDuration || 5,
            isAvailableForCalls: data.settings.isAvailableForCalls ?? true,
            autoAcceptCalls: data.settings.autoAcceptCalls || false,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/creator/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        alert('Call settings saved successfully!');
        router.push('/creator/dashboard');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
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
      <div className="container mx-auto px-4 pt-0 md:pt-10 pb-20 md:pb-8 max-w-7xl">
        <div className="space-y-6">
          {/* Availability Toggle */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/20 rounded-xl">
                  <Phone className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Available for Calls</h3>
                  <p className="text-sm text-gray-600">Allow fans to request video calls with you</p>
                </div>
              </div>
              <button
                onClick={() => setSettings({ ...settings, isAvailableForCalls: !settings.isAvailableForCalls })}
                className="p-2"
              >
                {settings.isAvailableForCalls ? (
                  <ToggleRight className="w-12 h-12 text-green-500" />
                ) : (
                  <ToggleLeft className="w-12 h-12 text-gray-400" />
                )}
              </button>
            </div>
          </GlassCard>

          {/* Rate Per Minute */}
          <GlassCard className="p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-amber-500/20 rounded-xl">
                <DollarSign className="w-6 h-6 text-amber-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Rate Per Minute</h3>
                <p className="text-sm text-gray-600 mb-4">How many coins per minute of call time</p>

                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={settings.callRatePerMinute}
                    onChange={(e) => setSettings({ ...settings, callRatePerMinute: parseInt(e.target.value) || 1 })}
                    className="w-32 px-4 py-3 bg-white/60 border border-purple-200 rounded-xl text-gray-800 font-semibold text-center focus:outline-none focus:border-digis-cyan transition-colors"
                  />
                  <span className="text-gray-600">coins/minute</span>
                </div>

                <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Example:</strong> A 10-minute call would cost {settings.callRatePerMinute * 10} coins
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Minimum Duration */}
          <GlassCard className="p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <Clock className="w-6 h-6 text-purple-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Minimum Call Duration</h3>
                <p className="text-sm text-gray-600 mb-4">Shortest call length you'll accept</p>

                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={settings.minimumCallDuration}
                    onChange={(e) => setSettings({ ...settings, minimumCallDuration: parseInt(e.target.value) || 1 })}
                    className="w-32 px-4 py-3 bg-white/60 border border-purple-200 rounded-xl text-gray-800 font-semibold text-center focus:outline-none focus:border-digis-cyan transition-colors"
                  />
                  <span className="text-gray-600">minutes</span>
                </div>

                <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-sm text-amber-700">
                    <strong>Minimum charge:</strong> {settings.callRatePerMinute * settings.minimumCallDuration} coins will be held when a fan requests a call
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Auto Accept */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/20 rounded-xl">
                  <Phone className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Auto-Accept Calls</h3>
                  <p className="text-sm text-gray-600">Automatically accept all call requests</p>
                </div>
              </div>
              <button
                onClick={() => setSettings({ ...settings, autoAcceptCalls: !settings.autoAcceptCalls })}
                className="p-2"
              >
                {settings.autoAcceptCalls ? (
                  <ToggleRight className="w-12 h-12 text-blue-500" />
                ) : (
                  <ToggleLeft className="w-12 h-12 text-gray-400" />
                )}
              </button>
            </div>

            {settings.autoAcceptCalls && (
              <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-sm text-yellow-700">
                  ⚠️ With auto-accept enabled, all call requests will be immediately accepted. Make sure you're ready to take calls!
                </p>
              </div>
            )}
          </GlassCard>

          {/* Info Card */}
          <GlassCard className="p-6 bg-gradient-to-br from-digis-cyan/10 to-purple-500/10 border-digis-cyan/30">
            <div className="flex items-start gap-4">
              <span className="text-3xl">💡</span>
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">How Video Calls Work</h4>
                <ul className="text-sm text-gray-700 space-y-2">
                  <li>• Fans request calls from your profile</li>
                  <li>• Coins are held when they request (not charged yet)</li>
                  <li>• You can accept or reject requests</li>
                  <li>• When the call ends, actual cost is calculated and charged</li>
                  <li>• You earn 100% of call earnings (no platform fee for calls)</li>
                </ul>
              </div>
            </div>
          </GlassCard>

          {/* Save Button */}
          <div className="flex gap-4">
            <GlassButton
              variant="ghost"
              onClick={() => router.back()}
              className="flex-1"
            >
              Cancel
            </GlassButton>
            <GlassButton
              variant="gradient"
              onClick={handleSave}
              disabled={saving}
              shimmer
              className="flex-1"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </GlassButton>
          </div>
        </div>
      </div>
    </div>
  );
}
