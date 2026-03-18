'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { LoadingSpinner } from '@/components/ui';
import {
  Camera, Check, ArrowRight, ArrowLeft, DollarSign,
  Upload, Share2, Copy, CheckCircle, Sparkles, Video,
  MessageSquare, Phone, Mic,
} from 'lucide-react';

interface SetupData {
  onboardingStep: number;
  onboardingCompletedAt: string | null;
  profile: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    hasAvatar: boolean;
    hasBio: boolean;
  };
  settings: {
    callRatePerMinute: number;
    voiceCallRatePerMinute: number;
    messageRate: number;
    isAvailableForCalls: boolean;
    isAvailableForVoiceCalls: boolean;
  } | null;
}

const STEPS = [
  { id: 1, label: 'Profile Photo', icon: Camera },
  { id: 2, label: 'Set Rates', icon: DollarSign },
  { id: 3, label: 'First Content', icon: Upload },
  { id: 4, label: 'Share Link', icon: Share2 },
];

export default function CreatorSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [saving, setSaving] = useState(false);

  // Step 1: Profile photo
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Step 2: Rates
  const [callRate, setCallRate] = useState(25);
  const [voiceCallRate, setVoiceCallRate] = useState(15);
  const [messageRate, setMessageRate] = useState(3);
  const [enableCalls, setEnableCalls] = useState(true);
  const [enableVoiceCalls, setEnableVoiceCalls] = useState(true);

  // Step 4: Share
  const [copied, setCopied] = useState(false);

  // Fetch setup status
  useEffect(() => {
    const fetchSetup = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push('/');
          return;
        }

        const res = await fetch('/api/creator/setup');
        if (!res.ok) {
          router.push('/creator/dashboard');
          return;
        }

        const data: SetupData = await res.json();
        setSetupData(data);

        // If already completed, go to dashboard
        if (data.onboardingCompletedAt) {
          router.push('/creator/dashboard');
          return;
        }

        // Resume from last step (minimum step 1)
        const resumeStep = Math.max(1, Math.min(data.onboardingStep + 1, 4));
        setCurrentStep(resumeStep);

        // Pre-fill existing data
        if (data.profile.avatarUrl) {
          setAvatarPreview(data.profile.avatarUrl);
        }
        if (data.profile.bio) {
          setBio(data.profile.bio);
        }
        if (data.settings) {
          setCallRate(data.settings.callRatePerMinute);
          setVoiceCallRate(data.settings.voiceCallRatePerMinute);
          setMessageRate(data.settings.messageRate);
          setEnableCalls(data.settings.isAvailableForCalls);
          setEnableVoiceCalls(data.settings.isAvailableForVoiceCalls);
        }
      } catch (error) {
        console.error('Setup fetch error:', error);
        router.push('/creator/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchSetup();
  }, [router]);

  const saveStep = useCallback(async (step: number) => {
    try {
      await fetch('/api/creator/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step }),
      });
    } catch (error) {
      console.error('Failed to save step:', error);
    }
  }, []);

  // Step 1: Upload avatar + bio
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleStep1Next = async () => {
    setSaving(true);
    try {
      // Upload avatar if selected
      if (avatarFile) {
        setUploadingAvatar(true);
        const formData = new FormData();
        formData.append('file', avatarFile);
        const res = await fetch('/api/user/avatar', { method: 'POST', body: formData });
        if (!res.ok) console.warn('Avatar upload failed');
        setUploadingAvatar(false);
      }

      // Save bio if provided
      if (bio.trim()) {
        await fetch('/api/user/update-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bio: bio.trim() }),
        });
      }

      await saveStep(1);
      setCurrentStep(2);
    } catch (error) {
      console.error('Step 1 error:', error);
    } finally {
      setSaving(false);
    }
  };

  // Step 2: Save rates
  const handleStep2Next = async () => {
    setSaving(true);
    try {
      await fetch('/api/creator/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callRatePerMinute: callRate,
          voiceCallRatePerMinute: voiceCallRate,
          messageRate: messageRate,
          isAvailableForCalls: enableCalls,
          isAvailableForVoiceCalls: enableVoiceCalls,
        }),
      });

      await saveStep(2);
      setCurrentStep(3);
    } catch (error) {
      console.error('Step 2 error:', error);
    } finally {
      setSaving(false);
    }
  };

  // Step 3: First content (redirect to cloud upload)
  const handleStep3Upload = async () => {
    await saveStep(3);
    router.push('/cloud?setup=true');
  };

  const handleStep3Skip = async () => {
    await saveStep(3);
    setCurrentStep(4);
  };

  // Step 4: Complete
  const handleComplete = async () => {
    setSaving(true);
    try {
      await saveStep(5);
      router.push('/creator/dashboard');
    } catch (error) {
      console.error('Complete error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = () => {
    const link = `https://digis.cc/${setupData?.profile.username}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const profileUrl = `https://digis.cc/${setupData?.profile.username || ''}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#121218] to-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-400">Loading your setup...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#121218] to-[#0a0a0f] flex flex-col">
      {/* Header */}
      <div className="w-full max-w-2xl mx-auto px-4 pt-8 pb-4">
        <div className="flex justify-center mb-6">
          <Image
            src="/images/digis-logo-white.png"
            alt="Digis"
            width={120}
            height={40}
            className="h-8 w-auto"
            priority
          />
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-1 mb-2">
          {STEPS.map((step, i) => (
            <div key={step.id} className="flex-1 flex items-center">
              <div
                className={`h-1.5 w-full rounded-full transition-all duration-500 ${
                  currentStep > step.id
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500'
                    : currentStep === step.id
                    ? 'bg-gradient-to-r from-cyan-500/60 to-purple-500/60'
                    : 'bg-white/10'
                }`}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-500 px-1">
          {STEPS.map((step) => (
            <span
              key={step.id}
              className={currentStep >= step.id ? 'text-cyan-400' : ''}
            >
              {step.label}
            </span>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-4 pt-4 pb-8">
        <div className="w-full max-w-lg">
          {/* Step 1: Profile Photo & Bio */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-white mb-2">
                  Make a great first impression
                </h1>
                <p className="text-gray-400">
                  Add a profile photo and bio so fans know who you are
                </p>
              </div>

              {/* Avatar upload */}
              <div className="flex flex-col items-center gap-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-32 h-32 rounded-full bg-white/5 border-2 border-dashed border-white/20 hover:border-cyan-500 transition-all cursor-pointer flex items-center justify-center overflow-hidden group"
                >
                  {avatarPreview ? (
                    <>
                      <Image
                        src={avatarPreview}
                        alt="Profile preview"
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="w-8 h-8 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      <Camera className="w-10 h-10 text-gray-500 mx-auto mb-1" />
                      <span className="text-xs text-gray-500">Upload</span>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  {avatarPreview ? 'Change photo' : 'Choose a photo'}
                </button>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Bio <span className="text-gray-500">(optional)</span>
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell fans a bit about yourself..."
                  rows={3}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 text-right">{bio.length}/500</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleStep1Next}
                  disabled={saving}
                  className="flex-1 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
              <button
                onClick={() => { saveStep(1); setCurrentStep(2); }}
                className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors text-center"
              >
                Skip for now
              </button>
            </div>
          )}

          {/* Step 2: Set Rates */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-white mb-2">
                  Set your rates
                </h1>
                <p className="text-gray-400">
                  How much fans pay to interact with you. You can change these anytime.
                </p>
              </div>

              <div className="space-y-4">
                {/* Video Call Rate */}
                <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-cyan-500/20">
                        <Video className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">Video Calls</p>
                        <p className="text-xs text-gray-400">Per minute rate</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableCalls}
                        onChange={(e) => setEnableCalls(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                    </label>
                  </div>
                  {enableCalls && (
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={10}
                        max={100}
                        step={5}
                        value={callRate}
                        onChange={(e) => setCallRate(Number(e.target.value))}
                        className="flex-1 accent-cyan-500"
                      />
                      <div className="min-w-[80px] text-right">
                        <span className="text-white font-bold">{callRate}</span>
                        <span className="text-gray-400 text-sm"> coins/min</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Voice Call Rate */}
                <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/20">
                        <Mic className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">Voice Calls</p>
                        <p className="text-xs text-gray-400">Per minute rate</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableVoiceCalls}
                        onChange={(e) => setEnableVoiceCalls(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                    </label>
                  </div>
                  {enableVoiceCalls && (
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={5}
                        max={75}
                        step={5}
                        value={voiceCallRate}
                        onChange={(e) => setVoiceCallRate(Number(e.target.value))}
                        className="flex-1 accent-purple-500"
                      />
                      <div className="min-w-[80px] text-right">
                        <span className="text-white font-bold">{voiceCallRate}</span>
                        <span className="text-gray-400 text-sm"> coins/min</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Message Rate */}
                <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-pink-500/20">
                      <MessageSquare className="w-5 h-5 text-pink-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Messages</p>
                      <p className="text-xs text-gray-400">Per message rate</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={25}
                      step={1}
                      value={messageRate}
                      onChange={(e) => setMessageRate(Number(e.target.value))}
                      className="flex-1 accent-pink-500"
                    />
                    <div className="min-w-[80px] text-right">
                      <span className="text-white font-bold">{messageRate}</span>
                      <span className="text-gray-400 text-sm"> coins/msg</span>
                    </div>
                  </div>
                </div>

                {/* Earnings estimate */}
                <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-xl border border-cyan-500/20 p-4 text-center">
                  <p className="text-sm text-gray-400 mb-1">If 10 fans call you for 15 min each</p>
                  <p className="text-2xl font-bold text-white">
                    {(callRate * 15 * 10 * 0.7 / 10).toFixed(0)} USD
                    <span className="text-sm text-gray-400 font-normal"> potential earnings</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Creators keep 70% of all earnings</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-6 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-colors"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleStep2Next}
                  disabled={saving}
                  className="flex-1 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: First Content */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-white mb-2">
                  Drop your first content
                </h1>
                <p className="text-gray-400">
                  Upload a photo, video, or gallery to your Cloud. This is what fans will see on your profile.
                </p>
              </div>

              {/* Upload options */}
              <div className="space-y-3">
                <button
                  onClick={handleStep3Upload}
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/50 rounded-xl p-6 transition-all text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-cyan-500/20 group-hover:bg-cyan-500/30 transition-colors">
                      <Upload className="w-8 h-8 text-cyan-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold text-lg">Upload to Cloud</p>
                      <p className="text-sm text-gray-400">
                        Photos, videos, or galleries — free or paid
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-cyan-400 transition-colors" />
                  </div>
                </button>

                <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-white font-medium">Pro tip</p>
                      <p className="text-xs text-gray-400">
                        Start with a free teaser photo to attract fans, then add paid exclusive content.
                        Creators who upload in their first day earn 4x more in their first month.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-colors"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleStep3Skip}
                  className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-colors"
                >
                  Skip for now
                </button>
              </div>
              <p className="text-xs text-gray-500 text-center">
                You can always upload content later from your dashboard
              </p>
            </div>
          )}

          {/* Step 4: Share Your Link */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  You&apos;re all set!
                </h1>
                <p className="text-gray-400">
                  Share your Digis link everywhere — Instagram bio, Twitter, TikTok, anywhere fans can find you.
                </p>
              </div>

              {/* Profile link */}
              <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Your Digis Link
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-4 py-3 bg-white/5 rounded-lg text-cyan-400 font-mono text-sm truncate">
                    {profileUrl}
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className={`px-4 py-3 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${
                      copied
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
                    }`}
                    aria-label="Copy link"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Share suggestions */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-300">Quick share ideas:</p>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  {[
                    { platform: 'Instagram', text: 'Add to your bio link' },
                    { platform: 'Twitter/X', text: 'Pin a tweet with your link' },
                    { platform: 'TikTok', text: 'Add to your bio' },
                    { platform: 'DMs', text: 'Send directly to your biggest fans' },
                  ].map(({ platform, text }) => (
                    <div
                      key={platform}
                      className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2"
                    >
                      <div className="w-2 h-2 rounded-full bg-cyan-400" />
                      <span className="text-white font-medium">{platform}</span>
                      <span className="text-gray-500">— {text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Go to dashboard */}
              <button
                onClick={handleComplete}
                disabled={saving}
                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
              >
                {saving ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    Go to Dashboard
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
