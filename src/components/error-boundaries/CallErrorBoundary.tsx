'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';
import { RefreshCw, PhoneOff, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  callId?: string;
  participantName?: string;
  onRetry?: () => void;
  onEndCall?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

/**
 * Error Boundary for Video Calls
 *
 * Catches errors in video call components (WebRTC, LiveKit, etc.)
 * Provides options to retry connection or safely end the call.
 */
export class CallErrorBoundary extends Component<Props, State> {
  private maxRetries = 2; // Fewer retries for calls since they're time-sensitive

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[CallErrorBoundary] Caught error:', error);
    console.error('[CallErrorBoundary] Component stack:', errorInfo.componentStack);

    Sentry.captureException(error, {
      tags: {
        component: 'video_call',
        callId: this.props.callId,
      },
      extra: {
        componentStack: errorInfo.componentStack,
        participantName: this.props.participantName,
        retryCount: this.state.retryCount,
      },
    });
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prev => ({
        hasError: false,
        error: null,
        retryCount: prev.retryCount + 1,
      }));
      this.props.onRetry?.();
    }
  };

  handleEndCall = () => {
    if (this.props.onEndCall) {
      this.props.onEndCall();
    } else {
      // Navigate to dashboard if no handler provided
      window.location.href = '/dashboard';
    }
  };

  render() {
    if (this.state.hasError) {
      const canRetry = this.state.retryCount < this.maxRetries;

      return (
        <div className="absolute inset-0 bg-black flex items-center justify-center p-4 z-50">
          <div className="max-w-sm w-full text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-red-400" />
            </div>

            <h2 className="text-xl font-bold text-white mb-2">
              Call Error
            </h2>

            <p className="text-gray-400 text-sm mb-2">
              {this.props.participantName
                ? `The call with ${this.props.participantName} encountered an issue.`
                : 'The video call encountered an issue.'}
            </p>

            <p className="text-gray-500 text-xs mb-4">
              This could be due to a network issue or device permissions.
            </p>

            {!canRetry && (
              <p className="text-red-400 text-sm mb-4">
                Unable to reconnect. Please end this call and try again.
              </p>
            )}

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-4 p-3 bg-red-900/30 rounded-lg text-left">
                <p className="text-red-300 text-xs font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {canRetry && (
                <button
                  onClick={this.handleRetry}
                  className="w-full px-4 py-3 bg-gradient-to-r from-cyan-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reconnect ({this.maxRetries - this.state.retryCount} left)
                </button>
              )}

              <button
                onClick={this.handleEndCall}
                className="w-full px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <PhoneOff className="w-4 h-4" />
                End Call
              </button>
            </div>

            <p className="mt-4 text-gray-500 text-xs">
              You will not be charged for this call if it failed to connect.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
