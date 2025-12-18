'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard, GlassButton, LoadingSpinner } from '@/components/ui';
import { MobileHeader } from '@/components/layout/MobileHeader';
import {
  Bot, Mic, ToggleLeft, ToggleRight, Coins, Sparkles,
  CheckCircle, AlertCircle, MessageSquare, Volume2
} from 'lucide-react';
import { COIN_TO_USD_RATE } from '@/lib/stripe/constants';

const formatCoinsToUSD = (coins: number): string => {
  const usd = coins * COIN_TO_USD_RATE;
  return usd.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

// Voice options from xAI
const VOICE_OPTIONS = [
  { id: 'ara', name: 'Ara', description: 'Warm & friendly (Female)', color: 'pink' },
  { id: 'eve', name: 'Eve', description: 'Energetic & upbeat (Female)', color: 'purple' },
  { id: 'leo', name: 'Leo', description: 'Authoritative & strong (Male)', color: 'blue' },
  { id: 'rex', name: 'Rex', description: 'Confident & clear (Male)', color: 'cyan' },
  { id: 'sal', name: 'Sal', description: 'Smooth & balanced (Neutral)', color: 'green' },
];

interface AiSettings {
  enabled: boolean;
  textChatEnabled: boolean;
  voice: string;
  personalityPrompt: string | null;
  welcomeMessage: string | null;
  boundaryPrompt: string | null;
  pricePerMinute: number;
  textPricePerMessage: number;
  totalSessions: number;
  totalMinutes: number;
  totalEarnings: number;
  totalTextMessages: number;
  totalTextEarnings: number;
}

export default function AiTwinPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [settings, setSettings] = useState<AiSettings>({
    enabled: false,
    textChatEnabled: false,
    voice: 'ara',
    personalityPrompt: null,
    welcomeMessage: null,
    boundaryPrompt: null,
    pricePerMinute: 20,
    textPricePerMessage: 5,
    totalSessions: 0,
    totalMinutes: 0,
    totalEarnings: 0,
    totalTextMessages: 0,
    totalTextEarnings: 0,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/ai/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSettings(data.settings);
        }
      } else if (response.status === 401) {
        router.push('/login');
      } else if (response.status === 403) {
        router.push('/creator/apply');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/ai/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: settings.enabled,
          textChatEnabled: settings.textChatEnabled,
          voice: settings.voice,
          personalityPrompt: settings.personalityPrompt,
          welcomeMessage: settings.welcomeMessage,
          boundaryPrompt: settings.boundaryPrompt,
          pricePerMinute: settings.pricePerMinute,
          textPricePerMessage: settings.textPricePerMessage,
        }),
      });

      if (response.ok) {
        setMessage('AI Twin settings saved!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save settings');
        setTimeout(() => setError(''), 3000);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Failed to save settings');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20">
      <MobileHeader />

      <div className="max-w-4xl mx-auto">
        <div className="md:hidden" style={{ height: 'calc(48px + env(safe-area-inset-top, 0px))' }} />

        <div className="px-4 pt-4 md:pt-10 pb-24 md:pb-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Bot className="w-7 h-7 text-cyan-400" />
              AI Twin
              <span className="ml-2 px-2 py-0.5 text-xs bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
                Beta
              </span>
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Let fans chat with your AI clone via voice or text 24/7
            </p>
          </div>

          {/* Messages */}
          {message && (
            <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {message}
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Stats Overview (only show if has data) */}
          {(settings.totalSessions > 0 || settings.totalTextMessages > 0) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <GlassCard className="p-4 text-center">
                <div className="text-2xl font-bold text-white">{settings.totalSessions}</div>
                <div className="text-xs text-gray-400">Voice Sessions</div>
              </GlassCard>
              <GlassCard className="p-4 text-center">
                <div className="text-2xl font-bold text-white">{settings.totalMinutes}</div>
                <div className="text-xs text-gray-400">Voice Minutes</div>
              </GlassCard>
              <GlassCard className="p-4 text-center">
                <div className="text-2xl font-bold text-white">{settings.totalTextMessages}</div>
                <div className="text-xs text-gray-400">Text Messages</div>
              </GlassCard>
              <GlassCard className="p-4 text-center">
                <div className="text-2xl font-bold text-green-400">{settings.totalEarnings + settings.totalTextEarnings}</div>
                <div className="text-xs text-gray-400">Total Earned</div>
              </GlassCard>
            </div>
          )}

          {/* Enable/Disable Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* Voice Chat Toggle */}
            <GlassCard className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg">
                  <Mic className="w-6 h-6 text-cyan-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white">Voice Chat</h3>
                  <p className="text-xs text-gray-400">
                    Real-time voice calls with AI
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
                >
                  {settings.enabled ? (
                    <ToggleRight className="w-12 h-12 text-cyan-500" />
                  ) : (
                    <ToggleLeft className="w-12 h-12 text-gray-500" />
                  )}
                </button>
              </div>
            </GlassCard>

            {/* Text Chat Toggle */}
            <GlassCard className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg">
                  <MessageSquare className="w-6 h-6 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white">Text Chat</h3>
                  <p className="text-xs text-gray-400">
                    AI responds to DMs
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, textChatEnabled: !settings.textChatEnabled })}
                >
                  {settings.textChatEnabled ? (
                    <ToggleRight className="w-12 h-12 text-purple-500" />
                  ) : (
                    <ToggleLeft className="w-12 h-12 text-gray-500" />
                  )}
                </button>
              </div>
            </GlassCard>
          </div>

          {(settings.enabled || settings.textChatEnabled) && (
            <div className="space-y-6">
              {/* Voice Selection - only show if voice enabled */}
              {settings.enabled && (
                <GlassCard className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <Volume2 className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">Voice</h3>
                      <p className="text-xs text-gray-400">Choose your AI&apos;s voice</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {VOICE_OPTIONS.map((voice) => (
                      <button
                        key={voice.id}
                        onClick={() => setSettings({ ...settings, voice: voice.id })}
                        className={`p-3 rounded-xl border transition-all text-left ${
                          settings.voice === voice.id
                            ? `border-${voice.color}-500 bg-${voice.color}-500/20`
                            : 'border-white/10 hover:border-white/30 bg-white/5'
                        }`}
                      >
                        <div className="font-semibold text-white">{voice.name}</div>
                        <div className="text-xs text-gray-400">{voice.description}</div>
                      </button>
                    ))}
                  </div>
                </GlassCard>
              )}

              {/* Personality Prompt */}
              <GlassCard className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-pink-500/20 rounded-lg">
                    <MessageSquare className="w-5 h-5 text-pink-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Personality</h3>
                    <p className="text-xs text-gray-400">Describe how your AI should behave</p>
                  </div>
                </div>

                <textarea
                  value={settings.personalityPrompt || ''}
                  onChange={(e) => setSettings({ ...settings, personalityPrompt: e.target.value })}
                  placeholder="Example: I'm bubbly and energetic. I love talking about fitness, fashion, and helping my fans feel confident. I use lots of encouragement and sometimes say 'babe' or 'sweetie'."
                  className="w-full px-4 py-3 bg-black/40 border border-pink-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 h-32 resize-none"
                />
                <p className="text-xs text-gray-500 mt-2">
                  This helps your AI Twin match your vibe and communication style
                </p>
              </GlassCard>

              {/* Welcome Message */}
              <GlassCard className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Mic className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Welcome Message</h3>
                    <p className="text-xs text-gray-400">First thing your AI says</p>
                  </div>
                </div>

                <textarea
                  value={settings.welcomeMessage || ''}
                  onChange={(e) => setSettings({ ...settings, welcomeMessage: e.target.value })}
                  placeholder="Example: Hey babe! So excited to chat with you! What's on your mind today?"
                  className="w-full px-4 py-3 bg-black/40 border border-green-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 h-24 resize-none"
                />
              </GlassCard>

              {/* Boundaries */}
              <GlassCard className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Boundaries</h3>
                    <p className="text-xs text-gray-400">Topics your AI should avoid</p>
                  </div>
                </div>

                <textarea
                  value={settings.boundaryPrompt || ''}
                  onChange={(e) => setSettings({ ...settings, boundaryPrompt: e.target.value })}
                  placeholder="Example: Don't discuss my personal relationships, my address, or specific travel plans. Don't make promises about meeting in person."
                  className="w-full px-4 py-3 bg-black/40 border border-red-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 h-24 resize-none"
                />
                <p className="text-xs text-gray-500 mt-2">
                  These are strict limits - your AI will politely deflect these topics
                </p>
              </GlassCard>

              {/* Pricing */}
              <GlassCard className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <Coins className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Pricing</h3>
                    <p className="text-xs text-gray-400">Set your rates for AI chats</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Voice Chat Pricing */}
                  {settings.enabled && (
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Voice Chat (per minute)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          value={settings.pricePerMinute || ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/^0+/, '') || '1';
                            setSettings({ ...settings, pricePerMinute: Math.min(1000, parseInt(val) || 1) });
                          }}
                          className="w-full px-3 py-2 bg-black/40 border border-cyan-500/30 rounded-lg text-white font-semibold text-center focus:outline-none focus:border-cyan-500 max-w-[120px]"
                        />
                        <span className="text-xs text-gray-400">coins</span>
                      </div>
                      <p className="text-xs text-green-400 mt-1">
                        You earn {formatCoinsToUSD(settings.pricePerMinute)}/min
                      </p>
                    </div>
                  )}

                  {/* Text Chat Pricing */}
                  {settings.textChatEnabled && (
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Text Chat (per message)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={settings.textPricePerMessage || ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/^0+/, '') || '1';
                            setSettings({ ...settings, textPricePerMessage: Math.min(100, parseInt(val) || 1) });
                          }}
                          className="w-full px-3 py-2 bg-black/40 border border-purple-500/30 rounded-lg text-white font-semibold text-center focus:outline-none focus:border-purple-500 max-w-[120px]"
                        />
                        <span className="text-xs text-gray-400">coins</span>
                      </div>
                      <p className="text-xs text-green-400 mt-1">
                        You earn {formatCoinsToUSD(settings.textPricePerMessage)}/msg
                      </p>
                    </div>
                  )}
                </div>
              </GlassCard>

              {/* Save Button */}
              <GlassButton
                variant="gradient"
                onClick={saveSettings}
                disabled={saving}
                className="w-full"
              >
                {saving ? <LoadingSpinner size="sm" /> : 'Save AI Twin Settings'}
              </GlassButton>
            </div>
          )}

          {/* Disabled State */}
          {!settings.enabled && !settings.textChatEnabled && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
                <Bot className="w-10 h-10 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Enable AI Twin</h3>
              <p className="text-gray-400 mb-4 max-w-md mx-auto">
                Let fans chat with an AI version of you via voice or text.
                Toggle on Voice Chat, Text Chat, or both above to get started.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
