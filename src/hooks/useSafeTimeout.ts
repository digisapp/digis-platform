'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * A hook that provides a safe setTimeout that automatically cleans up on unmount.
 * Prevents "Can't perform a React state update on an unmounted component" warnings.
 *
 * @returns Object with setTimeout and clearTimeout functions
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { setSafeTimeout, clearSafeTimeout } = useSafeTimeout();
 *
 *   const handleClick = () => {
 *     setSafeTimeout(() => {
 *       // This will NOT run if component unmounts
 *       setShowAnimation(false);
 *     }, 2000);
 *   };
 *
 *   return <button onClick={handleClick}>Animate</button>;
 * }
 * ```
 */
export function useSafeTimeout() {
  const timeoutIds = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const isMounted = useRef(true);

  // Cleanup all timeouts on unmount
  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
      // Clear all pending timeouts
      timeoutIds.current.forEach((id) => clearTimeout(id));
      timeoutIds.current.clear();
    };
  }, []);

  const setSafeTimeout = useCallback(
    (callback: () => void, delay: number): ReturnType<typeof setTimeout> => {
      const id = setTimeout(() => {
        // Remove from tracking set
        timeoutIds.current.delete(id);
        // Only execute if still mounted
        if (isMounted.current) {
          callback();
        }
      }, delay);

      // Track this timeout
      timeoutIds.current.add(id);
      return id;
    },
    []
  );

  const clearSafeTimeout = useCallback((id: ReturnType<typeof setTimeout>) => {
    clearTimeout(id);
    timeoutIds.current.delete(id);
  }, []);

  return { setSafeTimeout, clearSafeTimeout, isMounted: isMounted.current };
}

/**
 * A simpler hook that just tracks mounted state.
 * Useful for existing code that uses native setTimeout.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isMounted = useIsMounted();
 *
 *   useEffect(() => {
 *     setTimeout(() => {
 *       if (isMounted.current) {
 *         setState(newValue);
 *       }
 *     }, 1000);
 *   }, []);
 * }
 * ```
 */
export function useIsMounted() {
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return isMounted;
}
