'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { GlassCard, GlassInput, LoadingSpinner } from '@/components/ui';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

export default function CreatorApplyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [existingApplication, setExistingApplication] = useState<any>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    displayName: '',
    instagramHandle: '',
    twitterHandle: '',
    website: '',
    contentType: '',
  });

  useEffect(() => {
    checkExistingApplication();
  }, []);

  const checkExistingApplication = async () => {
    try {
      const response = await fetch('/api/creator/apply');
      const data = await response.json();

      if (response.ok && data.application) {
        setExistingApplication(data.application);
      }
    } catch (err) {
      console.error('Error checking application:', err);
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/creator/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit application');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-digis-dark flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Show existing application status
  if (existingApplication) {
    return (
      <div className="min-h-screen bg-digis-dark py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <GlassCard className="p-8 text-center">
            {existingApplication.status === 'pending' && (
              <>
                <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2 text-white">Application Pending</h2>
                <p className="text-gray-300 mb-4">
                  Your creator application is currently under review. We'll notify you once it's been reviewed.
                </p>
                <div className="text-left mt-6 p-4 bg-black/40 border border-white/20 rounded-lg">
                  <p className="text-sm text-gray-400 mb-2">Submitted: {new Date(existingApplication.createdAt).toLocaleDateString()}</p>
                  <p className="text-sm text-gray-200"><strong className="text-white">Display Name:</strong> {existingApplication.displayName}</p>
                  <p className="text-sm text-gray-200"><strong className="text-white">Content Type:</strong> {existingApplication.contentType}</p>
                </div>
              </>
            )}
            {existingApplication.status === 'approved' && (
              <>
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2 text-white">You're Already a Creator!</h2>
                <p className="text-gray-300 mb-4">
                  Your application has been approved. You can start creating content now.
                </p>
                <button
                  onClick={() => router.push('/creator/dashboard')}
                  className="px-6 py-4 bg-gradient-to-r from-digis-cyan via-digis-purple to-digis-pink text-gray-900 rounded-xl font-bold text-lg hover:scale-105 hover:shadow-2xl shadow-lg transition-all"
                >
                  Go to Creator Dashboard →
                </button>
              </>
            )}
            {existingApplication.status === 'rejected' && (
              <>
                <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2 text-white">Application Not Approved</h2>
                <p className="text-gray-300 mb-4">
                  Unfortunately, your previous application was not approved.
                </p>
                {existingApplication.rejectionReason && (
                  <div className="text-left mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm text-red-300"><strong>Reason:</strong> {existingApplication.rejectionReason}</p>
                  </div>
                )}
                <p className="text-sm text-gray-500 mt-6">
                  You can submit a new application below.
                </p>
                <button
                  onClick={() => setExistingApplication(null)}
                  className="mt-4 px-6 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                >
                  Apply Again
                </button>
              </>
            )}
          </GlassCard>
        </div>
      </div>
    );
  }

  // Show success message
  if (success) {
    return (
      <div className="min-h-screen bg-digis-dark flex items-center justify-center">
        <GlassCard className="max-w-md p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Application Submitted!</h2>
          <p className="text-gray-400">
            We'll review your application and get back to you soon.
          </p>
        </GlassCard>
      </div>
    );
  }

  // Show application form
  return (
    <div className="min-h-screen bg-digis-dark py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-6">
            <Image
              src="/images/digis-logo-white.png"
              alt="Digis Logo"
              width={180}
              height={60}
              className="h-12 w-auto"
              priority
            />
          </div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-digis-cyan to-digis-pink bg-clip-text text-transparent">
            Become a Creator
          </h1>
          <p className="text-gray-400">
            Join our community of creators and start earning
          </p>
        </div>

        <GlassCard className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-200">
                Display Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="Your creator name"
                required
                className="w-full px-4 py-3 bg-black/40 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-digis-cyan focus:ring-2 focus:ring-digis-cyan/20 transition-all"
              />
            </div>

            {/* Content Type */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-200">
                Content Type <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.contentType}
                onChange={(e) => setFormData({ ...formData, contentType: e.target.value })}
                placeholder="e.g., Gaming, Music, Art, Education, Fitness"
                required
                className="w-full px-4 py-3 bg-black/40 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-digis-cyan focus:ring-2 focus:ring-digis-cyan/20 transition-all"
              />
            </div>

            {/* Social Links Section */}
            <div className="pt-4 border-t border-white/10">
              <h3 className="text-lg font-semibold mb-4 text-gray-200">Social Links</h3>
              <div className="space-y-4">
                {/* Instagram */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-200">
                    Instagram Handle
                  </label>
                  <input
                    type="text"
                    value={formData.instagramHandle}
                    onChange={(e) => setFormData({ ...formData, instagramHandle: e.target.value })}
                    placeholder="@username"
                    className="w-full px-4 py-3 bg-black/40 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-digis-cyan focus:ring-2 focus:ring-digis-cyan/20 transition-all"
                  />
                </div>

                {/* Twitter */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-200">
                    Twitter Handle
                  </label>
                  <input
                    type="text"
                    value={formData.twitterHandle}
                    onChange={(e) => setFormData({ ...formData, twitterHandle: e.target.value })}
                    placeholder="@username"
                    className="w-full px-4 py-3 bg-black/40 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-digis-cyan focus:ring-2 focus:ring-digis-cyan/20 transition-all"
                  />
                </div>

                {/* Website */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-200">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://yourwebsite.com"
                    className="w-full px-4 py-3 bg-black/40 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-digis-cyan focus:ring-2 focus:ring-digis-cyan/20 transition-all"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500 text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-4 bg-gradient-to-r from-digis-cyan via-digis-purple to-digis-pink text-gray-900 rounded-xl font-bold text-lg hover:scale-105 hover:shadow-2xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                  <span>Submitting...</span>
                </div>
              ) : 'Submit Application →'}
            </button>

            <p className="text-xs text-gray-500 text-center">
              We'll review your application and notify you within 24-48 hours
            </p>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
