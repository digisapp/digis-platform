'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'cyan' | 'pink' | 'purple' | 'gradient' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Whether the button is in a loading state */
  loading?: boolean;
  /** Text to display while loading (defaults to children) */
  loadingText?: string;
  /** Visual variant of the button */
  variant?: ButtonVariant;
  /** Size of the button */
  size?: ButtonSize;
  /** Whether the button should take full width */
  fullWidth?: boolean;
  /** Whether to add glow effect */
  glow?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  cyan: 'bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white shadow-lg shadow-cyan-500/25',
  pink: 'bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-400 hover:to-pink-500 text-white shadow-lg shadow-pink-500/25',
  purple: 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 text-white shadow-lg shadow-purple-500/25',
  gradient: 'bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 hover:from-cyan-400 hover:via-purple-400 hover:to-pink-400 text-white shadow-lg shadow-purple-500/25',
  ghost: 'bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20',
  danger: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white shadow-lg shadow-red-500/25',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3 text-base rounded-xl',
};

/**
 * LoadingButton - A shared button component with built-in loading state
 *
 * Features:
 * - Consistent loading spinner across the app
 * - Automatic disabled state when loading
 * - Multiple visual variants matching the design system
 * - Accessible with proper ARIA attributes
 *
 * @example
 * ```tsx
 * <LoadingButton
 *   loading={isSubmitting}
 *   loadingText="Saving..."
 *   variant="gradient"
 * >
 *   Save Changes
 * </LoadingButton>
 * ```
 */
export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  (
    {
      children,
      loading = false,
      loadingText,
      variant = 'gradient',
      size = 'md',
      fullWidth = false,
      glow = false,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={loading}
        className={`
          relative inline-flex items-center justify-center gap-2
          font-semibold transition-all duration-200
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : ''}
          ${glow ? 'hover:shadow-xl' : ''}
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${className}
        `}
        {...props}
      >
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <svg
              className="w-5 h-5 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {loadingText && (
              <span className="ml-2">{loadingText}</span>
            )}
          </span>
        )}
        <span className={loading && !loadingText ? 'invisible' : ''}>
          {loading && loadingText ? '' : children}
        </span>
      </button>
    );
  }
);

LoadingButton.displayName = 'LoadingButton';
