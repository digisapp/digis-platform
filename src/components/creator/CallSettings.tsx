'use client';

import { useState, useEffect } from 'react';
import { GlassCard, GlassInput, GlassButton, LoadingSpinner } from '@/components/ui';
import { Phone, Clock, DollarSign, CheckCircle, XCircle } from 'lucide-react';

interface CallSettingsData {
  callRatePerMinute: number;
  minimumCallDuration: number;
  isAvailableForCalls: boolean;
  autoAcceptCalls: boolean;
}

export function CallSettings() {
  const [settings, setSettings] = useState<CallSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/creator/settings');
      const data = await response.json();

      if (response.ok) {
        setSettings(data.settings);
      } else {
        setError(data.error || 'Failed to load settings');
      }
    } catch (err) {
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const response = await fetch('/api/creator/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (response.ok) {
        setSettings(data.settings);
        setSuccess('Settings saved successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to save settings');
      }
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof CallSettingsData, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const estimatedEarnings = settings
    ? settings.callRatePerMinute * settings.minimumCallDuration
    : 0;

  if (loading) {
    return (
      <GlassCard className="p-8">
        <div className="flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </GlassCard>
    );
  }

  if (!settings) {
    return (
      <GlassCard className="p-8">
        <p className="text-red-400">Failed to load call settings</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-digis-cyan/20 rounded-lg">
          <Phone className="w-6 h-6 text-digis-cyan" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Call Settings</h2>
          <p className="text-sm text-gray-400">Configure your 1-on-1 video call pricing</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-500/20 border border-green-500 rounded-lg text-green-300 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {success}
        </div>
      )}

      <div className="space-y-6">
        {/* Call Rate */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span>Rate per Minute</span>
            </div>
          </label>
          <GlassInput
            type="number"
            value={settings.callRatePerMinute}
            onChange={(e) => updateSetting('callRatePerMinute', parseInt(e.target.value))}
            min={1}
            placeholder="10"
          />
          <p className="mt-1 text-xs text-gray-400">
            How many coins fans pay per minute of call time
          </p>
        </div>

        {/* Minimum Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Minimum Call Duration (minutes)</span>
            </div>
          </label>
          <GlassInput
            type="number"
            value={settings.minimumCallDuration}
            onChange={(e) => updateSetting('minimumCallDuration', parseInt(e.target.value))}
            min={1}
            max={60}
            placeholder="5"
          />
          <p className="mt-1 text-xs text-gray-400">
            Minimum call length required for booking
          </p>
        </div>

        {/* Estimated Earnings Card */}
        <div className="p-4 bg-gradient-to-r from-digis-cyan/10 to-digis-pink/10 border border-white/10 rounded-lg">
          <p className="text-sm text-gray-400 mb-1">Minimum Earnings per Call</p>
          <p className="text-3xl font-bold bg-gradient-to-r from-digis-cyan to-digis-pink bg-clip-text text-transparent">
            {estimatedEarnings} coins
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {settings.minimumCallDuration} min × {settings.callRatePerMinute} coins/min
          </p>
        </div>

        {/* Availability Toggle */}
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
          <div>
            <p className="font-medium text-white">Available for Calls</p>
            <p className="text-sm text-gray-400">Allow fans to request video calls</p>
          </div>
          <button
            onClick={() => updateSetting('isAvailableForCalls', !settings.isAvailableForCalls)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.isAvailableForCalls ? 'bg-digis-cyan' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.isAvailableForCalls ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Auto-Accept Toggle */}
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
          <div>
            <p className="font-medium text-white">Auto-Accept Calls</p>
            <p className="text-sm text-gray-400">Automatically accept all call requests</p>
          </div>
          <button
            onClick={() => updateSetting('autoAcceptCalls', !settings.autoAcceptCalls)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.autoAcceptCalls ? 'bg-digis-cyan' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.autoAcceptCalls ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Save Button */}
        <GlassButton
          onClick={handleSave}
          disabled={saving}
          variant="gradient"
          className="w-full"
        >
          {saving ? (
            <div className="flex items-center gap-2">
              <LoadingSpinner size="sm" />
              <span>Saving...</span>
            </div>
          ) : (
            'Save Settings'
          )}
        </GlassButton>
      </div>
    </GlassCard>
  );
}
