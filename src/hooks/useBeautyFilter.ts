'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocalParticipant } from '@livekit/components-react';
import { Track, LocalVideoTrack } from 'livekit-client';
import { BeautyFilterProcessor } from '@/lib/beauty-filter/BeautyFilterProcessor';
import { DEFAULT_SETTINGS, STORAGE_KEY } from '@/lib/beauty-filter/types';
import type { BeautyFilterSettings } from '@/lib/beauty-filter/types';

interface UseBeautyFilterReturn {
  enabled: boolean;
  settings: BeautyFilterSettings;
  toggle: () => void;
  updateSettings: (settings: BeautyFilterSettings) => void;
  supported: boolean;
}

function loadPersistedState(): { enabled: boolean; settings: BeautyFilterSettings } {
  if (typeof window === 'undefined') {
    return { enabled: false, settings: { ...DEFAULT_SETTINGS } };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        enabled: !!parsed.enabled,
        settings: {
          smooth: parsed.settings?.smooth ?? DEFAULT_SETTINGS.smooth,
          brightness: parsed.settings?.brightness ?? DEFAULT_SETTINGS.brightness,
          glow: parsed.settings?.glow ?? DEFAULT_SETTINGS.glow,
        },
      };
    }
  } catch {}
  return { enabled: false, settings: { ...DEFAULT_SETTINGS } };
}

function persistState(enabled: boolean, settings: BeautyFilterSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled, settings }));
  } catch {}
}

export function useBeautyFilter(): UseBeautyFilterReturn {
  const { localParticipant } = useLocalParticipant();
  const processorRef = useRef<BeautyFilterProcessor | null>(null);
  const [supported] = useState(() => BeautyFilterProcessor.isSupported());

  const persisted = loadPersistedState();
  const [enabled, setEnabled] = useState(persisted.enabled);
  const [settings, setSettings] = useState<BeautyFilterSettings>(persisted.settings);

  // Attach/detach processor when enabled changes
  useEffect(() => {
    if (!supported) return;

    const cameraPublication = localParticipant.getTrackPublication(Track.Source.Camera);
    const localTrack = cameraPublication?.track;
    if (!localTrack || !(localTrack instanceof LocalVideoTrack)) return;

    if (enabled) {
      const processor = new BeautyFilterProcessor(settings);
      processorRef.current = processor;
      localTrack.setProcessor(processor, true).catch((err) => {
        console.error('[BeautyFilter] Failed to attach processor:', err);
      });
    } else {
      if (processorRef.current) {
        localTrack.stopProcessor().catch((err) => {
          console.error('[BeautyFilter] Failed to detach processor:', err);
        });
        processorRef.current = null;
      }
    }

    return () => {
      if (processorRef.current) {
        const track = localParticipant.getTrackPublication(Track.Source.Camera)?.track;
        if (track instanceof LocalVideoTrack) {
          track.stopProcessor().catch(() => {});
        }
        processorRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, supported, localParticipant]);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      persistState(next, settings);
      return next;
    });
  }, [settings]);

  const updateSettings = useCallback((newSettings: BeautyFilterSettings) => {
    setSettings(newSettings);
    persistState(enabled, newSettings);
    if (processorRef.current) {
      processorRef.current.updateSettings(newSettings);
    }
  }, [enabled]);

  return { enabled, settings, toggle, updateSettings, supported };
}
