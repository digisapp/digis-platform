'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { useBeautyFilter } from '@/hooks/useBeautyFilter';
import { BeautyFilterPopover } from './BeautyFilterPopover';

interface BeautyFilterToggleProps {
  /** Button style variant */
  variant?: 'toolbar' | 'control';
}

export function BeautyFilterToggle({ variant = 'toolbar' }: BeautyFilterToggleProps) {
  const { enabled, settings, toggle, updateSettings, supported } = useBeautyFilter();
  const [showPopover, setShowPopover] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    if (!showPopover) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPopover(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPopover]);

  if (!supported) return null;

  if (variant === 'control') {
    // FaceTime-style circular button
    return (
      <div ref={containerRef} className="relative">
        <button
          onClick={toggle}
          onContextMenu={(e) => {
            e.preventDefault();
            setShowPopover(!showPopover);
          }}
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
            enabled
              ? 'bg-purple-500 text-white'
              : 'bg-white/20 backdrop-blur-xl text-white hover:bg-white/30 border border-white/30'
          }`}
          title="Beauty Filter (long press for settings)"
        >
          <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        {/* Chevron to open settings */}
        <button
          onClick={() => setShowPopover(!showPopover)}
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gray-800 border border-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
        {showPopover && (
          <BeautyFilterPopover
            settings={settings}
            onSettingsChange={updateSettings}
            onClose={() => setShowPopover(false)}
          />
        )}
      </div>
    );
  }

  // Toolbar-style button (for broadcaster)
  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={toggle}
        className={`min-w-[48px] min-h-[48px] p-3 backdrop-blur-xl rounded-full text-white transition-all border shadow-lg ${
          enabled
            ? 'bg-purple-500/80 border-purple-400/50 hover:bg-purple-500/90'
            : 'bg-black/70 border-white/20 hover:bg-black/90'
        } active:scale-95`}
        title="Beauty Filter"
      >
        <Sparkles className={`w-6 h-6 ${enabled ? 'text-white' : 'text-white/80'}`} />
      </button>
      {/* Chevron to open settings */}
      <button
        onClick={() => setShowPopover(!showPopover)}
        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gray-800 border border-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>
      {showPopover && (
        <BeautyFilterPopover
          settings={settings}
          onSettingsChange={updateSettings}
          onClose={() => setShowPopover(false)}
        />
      )}
    </div>
  );
}
