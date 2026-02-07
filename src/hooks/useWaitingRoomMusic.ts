'use client';

import { useEffect, useRef } from 'react';

interface UseWaitingRoomMusicOptions {
  shouldPlay: boolean;
  volume?: number;
  src?: string;
}

/**
 * Plays looping waiting room music for non-ticket holders during ticketed streams.
 * Handles autoplay policies by retrying on user interaction.
 */
export function useWaitingRoomMusic({
  shouldPlay,
  volume = 0.3,
  src = '/sounds/waiting-room.mp3',
}: UseWaitingRoomMusicOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (shouldPlay) {
      if (!audioRef.current) {
        const audio = new Audio(src);
        audio.volume = volume;
        audio.loop = true;
        audioRef.current = audio;

        audio.play().catch(() => {
          const startOnInteraction = () => {
            if (audioRef.current) {
              audioRef.current.play().catch(() => {});
            }
            document.removeEventListener('click', startOnInteraction);
            document.removeEventListener('touchstart', startOnInteraction);
          };
          document.addEventListener('click', startOnInteraction, { once: true });
          document.addEventListener('touchstart', startOnInteraction, { once: true });
        });
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [shouldPlay, src, volume]);
}
