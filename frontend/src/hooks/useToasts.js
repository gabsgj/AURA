import { useCallback } from 'react';
import { useToasts as useToastContext } from '../contexts/ToastContext';

/**
 * Custom hook for showing toast notifications
 * @returns {Object} Methods to show different types of toasts
 */
const useToasts = () => {
  const { addToast, removeToast } = useToastContext();

  const showToast = useCallback(
    (message, options = {}) => {
      const { type = 'info', duration = 5000 } = options;
      addToast({
        type,
        message,
        duration,
      });
    },
    [addToast]
  );

  const showSuccess = useCallback(
    (message, options = {}) => {
      showToast(message, { ...options, type: 'success' });
    },
    [showToast]
  );

  const showError = useCallback(
    (message, options = {}) => {
      showToast(message, { ...options, type: 'error' });
    },
    [showToast]
  );

  const showWarning = useCallback(
    (message, options = {}) => {
      showToast(message, { ...options, type: 'warning' });
    },
    [showToast]
  );

  const showInfo = useCallback(
    (message, options = {}) => {
      showToast(message, { ...options, type: 'info' });
    },
    [showToast]
  );

  return {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeToast,
  };
};

export { useToasts };