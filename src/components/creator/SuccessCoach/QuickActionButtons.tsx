'use client';

import { Sparkles, Radio, Video, Coins } from 'lucide-react';
import { QUICK_ACTIONS } from '@/lib/coach/types';

interface QuickActionButtonsProps {
  onAction: (prompt: string) => void;
  onStartScriptGenerator: () => void;
  disabled?: boolean;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles,
  Radio,
  Video,
  Coins
};

export function QuickActionButtons({
  onAction,
  onStartScriptGenerator,
  disabled
}: QuickActionButtonsProps) {
  const handleClick = (action: typeof QUICK_ACTIONS[number]) => {
    if (action.flow === 'script-generator') {
      onStartScriptGenerator();
    } else {
      onAction(action.prompt);
    }
  };

  return (
    <div className="flex gap-2 px-4 py-3 border-b border-white/5 overflow-x-auto scrollbar-hide">
      {QUICK_ACTIONS.map((action) => {
        const Icon = iconMap[action.icon] || Sparkles;

        return (
          <button
            key={action.id}
            onClick={() => handleClick(action)}
            disabled={disabled}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-white/[0.04] hover:bg-purple-500/15 border border-white/10 hover:border-purple-500/25 text-gray-300 hover:text-purple-300 transition-all disabled:opacity-50 whitespace-nowrap flex-shrink-0"
          >
            <Icon className="w-3.5 h-3.5" />
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
