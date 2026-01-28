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
    <div className="flex flex-wrap gap-2 p-3 border-b border-white/10">
      {QUICK_ACTIONS.map((action) => {
        const Icon = iconMap[action.icon] || Sparkles;

        return (
          <button
            key={action.id}
            onClick={() => handleClick(action)}
            disabled={disabled}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon className="w-3.5 h-3.5" />
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
