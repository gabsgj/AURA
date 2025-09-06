import { useCallback } from 'react';
import { useVoice } from '../contexts/VoiceContext';
import { useToasts } from './useToasts';

/**
 * Hook for handling transaction notifications with voice feedback
 */
export const useTransactionNotifications = () => {
  const { playTransactionAlert } = useVoice();
  const { addToast } = useToasts();

  /**
   * Show a transaction notification with optional voice alert
   * @param {Object} options - Notification options
   * @param {string} options.type - Notification type (success, error, warning, info)
   * @param {string} options.message - Notification message
   * @param {string} [options.voiceMessage] - Optional custom voice message (defaults to message)
   * @param {boolean} [options.enableVoice=true] - Whether to enable voice for this notification
   * @param {Object} [options.transaction] - Transaction details for voice alerts
   * @param {number} [options.duration=5000] - Duration to show the notification (ms)
   */
  const notify = useCallback(
    async ({
      type = 'info',
      message,
      voiceMessage,
      enableVoice = true,
      transaction,
      duration = 5000,
    }) => {
      // Show toast notification
      addToast({
        type,
        message,
        duration,
      });

      // Play voice alert if enabled and not in silent mode
      if (enableVoice) {
        try {
          if (transaction && transaction.type) {
            // Use transaction-specific alert if transaction details are provided
            await playTransactionAlert(
              `${transaction.type}_${type}`, // e.g., 'transfer_success', 'payment_error'
              {
                amount: transaction.amount,
                currency: transaction.currency,
                recipient: transaction.recipientName || 'recipient',
                ...transaction.details,
              }
            );
          } else if (voiceMessage || message) {
            // Fall back to simple text-to-speech
            await playTransactionAlert(
              'notification',
              { message: voiceMessage || message },
              { lang: navigator.language }
            );
          }
        } catch (error) {
          console.error('Failed to play voice alert:', error);
          // Don't show error to user to avoid notification loops
        }
      }
    },
    [playTransactionAlert, addToast]
  );

  // Convenience methods for common notification types
  const notifySuccess = useCallback(
    (message, options = {}) =>
      notify({
        type: 'success',
        message,
        ...options,
      }),
    [notify]
  );

  const notifyError = useCallback(
    (message, options = {}) =>
      notify({
        type: 'error',
        message,
        ...options,
      }),
    [notify]
  );

  const notifyWarning = useCallback(
    (message, options = {}) =>
      notify({
        type: 'warning',
        message,
        ...options,
      }),
    [notify]
  );

  const notifyInfo = useCallback(
    (message, options = {}) =>
      notify({
        type: 'info',
        message,
        ...options,
      }),
    [notify]
  );

  return {
    notify,
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo,
  };
};

export default useTransactionNotifications;
