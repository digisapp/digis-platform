'use client';

import { useEffect, useState } from 'react';

/**
 * Detects device orientation and browser type.
 * Tracks portrait mode (mobile only), landscape mode, and Safari browser.
 */
export function useDeviceOrientation() {
  const [isPortraitDevice, setIsPortraitDevice] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [isSafari, setIsSafari] = useState(false);

  // Detect Safari browser
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    setIsSafari(ua.includes('safari') && !ua.includes('chrome') && !ua.includes('chromium'));
  }, []);

  // Check device orientation on mount and window resize
  useEffect(() => {
    const checkOrientation = () => {
      const isMobile = window.innerWidth <= 768;
      setIsPortraitDevice(isMobile && window.innerHeight > window.innerWidth);
      setIsLandscape(window.matchMedia('(orientation: landscape)').matches);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  return { isPortraitDevice, isLandscape, isSafari };
}
