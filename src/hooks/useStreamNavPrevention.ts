'use client';

import { useEffect, useState } from 'react';

interface UseStreamNavPreventionOptions {
  isLive: boolean;
  hasManuallyEnded: boolean;
}

/**
 * Prevents accidental navigation away from a live stream.
 * Handles: browser back/forward, page refresh, keyboard shortcuts,
 * swipe gestures, and trackpad navigation.
 */
export function useStreamNavPrevention({ isLive, hasManuallyEnded }: UseStreamNavPreventionOptions) {
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isLeaveAttempt, setIsLeaveAttempt] = useState(false);

  useEffect(() => {
    if (!isLive || hasManuallyEnded) return;

    // Prevent browser back/forward navigation
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, '', window.location.href);
      setIsLeaveAttempt(true);
      setShowEndConfirm(true);
    };

    // Prevent page refresh/close
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'You are currently streaming. Are you sure you want to leave?';
      return e.returnValue;
    };

    // Prevent keyboard shortcuts that navigate away
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        setIsLeaveAttempt(true);
        setShowEndConfirm(true);
        return;
      }
      if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        setIsLeaveAttempt(true);
        setShowEndConfirm(true);
        return;
      }
      if (e.key === 'Backspace') {
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        if (!isInput) {
          e.preventDefault();
        }
      }
    };

    // Prevent swipe gestures on touch devices
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      (window as any).__streamTouchStartX = touch.clientX;
      (window as any).__streamTouchStartY = touch.clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!('__streamTouchStartX' in window)) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - (window as any).__streamTouchStartX;
      const deltaY = touch.clientY - (window as any).__streamTouchStartY;
      if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 50 && (window as any).__streamTouchStartX < 30) {
        e.preventDefault();
      }
    };

    // Prevent mouse wheel horizontal navigation (trackpad two-finger swipe)
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > 50 && Math.abs(e.deltaX) > Math.abs(e.deltaY) * 2) {
        const target = e.target as HTMLElement;
        const scrollable = target.closest('[data-scrollable]') || document.scrollingElement;
        if (scrollable) {
          const atLeftEdge = scrollable.scrollLeft === 0;
          const atRightEdge = scrollable.scrollLeft >= scrollable.scrollWidth - scrollable.clientWidth;
          if ((atLeftEdge && e.deltaX < 0) || (atRightEdge && e.deltaX > 0)) {
            e.preventDefault();
          }
        }
      }
    };

    window.history.pushState(null, '', window.location.href);

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      delete (window as any).__streamTouchStartX;
      delete (window as any).__streamTouchStartY;
    };
  }, [isLive, hasManuallyEnded]);

  return {
    showEndConfirm,
    setShowEndConfirm,
    isLeaveAttempt,
    setIsLeaveAttempt,
  };
}
