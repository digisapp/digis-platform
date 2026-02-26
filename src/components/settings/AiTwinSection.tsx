'use client';

import { useRouter } from 'next/navigation';
import { Sparkles, Bot, Mic, MessageSquare } from 'lucide-react';

export function AiTwinSection() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Bot className="w-5 h-5 text-cyan-400" />
          AI Twin
          <span className="px-2 py-0.5 text-xs bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-white">
            Beta
          </span>
        </h3>
        <p className="text-sm text-gray-400 mb-3">
          Let fans chat with your AI clone via voice or text 24/7. Set up personality, voice, boundaries, and pricing.
        </p>
        <button
          type="button"
          onClick={() => router.push('/creator/ai-twin')}
          className="w-full px-6 py-4 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:to-purple-500/30 border border-cyan-500/30 rounded-xl font-semibold text-white hover:scale-[1.01] transition-all flex items-center justify-center gap-3"
        >
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-cyan-400" />
            <MessageSquare className="w-5 h-5 text-purple-400" />
          </div>
          <span>Configure AI Twin</span>
        </button>
      </div>
    </div>
  );
}
