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
    bio: '',
    instagramHandle: '',
    twitterHandle: '',
    website: '',
    whyCreator: '',
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
                <h2 className="text-2xl font-bold mb-2">Application Pending</h2>
                <p className="text-gray-400 mb-4">
                  Your creator application is currently under review. We'll notify you once it's been reviewed.
                </p>
                <div className="text-left mt-6 p-4 bg-white/5 rounded-lg">
                  <p className="text-sm text-gray-400 mb-2">Submitted: {new Date(existingApplication.createdAt).toLocaleDateString()}</p>
                  <p className="text-sm"><strong>Display Name:</strong> {existingApplication.displayName}</p>
                  <p className="text-sm"><strong>Content Type:</strong> {existingApplication.contentType}</p>
                </div>
              </>
            )}
            {existingApplication.status === 'approved' && (
              <>
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">You're Already a Creator!</h2>
                <p className="text-gray-400 mb-4">
                  Your application has been approved. You can start creating content now.
                </p>
                <button
                  onClick={() => router.push('/creator/dashboard')}
                  className="px-6 py-3 bg-gradient-to-r from-digis-cyan to-digis-pink rounded-lg font-semibold hover:scale-105 transition-transform"
                >
                  Go to Creator Dashboard
                </button>
              </>
            )}
            {existingApplication.status === 'rejected' && (
              <>
                <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Application Not Approved</h2>
                <p className="text-gray-400 mb-4">
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
            <GlassInput
              label="Display Name"
              placeholder="Your creator name"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              required
            />

            <div>
              <label className="block text-sm font-medium mb-2">Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell us about yourself..."
                rows={4}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-digis-cyan transition-colors resize-none"
              />
            </div>

            <GlassInput
              label="Content Type"
              placeholder="e.g., Gaming, Music, Art, Education"
              value={formData.contentType}
              onChange={(e) => setFormData({ ...formData, contentType: e.target.value })}
              required
            />

            <div>
              <label className="block text-sm font-medium mb-2">Why do you want to be a creator?</label>
              <textarea
                value={formData.whyCreator}
                onChange={(e) => setFormData({ ...formData, whyCreator: e.target.value })}
                placeholder="Share your motivation..."
                rows={4}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-digis-cyan transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <GlassInput
                label="Instagram Handle (optional)"
                placeholder="@username"
                value={formData.instagramHandle}
                onChange={(e) => setFormData({ ...formData, instagramHandle: e.target.value })}
              />

              <GlassInput
                label="Twitter Handle (optional)"
                placeholder="@username"
                value={formData.twitterHandle}
                onChange={(e) => setFormData({ ...formData, twitterHandle: e.target.value })}
              />
            </div>

            <GlassInput
              label="Website (optional)"
              placeholder="https://..."
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            />

            {error && (
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500 text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-digis-cyan to-digis-pink rounded-lg font-semibold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
