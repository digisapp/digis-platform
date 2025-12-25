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
  { id: 'ara', name: 'Luna', description: 'Warm & friendly (Female)', color: 'pink' },
  { id: 'eve', name: 'Zara', description: 'Energetic & upbeat (Female)', color: 'purple' },
  { id: 'leo', name: 'Max', description: 'Authoritative & strong (Male)', color: 'blue' },
  { id: 'rex', name: 'Kai', description: 'Confident & clear (Male)', color: 'cyan' },
  { id: 'sal', name: 'Sage', description: 'Smooth & balanced (Neutral)', color: 'green' },
];

// Vibe presets - one-click personality templates
const VIBE_PRESETS = [
  { id: 'bestie', name: 'The Bestie', emoji: '💕', description: 'Supportive, fun, like chatting with your BFF', traits: ['friendly', 'supportive', 'fun', 'encouraging'] },
  { id: 'tease', name: 'The Tease', emoji: '😏', description: 'Playful, flirty, keeps them coming back', traits: ['flirty', 'playful', 'witty', 'confident'] },
  { id: 'pro', name: 'The Pro', emoji: '💼', description: 'Professional, helpful, knowledgeable', traits: ['professional', 'helpful', 'smart', 'polite'] },
  { id: 'sweetheart', name: 'The Sweetheart', emoji: '🥰', description: 'Sweet, caring, makes everyone feel special', traits: ['sweet', 'caring', 'warm', 'gentle'] },
  { id: 'baddie', name: 'The Baddie', emoji: '🔥', description: 'Confident, bold, takes no BS', traits: ['confident', 'bold', 'sassy', 'direct'] },
  { id: 'mysterious', name: 'The Mystery', emoji: '🌙', description: 'Intriguing, deep, leaves them curious', traits: ['mysterious', 'deep', 'thoughtful', 'alluring'] },
];

// Personality trait chips
const PERSONALITY_TRAITS = [
  { id: 'friendly', label: 'Friendly', emoji: '😊' },
  { id: 'flirty', label: 'Flirty', emoji: '😘' },
  { id: 'playful', label: 'Playful', emoji: '😜' },
  { id: 'sassy', label: 'Sassy', emoji: '💅' },
  { id: 'sweet', label: 'Sweet', emoji: '🍬' },
  { id: 'witty', label: 'Witty', emoji: '😏' },
  { id: 'caring', label: 'Caring', emoji: '💗' },
  { id: 'confident', label: 'Confident', emoji: '💪' },
  { id: 'mysterious', label: 'Mysterious', emoji: '🌙' },
  { id: 'energetic', label: 'Energetic', emoji: '⚡' },
  { id: 'chill', label: 'Chill', emoji: '😎' },
  { id: 'supportive', label: 'Supportive', emoji: '🤗' },
  { id: 'bold', label: 'Bold', emoji: '🔥' },
  { id: 'gentle', label: 'Gentle', emoji: '🌸' },
  { id: 'funny', label: 'Funny', emoji: '😂' },
  { id: 'smart', label: 'Smart', emoji: '🧠' },
];

// Boundaries options
const BOUNDARY_OPTIONS = [
  { id: 'pg', label: 'Keep it PG', emoji: '😇', description: 'Family-friendly, no flirting', prompt: 'Keep all conversations family-friendly and professional. No flirting, romantic talk, or suggestive content.' },
  { id: 'light', label: 'Light Flirting OK', emoji: '😊', description: 'Playful banter allowed', prompt: 'Light flirting and playful banter is okay, but keep it tasteful. No explicit or overly suggestive content.' },
  { id: 'flirty', label: 'Flirty & Fun', emoji: '😘', description: 'Flirty vibes welcome', prompt: 'Flirty conversation is welcome. Be playful and suggestive but avoid explicit sexual content.' },
  { id: 'spicy', label: 'Spicy Allowed', emoji: '🔥', description: 'Adult conversations OK', prompt: 'Adult and suggestive conversations are allowed. Be flirty and spicy while staying within platform guidelines.' },
];

// Generate personality prompt from selections
const generatePersonalityPrompt = (
  vibePreset: string | null,
  selectedTraits: string[],
  customAdditions: string
): string => {
  const parts: string[] = [];

  // Add vibe preset description
  const preset = VIBE_PRESETS.find(p => p.id === vibePreset);
  if (preset) {
    parts.push(`I have a "${preset.name}" personality - ${preset.description.toLowerCase()}.`);
  }

  // Add selected traits
  if (selectedTraits.length > 0) {
    const traitLabels = selectedTraits.map(id => {
      const trait = PERSONALITY_TRAITS.find(t => t.id === id);
      return trait?.label.toLowerCase();
    }).filter(Boolean);

    if (traitLabels.length > 0) {
      parts.push(`I'm ${traitLabels.join(', ')}.`);
    }
  }

  // Add custom additions
  if (customAdditions.trim()) {
    parts.push(customAdditions.trim());
  }

  return parts.join(' ');
};

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

  // Personality builder state
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null);
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const [selectedBoundary, setSelectedBoundary] = useState<string>('light');
  const [customAdditions, setCustomAdditions] = useState<string>('');

  // Toggle a trait on/off
  const toggleTrait = (traitId: string) => {
    setSelectedTraits(prev =>
      prev.includes(traitId)
        ? prev.filter(id => id !== traitId)
        : [...prev, traitId]
    );
  };

  // Select a vibe preset and auto-select its traits
  const selectVibePreset = (vibeId: string) => {
    const preset = VIBE_PRESETS.find(p => p.id === vibeId);
    if (preset) {
      setSelectedVibe(vibeId);
      // Add preset traits to selected traits (without duplicates)
      setSelectedTraits(prev => {
        const newTraits = new Set([...prev, ...preset.traits]);
        return Array.from(newTraits);
      });
    }
  };

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

    // Generate personality prompt from selections
    const generatedPersonality = generatePersonalityPrompt(selectedVibe, selectedTraits, customAdditions);

    // Get boundary prompt from selection
    const boundaryOption = BOUNDARY_OPTIONS.find(b => b.id === selectedBoundary);
    const generatedBoundary = boundaryOption?.prompt || '';

    try {
      const response = await fetch('/api/ai/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: settings.enabled,
          textChatEnabled: settings.textChatEnabled,
          voice: settings.voice,
          personalityPrompt: generatedPersonality || settings.personalityPrompt,
          welcomeMessage: settings.welcomeMessage,
          boundaryPrompt: generatedBoundary || settings.boundaryPrompt,
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

              {/* Personality Builder */}
              <GlassCard className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-pink-500/20 rounded-lg">
                    <Sparkles className="w-5 h-5 text-pink-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Personality</h3>
                    <p className="text-xs text-gray-400">Choose your AI&apos;s vibe</p>
                  </div>
                </div>

                {/* Vibe Presets */}
                <div className="mb-5">
                  <p className="text-xs text-gray-400 mb-2 font-medium">Quick Vibe Presets</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {VIBE_PRESETS.map((vibe) => (
                      <button
                        key={vibe.id}
                        onClick={() => selectVibePreset(vibe.id)}
                        className={`p-3 rounded-xl border transition-all text-left ${
                          selectedVibe === vibe.id
                            ? 'border-pink-500 bg-pink-500/20'
                            : 'border-white/10 hover:border-white/30 bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{vibe.emoji}</span>
                          <span className="font-semibold text-white text-sm">{vibe.name}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{vibe.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Trait Chips */}
                <div className="mb-5">
                  <p className="text-xs text-gray-400 mb-2 font-medium">Fine-tune with Traits</p>
                  <div className="flex flex-wrap gap-2">
                    {PERSONALITY_TRAITS.map((trait) => (
                      <button
                        key={trait.id}
                        onClick={() => toggleTrait(trait.id)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${
                          selectedTraits.includes(trait.id)
                            ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                        }`}
                      >
                        <span>{trait.emoji}</span>
                        <span>{trait.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Additions */}
                <div>
                  <p className="text-xs text-gray-400 mb-2 font-medium">Add Custom Details (optional)</p>
                  <textarea
                    value={customAdditions}
                    onChange={(e) => setCustomAdditions(e.target.value)}
                    placeholder="E.g., I love talking about fitness and fashion. I sometimes say 'babe' or 'sweetie'."
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 h-20 resize-none text-sm"
                  />
                </div>

                {/* Preview */}
                {(selectedVibe || selectedTraits.length > 0 || customAdditions) && (
                  <div className="mt-4 p-3 rounded-lg bg-pink-500/10 border border-pink-500/20">
                    <p className="text-xs text-pink-400 font-medium mb-1">Preview:</p>
                    <p className="text-sm text-gray-300">
                      {generatePersonalityPrompt(selectedVibe, selectedTraits, customAdditions) || 'Select a vibe or traits to see preview'}
                    </p>
                  </div>
                )}
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
                    <p className="text-xs text-gray-400">Set your comfort level</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {BOUNDARY_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setSelectedBoundary(option.id)}
                      className={`p-3 rounded-xl border transition-all text-center ${
                        selectedBoundary === option.id
                          ? 'border-red-500 bg-red-500/20'
                          : 'border-white/10 hover:border-white/30 bg-white/5'
                      }`}
                    >
                      <span className="text-2xl block mb-1">{option.emoji}</span>
                      <span className="font-semibold text-white text-sm block">{option.label}</span>
                      <span className="text-xs text-gray-400">{option.description}</span>
                    </button>
                  ))}
                </div>

                <p className="text-xs text-gray-500 mt-3">
                  Your AI will stay within these boundaries during conversations
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
