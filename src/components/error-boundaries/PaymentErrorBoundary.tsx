'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';
import { RefreshCw, X, AlertTriangle, CreditCard } from 'lucide-react';

interface Props {
  children: ReactNode;
  transactionType?: string; // 'tip', 'gift', 'purchase', 'subscription'
  amount?: number;
  onRetry?: () => void;
  onClose?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary for Payment/Purchase Modals
 *
 * Catches errors in payment flows (Stripe, coin purchases, tips, gifts).
 * Critical: Must reassure users about their money.
 */
export class PaymentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[PaymentErrorBoundary] Caught error:', error);
    console.error('[PaymentErrorBoundary] Component stack:', errorInfo.componentStack);

    Sentry.captureException(error, {
      level: 'error',
      tags: {
        component: 'payment',
        transactionType: this.props.transactionType,
      },
      extra: {
        componentStack: errorInfo.componentStack,
        amount: this.props.amount,
      },
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  handleClose = () => {
    if (this.props.onClose) {
      this.props.onClose();
    }
  };

  getTransactionLabel(): string {
    switch (this.props.transactionType) {
      case 'tip':
        return 'tip';
      case 'gift':
        return 'gift';
      case 'purchase':
        return 'coin purchase';
      case 'subscription':
        return 'subscription';
      default:
        return 'payment';
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-500/20 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-orange-400" />
          </div>

          <h2 className="text-lg font-bold text-white mb-2">
            Payment Error
          </h2>

          <p className="text-gray-400 text-sm mb-2">
            Something went wrong while processing your {this.getTransactionLabel()}.
          </p>

          {/* Important reassurance for users */}
          <div className="mb-4 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
            <p className="text-green-400 text-sm flex items-center justify-center gap-2">
              <CreditCard className="w-4 h-4" />
              Your payment has NOT been processed
            </p>
            <p className="text-green-400/80 text-xs mt-1">
              No coins were deducted from your wallet
            </p>
          </div>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div className="mb-4 p-3 bg-red-900/30 rounded-lg text-left">
              <p className="text-red-300 text-xs font-mono break-all">
                {this.state.error.message}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button
              onClick={this.handleRetry}
              className="w-full px-4 py-3 bg-gradient-to-r from-cyan-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>

            {this.props.onClose && (
              <button
                onClick={this.handleClose}
                className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            )}
          </div>

          <p className="mt-4 text-gray-500 text-xs">
            If this keeps happening, please check your wallet balance or contact support.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
