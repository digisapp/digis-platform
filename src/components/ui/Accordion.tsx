'use client';

import { useState, useCallback, useId, ReactNode } from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';

interface AccordionItem {
  id: string;
  title: string;
  icon?: LucideIcon;
  content: ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  defaultOpen?: string[];
  allowMultiple?: boolean;
  className?: string;
}

/**
 * Accordion component with full accessibility support
 *
 * Features:
 * - Proper ARIA roles (region with aria-labelledby)
 * - Keyboard navigation (Enter, Space, Arrow keys, Home, End)
 * - Screen reader announcements for expanded/collapsed state
 */
export function Accordion({
  items,
  defaultOpen = [],
  allowMultiple = true,
  className = '',
}: AccordionProps) {
  const [openItems, setOpenItems] = useState<string[]>(defaultOpen);
  const accordionId = useId();

  const toggleItem = useCallback((itemId: string) => {
    setOpenItems((prev) => {
      const isOpen = prev.includes(itemId);

      if (isOpen) {
        return prev.filter((id) => id !== itemId);
      }

      if (allowMultiple) {
        return [...prev, itemId];
      }

      return [itemId];
    });
  }, [allowMultiple]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLButtonElement>, itemId: string, index: number) => {
    const itemCount = items.length;
    let targetIndex: number | null = null;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        toggleItem(itemId);
        break;
      case 'ArrowDown':
        e.preventDefault();
        targetIndex = (index + 1) % itemCount;
        break;
      case 'ArrowUp':
        e.preventDefault();
        targetIndex = (index - 1 + itemCount) % itemCount;
        break;
      case 'Home':
        e.preventDefault();
        targetIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        targetIndex = itemCount - 1;
        break;
    }

    if (targetIndex !== null) {
      const targetButton = document.getElementById(`${accordionId}-button-${items[targetIndex].id}`);
      targetButton?.focus();
    }
  }, [items, toggleItem, accordionId]);

  return (
    <div className={`space-y-2 ${className}`} role="presentation">
      {items.map((item, index) => {
        const isOpen = openItems.includes(item.id);
        const Icon = item.icon;
        const buttonId = `${accordionId}-button-${item.id}`;
        const panelId = `${accordionId}-panel-${item.id}`;

        return (
          <div
            key={item.id}
            className="glass rounded-xl border border-white/10 overflow-hidden"
          >
            <h3>
              <button
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggleItem(item.id)}
                onKeyDown={(e) => handleKeyDown(e, item.id, index)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-inset"
              >
                <div className="flex items-center gap-3">
                  {Icon && (
                    <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-lg">
                      <Icon className="w-4 h-4 text-cyan-400" aria-hidden="true" />
                    </div>
                  )}
                  <span className="font-semibold text-white">{item.title}</span>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                />
              </button>
            </h3>

            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className={`
                overflow-hidden transition-all duration-300 ease-in-out
                ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}
              `}
            >
              <div className="p-4 pt-0 border-t border-white/5">
                {item.content}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface AccordionSectionProps {
  children: ReactNode;
  className?: string;
}

export function AccordionSection({ children, className = '' }: AccordionSectionProps) {
  return <div className={`space-y-4 ${className}`}>{children}</div>;
}
