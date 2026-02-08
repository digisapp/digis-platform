'use client';

import { useRouter } from 'next/navigation';
import { CheckCircle, Circle, Sparkles, X, GraduationCap } from 'lucide-react';

interface DashboardChecklistProps {
  userProfile: any;
  dismissedChecklist: boolean;
  onDismiss: () => void;
}

export function DashboardChecklist({ userProfile, dismissedChecklist, onDismiss }: DashboardChecklistProps) {
  const router = useRouter();

  if (!userProfile || dismissedChecklist) return null;

  return (
    <div className="mb-6 relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 via-cyan-500/10 to-pink-500/10 border-2 border-cyan-500/30 p-6 shadow-[0_0_30px_rgba(34,211,238,0.15)]">
      <button
        onClick={onDismiss}
        className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20">
          <Sparkles className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Get Ready to Earn</h2>
          <p className="text-sm text-gray-400">Complete your profile and start promoting</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          onClick={() => router.push('/settings')}
          className={`flex items-center gap-3 p-4 rounded-xl transition-all ${
            userProfile.avatarUrl
              ? 'bg-green-500/10 border border-green-500/30'
              : 'bg-white/5 border border-white/10 hover:border-cyan-500/50'
          }`}
        >
          {userProfile.avatarUrl ? (
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          ) : (
            <Circle className="w-5 h-5 text-gray-500 flex-shrink-0" />
          )}
          <span className={`text-sm font-medium ${userProfile.avatarUrl ? 'text-green-400' : 'text-white'}`}>
            Upload profile picture
          </span>
        </button>

        <button
          onClick={() => router.push('/creator/pricing')}
          className={`flex items-center gap-3 p-4 rounded-xl transition-all ${
            userProfile.perMinuteRate > 0
              ? 'bg-green-500/10 border border-green-500/30'
              : 'bg-white/5 border border-white/10 hover:border-cyan-500/50'
          }`}
        >
          {userProfile.perMinuteRate > 0 ? (
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          ) : (
            <Circle className="w-5 h-5 text-gray-500 flex-shrink-0" />
          )}
          <span className={`text-sm font-medium ${userProfile.perMinuteRate > 0 ? 'text-green-400' : 'text-white'}`}>
            Set Pricing rates
          </span>
        </button>
      </div>

      <button
        onClick={() => router.push('/creator/learn')}
        className="w-full mt-4 flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 hover:border-yellow-500/50 transition-all"
      >
        <GraduationCap className="w-5 h-5 text-yellow-400" />
        <span className="text-sm font-semibold text-yellow-400">Read Digis 101</span>
        <span className="text-xs text-gray-400">— Learn all the features</span>
      </button>

      <p className="text-xs text-gray-500 mt-3 text-center">
        Let fans know they can watch you Stream and send gifts 🎁
      </p>
    </div>
  );
}
