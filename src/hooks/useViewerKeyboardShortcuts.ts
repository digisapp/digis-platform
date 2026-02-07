'use client';

import { useEffect } from 'react';

interface UseViewerKeyboardShortcutsOptions {
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onToggleChat: () => void;
  isFullscreen: boolean;
}

/**
 * Desktop keyboard shortcuts for the stream viewer:
 * M = toggle mute, F = toggle fullscreen, C = toggle chat, Escape = exit fullscreen.
 */
export function useViewerKeyboardShortcuts({
  onToggleMute,
  onToggleFullscreen,
  onToggleChat,
  isFullscreen,
}: UseViewerKeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'm':
          onToggleMute();
          break;
        case 'f':
          onToggleFullscreen();
          break;
        case 'c':
          onToggleChat();
          break;
        case 'escape':
          if (isFullscreen) {
            onToggleFullscreen();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onToggleMute, onToggleFullscreen, onToggleChat, isFullscreen]);
}
