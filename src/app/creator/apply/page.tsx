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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-cyan-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Show existing application status
  if (existingApplication) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-cyan-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="backdrop-blur-xl bg-white/80 rounded-3xl border border-gray-200 p-8 text-center shadow-sm">
            {existingApplication.status === 'pending' && (
              <>
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full blur-2xl opacity-30"></div>
                  <Clock className="relative w-16 h-16 text-yellow-600 mx-auto" />
                </div>
                <h2 className="text-3xl font-bold mb-3 text-gray-900">Application Pending</h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Your creator application is currently under review. We'll notify you once it's been reviewed.
                </p>
                <div className="text-left mt-6 p-6 bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-2xl">
                  <p className="text-sm text-gray-600 mb-3">Submitted: {new Date(existingApplication.createdAt).toLocaleDateString()}</p>
                  <p className="text-sm text-gray-700 mb-2"><strong className="text-gray-900">Display Name:</strong> {existingApplication.displayName}</p>
                  <p className="text-sm text-gray-700"><strong className="text-gray-900">Content Type:</strong> {existingApplication.contentType}</p>
                </div>
              </>
            )}
            {existingApplication.status === 'approved' && (
              <>
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full blur-2xl opacity-30"></div>
                  <CheckCircle className="relative w-16 h-16 text-green-600 mx-auto" />
                </div>
                <h2 className="text-3xl font-bold mb-3 text-gray-900">You're Already a Creator!</h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Your application has been approved. You can start creating content now.
                </p>
                <button
                  onClick={() => router.push('/creator/dashboard')}
                  className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-purple-600 text-white rounded-2xl font-bold text-lg hover:scale-105 transition-all shadow-sm"
                >
                  Go to Creator Dashboard →
                </button>
              </>
            )}
            {existingApplication.status === 'rejected' && (
              <>
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-500 rounded-full blur-2xl opacity-30"></div>
                  <XCircle className="relative w-16 h-16 text-red-600 mx-auto" />
                </div>
                <h2 className="text-3xl font-bold mb-3 text-gray-900">Application Not Approved</h2>
                <p className="text-gray-600 mb-4 max-w-md mx-auto">
                  Unfortunately, your previous application was not approved.
                </p>
                {existingApplication.rejectionReason && (
                  <div className="text-left mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-2xl">
                    <p className="text-sm text-red-700"><strong>Reason:</strong> {existingApplication.rejectionReason}</p>
                  </div>
                )}
                <p className="text-sm text-gray-600 mt-6">
                  You can submit a new application below.
                </p>
                <button
                  onClick={() => setExistingApplication(null)}
                  className="mt-4 px-6 py-3 bg-gray-200 text-gray-900 rounded-xl hover:bg-gray-300 transition-colors font-semibold"
                >
                  Apply Again
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show success message
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-cyan-50 flex items-center justify-center">
        <div className="backdrop-blur-xl bg-white/80 rounded-3xl border border-gray-200 max-w-md p-8 text-center shadow-sm">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full blur-2xl opacity-30"></div>
            <CheckCircle className="relative w-16 h-16 text-green-600 mx-auto" />
          </div>
          <h2 className="text-3xl font-bold mb-3 text-gray-900">Application Submitted!</h2>
          <p className="text-gray-600">
            We'll review your application and get back to you soon.
          </p>
        </div>
      </div>
    );
  }

  // Show application form
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-cyan-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-cyan-600 to-purple-600 bg-clip-text text-transparent">
            Become a Creator
          </h1>
          <p className="text-gray-600 text-lg">
            Join our community of creators and start earning
          </p>
        </div>

        <div className="backdrop-blur-xl bg-white/80 rounded-3xl border border-gray-200 p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Display Name */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-900">
                Display Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="Your creator name"
                required
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
              />
            </div>

            {/* Content Type */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-900">
                Content Type <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.contentType}
                onChange={(e) => setFormData({ ...formData, contentType: e.target.value })}
                placeholder="e.g., Gaming, Music, Art, Education, Fitness"
                required
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
              />
            </div>

            {/* Social Links Section */}
            <div className="pt-4 border-t-2 border-gray-200">
              <h3 className="text-lg font-bold mb-4 text-gray-900">Social Links</h3>
              <div className="space-y-4">
                {/* Instagram */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-900">
                    Instagram Handle
                  </label>
                  <input
                    type="text"
                    value={formData.instagramHandle}
                    onChange={(e) => setFormData({ ...formData, instagramHandle: e.target.value })}
                    placeholder="@username"
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  />
                </div>

                {/* Twitter */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-900">
                    Twitter Handle
                  </label>
                  <input
                    type="text"
                    value={formData.twitterHandle}
                    onChange={(e) => setFormData({ ...formData, twitterHandle: e.target.value })}
                    placeholder="@username"
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  />
                </div>

                {/* Website */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-900">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://yourwebsite.com"
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-red-50 border-2 border-red-200 text-red-700 text-sm font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-8 py-4 bg-gradient-to-r from-cyan-600 to-purple-600 text-white rounded-2xl font-bold text-lg hover:scale-105 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Submitting...</span>
                </div>
              ) : 'Submit Application →'}
            </button>

            <p className="text-xs text-gray-600 text-center">
              We'll review your application and notify you within 24-48 hours
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
