'use client';

import { LucideIcon } from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  icon?: LucideIcon;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className = '' }: TabsProps) {
  return (
    <div className={`flex overflow-x-auto scrollbar-hide ${className}`}>
      <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/10 backdrop-blur-xl">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              type="button"
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition-all duration-200
                ${isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-white border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.15)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              {Icon && (
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : ''}`} />
              )}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
