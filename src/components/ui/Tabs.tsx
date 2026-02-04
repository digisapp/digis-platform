'use client';

import { useCallback, useId } from 'react';
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
  /** Optional label for the tab list (for accessibility) */
  ariaLabel?: string;
}

/**
 * Tabs component with full accessibility support
 *
 * Features:
 * - Proper ARIA roles (tablist, tab)
 * - Keyboard navigation (arrow keys, Home, End)
 * - Screen reader announcements
 */
export function Tabs({ tabs, activeTab, onChange, className = '', ariaLabel = 'Navigation tabs' }: TabsProps) {
  const tabsId = useId();

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    const tabCount = tabs.length;
    let newIndex: number | null = null;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        newIndex = (currentIndex + 1) % tabCount;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        newIndex = (currentIndex - 1 + tabCount) % tabCount;
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = tabCount - 1;
        break;
    }

    if (newIndex !== null) {
      onChange(tabs[newIndex].id);
      // Focus the newly selected tab
      const tabElement = document.getElementById(`${tabsId}-tab-${tabs[newIndex].id}`);
      tabElement?.focus();
    }
  }, [tabs, onChange, tabsId]);

  return (
    <div className={`flex overflow-x-auto scrollbar-hide ${className}`}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/10 backdrop-blur-xl"
      >
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              type="button"
              key={tab.id}
              id={`${tabsId}-tab-${tab.id}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`${tabsId}-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition-all duration-200
                ${isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-white border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.15)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              {Icon && (
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : ''}`} aria-hidden="true" />
              )}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
