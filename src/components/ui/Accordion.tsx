'use client';

import { useState, ReactNode } from 'react';
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

export function Accordion({
  items,
  defaultOpen = [],
  allowMultiple = true,
  className = '',
}: AccordionProps) {
  const [openItems, setOpenItems] = useState<string[]>(defaultOpen);

  const toggleItem = (itemId: string) => {
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
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {items.map((item) => {
        const isOpen = openItems.includes(item.id);
        const Icon = item.icon;

        return (
          <div
            key={item.id}
            className="glass rounded-xl border border-white/10 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggleItem(item.id)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                {Icon && (
                  <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-lg">
                    <Icon className="w-4 h-4 text-cyan-400" />
                  </div>
                )}
                <span className="font-semibold text-white">{item.title}</span>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            <div
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
