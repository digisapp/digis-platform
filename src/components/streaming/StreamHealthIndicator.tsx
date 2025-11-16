'use client';

import { useEffect, useState } from 'react';

interface StreamHealthIndicatorProps {
  streamId: string;
}

type HealthStatus = 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected';

export function StreamHealthIndicator({ streamId }: StreamHealthIndicatorProps) {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('excellent');
  const [showDetails, setShowDetails] = useState(false);
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

  return (
    <div className="relative">
      {/* Main Indicator Button */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${config.borderColor} ${config.bgColor} backdrop-blur-sm transition-all hover:scale-105`}
      >
        <span className="text-sm">{config.icon}</span>
        <span className={`text-sm font-semibold ${config.color}`}>
          {config.label}
        </span>
        <svg
          className={`w-4 h-4 ${config.color} transition-transform ${showDetails ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expandable Details */}
      {showDetails && (
        <div className="absolute top-full right-0 mt-2 w-80 backdrop-blur-xl bg-slate-900/95 rounded-xl border border-white/20 shadow-2xl p-4 z-50 animate-slideDown">
          <div className="flex items-start gap-3 mb-3">
            <span className="text-2xl">{config.icon}</span>
            <div className="flex-1">
              <h3 className={`font-bold text-lg ${config.color}`}>
                Stream Quality: {config.label}
              </h3>
              <p className="text-sm text-gray-300 mt-1">{config.message}</p>
            </div>
          </div>

          {/* Connection Details */}
          <div className="bg-white/5 rounded-lg p-3 mb-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Connection State:</span>
              <span className="text-white font-medium">{connectionState}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Latency:</span>
              <span className="text-white font-medium">{ping > 0 ? `${ping}ms` : 'Checking...'}</span>
            </div>
          </div>

          {/* Tips */}
          {config.tips.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-white mb-2">💡 Tips to Improve:</h4>
              <ul className="space-y-1.5">
                {config.tips.map((tip, index) => (
                  <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-cyan-400 mt-0.5">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warning for poor/disconnected */}
          {(healthStatus === 'poor' || healthStatus === 'disconnected') && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-xs text-gray-400">
                Your viewers may experience buffering or quality issues.
              </p>
            </div>
          )}
        </div>
      )}

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
