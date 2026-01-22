/**
 * Lazy-loaded heavy components
 * These components use LiveKit which adds ~200KB+ to the bundle
 * Import from here to code-split and lazy load them
 */
import dynamic from 'next/dynamic';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <LoadingSpinner size="lg" label="Loading video..." />
  </div>
);

// Lazy load VideoCall component
export const LazyVideoCall = dynamic(
  () => import('@/components/calls/VideoCall').then(mod => mod.VideoCall),
  {
    loading: LoadingFallback,
    ssr: false, // LiveKit requires client-side only
  }
);

// Lazy load VoiceCall component  
export const LazyVoiceCall = dynamic(
  () => import('@/components/calls/VoiceCall').then(mod => mod.VoiceCall),
  {
    loading: LoadingFallback,
    ssr: false,
  }
);

// Lazy load LivePlayer for stream viewing (default export)
export const LazyLivePlayer = dynamic(
  () => import('@/components/live/LivePlayer'),
  {
    loading: LoadingFallback,
    ssr: false,
  }
);

// Lazy load GuestStreamView for guest co-hosting
export const LazyGuestStreamView = dynamic(
  () => import('@/components/streaming/GuestStreamView').then(mod => mod.GuestStreamView),
  {
    loading: LoadingFallback,
    ssr: false,
  }
);

// Lazy load GuestVideoOverlay
export const LazyGuestVideoOverlay = dynamic(
  () => import('@/components/streaming/GuestVideoOverlay').then(mod => mod.GuestVideoOverlay),
  {
    loading: LoadingFallback,
    ssr: false,
  }
);
