/**
 * Custom toast theme configuration for React Hot Toast
 * Provides consistent styling and helper functions across the application
 */

import toast from 'react-hot-toast';
import type { ToasterProps, Renderable } from 'react-hot-toast';
import React from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, Loader2 } from 'lucide-react';

// Custom toast theme configuration
export const toastTheme: ToasterProps = {
  position: 'top-right',
  toastOptions: {
    duration: 4000,
    style: {
      background: '#ffffff',
      color: '#1f2937',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      boxShadow:
        '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      padding: '16px',
      fontSize: '14px',
      fontWeight: '500',
    },
    success: {
      style: {
        background: '#f0fdf4',
        color: '#166534',
        border: '1px solid #bbf7d0',
      },
      iconTheme: {
        primary: '#22c55e',
        secondary: '#ffffff',
      },
    },
    error: {
      style: {
        background: '#fef2f2',
        color: '#dc2626',
        border: '1px solid #fecaca',
      },
      iconTheme: {
        primary: '#ef4444',
        secondary: '#ffffff',
      },
    },
  },
};

// Helper functions for different toast types
export const showSuccessToast = (message: string, duration?: number) => {
  return toast.success(message, {
    duration,
    icon: React.createElement(CheckCircle, { className: 'w-5 h-5' }),
  });
};

export const showErrorToast = (message: string, duration?: number) => {
  return toast.error(message, {
    duration,
    icon: React.createElement(XCircle, { className: 'w-5 h-5' }),
  });
};

export const showWarningToast = (message: string, duration?: number) => {
  return toast(message, {
    duration,
    icon: React.createElement(AlertCircle, { className: 'w-5 h-5 text-yellow-500' }),
    style: {
      background: '#fffbeb',
      color: '#92400e',
      border: '1px solid #fde68a',
    },
  });
};

export const showInfoToast = (message: string, duration?: number) => {
  return toast(message, {
    duration,
    icon: React.createElement(Info, { className: 'w-5 h-5 text-blue-500' }),
    style: {
      background: '#eff6ff',
      color: '#1e40af',
      border: '1px solid #bfdbfe',
    },
  });
};

export const showLoadingToast = (message: string) => {
  return toast.loading(message, {
    icon: React.createElement(Loader2, { className: 'w-5 h-5 animate-spin' }),
  });
};

// Promise-based toast helpers
export const toastPromise = <T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((err: unknown) => string);
  },
) => {
  return toast.promise(promise, messages, {
    loading: {
      icon: React.createElement(Loader2, { className: 'w-5 h-5 animate-spin' }),
    },
    success: {
      icon: React.createElement(CheckCircle, { className: 'w-5 h-5' }),
    },
    error: {
      icon: React.createElement(XCircle, { className: 'w-5 h-5' }),
    },
  });
};

// Custom toast with custom styling
export const showCustomToast = (
  message: string,
  options?: {
    duration?: number;
    icon?: Renderable;
    style?: React.CSSProperties;
  }
) => {
  return toast(message, {
    duration: options?.duration || 4000,
    icon: options?.icon,
    style: {
      ...(toastTheme.toastOptions?.style || {}),
      ...options?.style,
    },
  });
};

export const showConfirmToast = (
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
  options?: { confirmText?: string; cancelText?: string; duration?: number }
) => {
  return toast.custom(
    (t) => (
      React.createElement(
        'div',
        { className: 'rounded-lg border bg-white p-4 shadow-sm' },
        [
          React.createElement('div', { key: 'msg', className: 'mb-3 text-sm text-gray-800' }, message),
          React.createElement(
            'div',
            { key: 'actions', className: 'flex items-center gap-2' },
            [
              React.createElement(
                'button',
                {
                  key: 'confirm',
                  className: 'rounded bg-red-600 px-3 py-1.5 text-white hover:bg-red-700',
                  onClick: () => {
                    toast.dismiss(t.id);
                    onConfirm();
                  },
                },
                options?.confirmText || 'Confirmar'
              ),
              React.createElement(
                'button',
                {
                  key: 'cancel',
                  className: 'rounded border px-3 py-1.5 hover:bg-gray-50',
                  onClick: () => {
                    toast.dismiss(t.id);
                    onCancel?.();
                  },
                },
                options?.cancelText || 'Cancelar'
              ),
            ]
          ),
        ]
      )
    ),
    { position: 'top-right', duration: options?.duration ?? 10000 }
  );
};

// Dismiss all toasts
export const dismissAllToasts = () => {
  toast.dismiss();
};

// Dismiss specific toast
export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
};

export default {
  showSuccessToast,
  showErrorToast,
  showWarningToast,
  showInfoToast,
  showLoadingToast,
  showCustomToast,
  showConfirmToast,
  toastPromise,
  dismissAllToasts,
  dismissToast,
  toastTheme,
};
