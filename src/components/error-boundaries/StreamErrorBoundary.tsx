'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';
import { RefreshCw, ArrowLeft, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  streamId?: string;
  creatorName?: string;
  onRetry?: () => void;
  onLeave?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

/**
 * Error Boundary for Live Streams and VODs
 *
 * Catches errors in stream playback, chat, and related components.
 * Provides contextual recovery options specific to streaming.
 */
export class StreamErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[StreamErrorBoundary] Caught error:', error);
    console.error('[StreamErrorBoundary] Component stack:', errorInfo.componentStack);

    Sentry.captureException(error, {
      tags: {
        component: 'stream',
        streamId: this.props.streamId,
      },
      extra: {
        componentStack: errorInfo.componentStack,
        creatorName: this.props.creatorName,
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

  handleLeave = () => {
    if (this.props.onLeave) {
      this.props.onLeave();
    } else {
      window.history.back();
    }
  };

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const canRetry = this.state.retryCount < this.maxRetries;

      return (
        <div className="absolute inset-0 bg-black/95 flex items-center justify-center p-4 z-50">
          <div className="max-w-sm w-full text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-500/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-orange-400" />
            </div>

            <h2 className="text-xl font-bold text-white mb-2">
              Stream Error
            </h2>

            <p className="text-gray-400 text-sm mb-4">
              {this.props.creatorName
                ? `We're having trouble loading ${this.props.creatorName}'s stream.`
                : "We're having trouble loading this stream."}
            </p>

            {!canRetry && (
              <p className="text-orange-400 text-sm mb-4">
                Multiple retries failed. The stream may have ended or there may be a connection issue.
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
                  Try Again ({this.maxRetries - this.state.retryCount} left)
                </button>
              )}

              <button
                onClick={this.handleRefresh}
                className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Page
              </button>

              <button
                onClick={this.handleLeave}
                className="w-full px-4 py-3 text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Leave Stream
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
