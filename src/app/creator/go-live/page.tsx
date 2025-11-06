'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { createClient } from '@/lib/supabase/client';

export default function GoLivePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [isCreator, setIsCreator] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkCreatorStatus();
  }, []);

  const checkCreatorStatus = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/');
        return;
      }

      // Check if user is a creator
      const response = await fetch('/api/user/profile');
      const data = await response.json();

      if (data.user?.role === 'creator') {
        setIsCreator(true);
      } else {
        setError('You need to be a creator to start streaming');
      }
    } catch (err) {
      setError('Failed to verify creator status');
    } finally {
      setLoading(false);
    }
  };

  const handleStartStream = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Please enter a stream title');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const response = await fetch('/api/streams/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to broadcast studio
        router.push(`/stream/broadcast/${data.stream.id}`);
      } else {
        setError(data.error || 'Failed to start stream');
      }
    } catch (err) {
      setError('Failed to start stream. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isCreator) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-black/40 backdrop-blur-md rounded-2xl border-2 border-white/10 p-8 text-center">
          <div className="text-6xl mb-4">🎥</div>
          <h1 className="text-2xl font-bold text-white mb-4">Creator Access Required</h1>
          <p className="text-gray-400 mb-6">
            You need to be a verified creator to start live streaming.
          </p>
          <GlassButton
            variant="gradient"
            size="lg"
            onClick={() => router.push('/creator/apply')}
            className="w-full"
            shimmer
            glow
          >
            Apply to Be a Creator
          </GlassButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎥</div>
            <h1 className="text-4xl font-bold text-white mb-2">Go Live</h1>
            <p className="text-gray-400">
              Start streaming and connect with your fans
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleStartStream} className="space-y-6">
            <div className="bg-black/40 backdrop-blur-md rounded-2xl border-2 border-white/10 p-8 space-y-6">
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-semibold text-white mb-2">
                  Stream Title *
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What's your stream about?"
                  className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-digis-cyan transition-colors"
                  maxLength={100}
                  required
                />
                <div className="mt-2 text-xs text-gray-500 text-right">
                  {title.length}/100
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-white mb-2">
                  Description (Optional)
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell viewers what to expect..."
                  className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-digis-cyan transition-colors resize-none"
                  rows={4}
                  maxLength={500}
                />
                <div className="mt-2 text-xs text-gray-500 text-right">
                  {description.length}/500
                </div>
              </div>

              {/* Pre-Stream Tips */}
              <div className="bg-digis-cyan/10 border border-digis-cyan/30 rounded-xl p-4">
                <h3 className="text-sm font-bold text-digis-cyan mb-2">💡 Tips for a Great Stream</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Test your camera and microphone before going live</li>
                  <li>• Choose a well-lit, quiet location</li>
                  <li>• Engage with your viewers in chat</li>
                  <li>• Have fun and be yourself!</li>
                </ul>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-500/20 border border-red-500 rounded-xl p-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <GlassButton
                type="button"
                variant="ghost"
                size="lg"
                onClick={() => router.back()}
                className="flex-1"
              >
                Cancel
              </GlassButton>
              <GlassButton
                type="submit"
                variant="gradient"
                size="lg"
                disabled={!title.trim() || isCreating}
                className="flex-1"
                shimmer
                glow
              >
                {isCreating ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Starting...</span>
                  </>
                ) : (
                  <>
                    <span className="text-xl mr-2">📹</span>
                    Start Streaming
                  </>
                )}
              </GlassButton>
            </div>
          </form>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-4 text-center">
              <div className="text-3xl mb-2">💰</div>
              <div className="text-sm font-semibold text-white mb-1">Earn Coins</div>
              <div className="text-xs text-gray-400">Receive virtual gifts from fans</div>
            </div>
            <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-4 text-center">
              <div className="text-3xl mb-2">💬</div>
              <div className="text-sm font-semibold text-white mb-1">Live Chat</div>
              <div className="text-xs text-gray-400">Interact with viewers in real-time</div>
            </div>
            <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-4 text-center">
              <div className="text-3xl mb-2">📊</div>
              <div className="text-sm font-semibold text-white mb-1">Track Stats</div>
              <div className="text-xs text-gray-400">Monitor viewers and earnings</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
