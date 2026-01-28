'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Sparkles, Instagram, Music2, CheckCircle, Clock, XCircle,
  ArrowRight, Loader2, AlertCircle, Users, DollarSign, Video
} from 'lucide-react';

const CONTENT_CATEGORIES = [
  'Fashion & Style',
  'Beauty & Makeup',
  'Fitness & Health',
  'Lifestyle',
  'Gaming',
  'Music & Dance',
  'Art & Creative',
  'Comedy & Entertainment',
  'Education & Tutorials',
  'Food & Cooking',
  'Travel',
  'Other',
];

const FOLLOWER_RANGES = [
  'Under 1,000',
  '1,000 - 10,000',
  '10,000 - 50,000',
  '50,000 - 100,000',
  '100,000+',
];

export default function ApplyCreatorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingApplication, setExistingApplication] = useState<any>(null);
  const [isCreator, setIsCreator] = useState(false);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [tiktokHandle, setTiktokHandle] = useState('');
  const [followerCount, setFollowerCount] = useState('');
  const [contentCategory, setContentCategory] = useState('');
  const [bio, setBio] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Check if user is logged in and their status
        const meRes = await fetch('/api/user/me');
        if (!meRes.ok) {
          router.push('/login?redirect=/apply-creator');
          return;
        }
        const meData = await meRes.json();

        if (meData.user?.role === 'creator') {
          setIsCreator(true);
          setLoading(false);
          return;
        }

        // Check for existing application
        const appRes = await fetch('/api/creator/apply');
        const appData = await appRes.json();

        if (appData.hasApplication) {
          setExistingApplication(appData.application);
        }
      } catch (err) {
        console.error('Error checking status:', err);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/creator/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          instagramHandle: instagramHandle.trim() || null,
          tiktokHandle: tiktokHandle.trim() || null,
          followerCount,
          contentCategory,
          bio: bio.trim() || null,
          ageConfirmed,
          termsAccepted,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to submit application');
        return;
      }

      // Refresh to show pending status
      setExistingApplication({
        id: data.applicationId,
        status: 'pending',
        contentCategory,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  // Already a creator
  if (isCreator) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">You're Already a Creator!</h1>
          <p className="text-gray-400 mb-6">
            You already have creator access. Go to your dashboard to start earning.
          </p>
          <button
            onClick={() => router.push('/creator/dashboard')}
            className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Has pending or reviewed application
  if (existingApplication) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${
            existingApplication.status === 'pending' ? 'bg-yellow-500/20' :
            existingApplication.status === 'approved' ? 'bg-green-500/20' :
            'bg-red-500/20'
          }`}>
            {existingApplication.status === 'pending' ? (
              <Clock className="w-10 h-10 text-yellow-400" />
            ) : existingApplication.status === 'approved' ? (
              <CheckCircle className="w-10 h-10 text-green-400" />
            ) : (
              <XCircle className="w-10 h-10 text-red-400" />
            )}
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">
            {existingApplication.status === 'pending' ? 'Application Under Review' :
             existingApplication.status === 'approved' ? 'Application Approved!' :
             'Application Not Approved'}
          </h1>

          <p className="text-gray-400 mb-6">
            {existingApplication.status === 'pending' ? (
              "We're reviewing your application. You'll be notified once a decision is made."
            ) : existingApplication.status === 'approved' ? (
              "Congratulations! Your creator account is ready. Start earning today!"
            ) : (
              existingApplication.rejectionReason || "Unfortunately, your application wasn't approved at this time."
            )}
          </p>

          {existingApplication.status === 'approved' ? (
            <button
              onClick={() => router.push('/creator/dashboard')}
              className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
            >
              Go to Creator Dashboard
            </button>
          ) : existingApplication.status === 'rejected' ? (
            <button
              onClick={() => {
                setExistingApplication(null);
                setFullName('');
                setInstagramHandle('');
                setTiktokHandle('');
                setFollowerCount('');
                setContentCategory('');
                setBio('');
                setAgeConfirmed(false);
                setTermsAccepted(false);
              }}
              className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors"
            >
              Apply Again
            </button>
          ) : (
            <p className="text-gray-500 text-sm">
              Applied on {new Date(existingApplication.createdAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Application form
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 mb-4">
            <Sparkles className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Become a Creator</h1>
          <p className="text-gray-400">
            Apply to start earning on Digis. We'll review your application shortly.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-4 bg-white/5 rounded-xl text-center">
            <DollarSign className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <p className="text-sm text-gray-300">Earn from tips, calls & messages</p>
          </div>
          <div className="p-4 bg-white/5 rounded-xl text-center">
            <Video className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <p className="text-sm text-gray-300">Go live & sell content</p>
          </div>
          <div className="p-4 bg-white/5 rounded-xl text-center">
            <Users className="w-6 h-6 text-purple-400 mx-auto mb-2" />
            <p className="text-sm text-gray-300">Build your community</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Your Information</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Your Social Presence</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Instagram Handle <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-pink-400" />
                  <input
                    type="text"
                    value={instagramHandle}
                    onChange={(e) => setInstagramHandle(e.target.value)}
                    placeholder="@yourusername"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  TikTok Handle
                </label>
                <div className="relative">
                  <Music2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400" />
                  <input
                    type="text"
                    value={tiktokHandle}
                    onChange={(e) => setTiktokHandle(e.target.value)}
                    placeholder="@yourusername"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Total Follower Count (across platforms)
                </label>
                <select
                  value={followerCount}
                  onChange={(e) => setFollowerCount(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="" className="bg-gray-900">Select range...</option>
                  {FOLLOWER_RANGES.map((range) => (
                    <option key={range} value={range} className="bg-gray-900">
                      {range}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">About Your Content</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Content Category <span className="text-red-400">*</span>
                </label>
                <select
                  value={contentCategory}
                  onChange={(e) => setContentCategory(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="" className="bg-gray-900">Select category...</option>
                  {CONTENT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-gray-900">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Tell us about yourself
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="What kind of content do you create? Why do you want to join Digis?"
                  rows={4}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* Confirmations */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={ageConfirmed}
                onChange={(e) => setAgeConfirmed(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0"
              />
              <span className="text-gray-300 text-sm">
                I confirm that I am 18 years of age or older <span className="text-red-400">*</span>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0"
              />
              <span className="text-gray-300 text-sm">
                I agree to the{' '}
                <a href="/terms" target="_blank" className="text-cyan-400 hover:underline">
                  Creator Terms of Service
                </a>{' '}
                <span className="text-red-400">*</span>
              </span>
            </label>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !fullName || !instagramHandle || !followerCount || !ageConfirmed || !termsAccepted}
            className="w-full py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                Submit Application
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
