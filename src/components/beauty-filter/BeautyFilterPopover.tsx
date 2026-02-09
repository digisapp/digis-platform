'use client';

import { RotateCcw } from 'lucide-react';
import { DEFAULT_SETTINGS } from '@/lib/beauty-filter/types';
import type { BeautyFilterSettings } from '@/lib/beauty-filter/types';

interface BeautyFilterPopoverProps {
  settings: BeautyFilterSettings;
  onSettingsChange: (settings: BeautyFilterSettings) => void;
  onClose: () => void;
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const percent = Math.round(value * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-white/80 text-xs font-medium">{label}</span>
        <span className="text-white/50 text-xs tabular-nums">{percent}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={percent}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-purple-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-400"
      />
    </div>
  );
}

export function BeautyFilterPopover({ settings, onSettingsChange, onClose }: BeautyFilterPopoverProps) {
  return (
    <div
      className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 bg-gray-900 rounded-xl border border-white/10 p-3 shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-white text-xs font-semibold">Beauty Filter</span>
        <button
          onClick={() => onSettingsChange({ ...DEFAULT_SETTINGS })}
          className="p-1 text-white/40 hover:text-white/80 transition-colors"
          title="Reset to defaults"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>
      <div className="space-y-3">
        <Slider
          label="Smooth"
          value={settings.smooth}
          onChange={(v) => onSettingsChange({ ...settings, smooth: v })}
        />
        <Slider
          label="Brightness"
          value={settings.brightness}
          onChange={(v) => onSettingsChange({ ...settings, brightness: v })}
        />
        <Slider
          label="Glow"
          value={settings.glow}
          onChange={(v) => onSettingsChange({ ...settings, glow: v })}
        />
      </div>
    </div>
  );
}
