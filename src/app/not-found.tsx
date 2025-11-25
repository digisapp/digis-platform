import Link from 'next/link';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center px-4">
      <div className="text-center max-w-2xl mx-auto">
        {/* 404 Number with Tron glow */}
        <div className="relative mb-8">
          <div className="absolute inset-0 blur-3xl bg-gradient-to-r from-digis-cyan via-purple-500 to-digis-pink opacity-20" />
          <h1 className="relative text-9xl font-black bg-gradient-to-r from-digis-cyan via-purple-500 to-digis-pink bg-clip-text text-transparent">
            404
          </h1>
        </div>

        {/* Message */}
        <h2 className="text-3xl font-bold text-white mb-4">
          Page Not Found
        </h2>
        <p className="text-gray-400 mb-8 text-lg">
          The page you're looking for doesn't exist or has been moved.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-digis-cyan to-digis-pink text-white font-semibold hover:opacity-90 transition-opacity"
          >
            <Home className="w-5 h-5" />
            Go Home
          </Link>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg backdrop-blur-xl bg-white/5 border border-cyan-500/30 text-white font-semibold hover:bg-white/10 transition-colors"
          >
            <Search className="w-5 h-5" />
            Explore Creators
          </Link>
        </div>

        {/* Decorative elements */}
        <div className="mt-16 flex items-center justify-center gap-2 text-gray-500 text-sm">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-cyan-500/30" />
          <span>Lost in the grid</span>
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-cyan-500/30" />
        </div>
      </div>
    </div>
  );
}
