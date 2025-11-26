'use client';

import { useEffect, useState } from 'react';

interface StreamHealthIndicatorProps {
  streamId: string;
}

type HealthStatus = 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected';

export function StreamHealthIndicator({ streamId }: StreamHealthIndicatorProps) {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('excellent');
  const [connectionState, setConnectionState] = useState<string>('Connected');
  const [isOnline, setIsOnline] = useState(true);
  const [ping, setPing] = useState<number>(0);

  useEffect(() => {
    // Monitor browser online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Simple health check using ping to server
    const checkHealth = async () => {
      if (!isOnline) {
        setHealthStatus('disconnected');
        setConnectionState('Offline');
        return;
      }

      try {
        const start = Date.now();
        const response = await fetch(`/api/streams/${streamId}/health`, {
          method: 'HEAD',
          cache: 'no-cache',
        }).catch(() => null);

        const latency = Date.now() - start;
        setPing(latency);

        if (!response || !response.ok) {
          setHealthStatus('poor');
          setConnectionState('Unstable');
        } else if (latency < 100) {
          setHealthStatus('excellent');
          setConnectionState('Connected');
        } else if (latency < 300) {
          setHealthStatus('good');
          setConnectionState('Connected');
        } else if (latency < 600) {
          setHealthStatus('fair');
          setConnectionState('Connected');
        } else {
          setHealthStatus('poor');
          setConnectionState('Connected');
        }
      } catch (error) {
        setHealthStatus('poor');
        setConnectionState('Error');
      }
    };

    // Check immediately
    checkHealth();

    // Then check every 5 seconds
    const interval = setInterval(checkHealth, 5000);

    return () => clearInterval(interval);
  }, [streamId, isOnline]);

  const getStatusConfig = () => {
    switch (healthStatus) {
      case 'excellent':
      case 'good':
        return {
          color: 'text-green-400',
          bgColor: 'bg-green-500/20',
          borderColor: 'border-green-500/30',
          icon: '🟢',
          label: 'Excellent',
          message: 'Your stream is running smoothly',
          tips: [],
        };
      case 'fair':
        return {
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/20',
          borderColor: 'border-yellow-500/30',
          icon: '🟡',
          label: 'Fair',
          message: 'Minor connection issues detected',
          tips: [
            'Check your internet connection',
            'Close other apps using bandwidth',
            'Move closer to your WiFi router',
          ],
        };
      case 'poor':
        return {
          color: 'text-orange-400',
          bgColor: 'bg-orange-500/20',
          borderColor: 'border-orange-500/30',
          icon: '🟠',
          label: 'Poor',
          message: 'Connection quality is degraded',
          tips: [
            'Check your internet connection',
            'Restart your router',
            'Use a wired connection if possible',
            'Lower your video quality',
          ],
        };
      case 'disconnected':
        return {
          color: 'text-red-400',
          bgColor: 'bg-red-500/20',
          borderColor: 'border-red-500/30',
          icon: '🔴',
          label: 'Disconnected',
          message: 'Stream connection lost',
          tips: [
            'Reconnecting automatically...',
            'Check your internet connection',
            'If problem persists, end and restart stream',
          ],
        };
    }
  };

  const config = getStatusConfig();

  const getDotColor = () => {
    switch (healthStatus) {
      case 'excellent':
      case 'good':
        return 'bg-green-500 shadow-green-500/50';
      case 'fair':
        return 'bg-yellow-500 shadow-yellow-500/50';
      case 'poor':
        return 'bg-orange-500 shadow-orange-500/50';
      case 'disconnected':
        return 'bg-red-500 shadow-red-500/50';
    }
  };

  return (
    <div className="relative group">
      {/* Simple colored circle */}
      <div className={`w-3 h-3 rounded-full ${getDotColor()} shadow-lg ${healthStatus === 'disconnected' ? 'animate-pulse' : ''}`} />

      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-black/90 rounded-lg text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        {config.label}
        {ping > 0 && <span className="text-gray-400 ml-1">({ping}ms)</span>}
      </div>
    </div>
  );
}
