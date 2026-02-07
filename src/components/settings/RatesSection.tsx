'use client';

import { useRouter } from 'next/navigation';
import { DollarSign, Video, Phone } from 'lucide-react';

export function RatesSection() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-400" />
          Rates
        </h3>
        <p className="text-sm text-gray-400 mb-3">
          Set your rates for video calls, voice calls, and messages. Toggle call availability on or off.
        </p>
        <button
          type="button"
          onClick={() => router.push('/creator/pricing')}
          className="w-full px-6 py-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 border border-green-500/30 rounded-xl font-semibold text-white hover:scale-[1.01] transition-all flex items-center justify-center gap-3"
        >
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-green-400" />
            <Phone className="w-5 h-5 text-green-400" />
          </div>
          <span>Manage Rates & Call Settings</span>
        </button>
      </div>
    </div>
  );
}
