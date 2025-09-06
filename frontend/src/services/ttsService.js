import axios from 'axios';
import { API_BASE_URL } from '../config';

/**
 * Text-to-Speech Service for handling voice alerts using ElevenLabs backend
 */

const TTS_SERVICE = {
  /**
   * Play a text message as speech
   * @param {string} text - The text to speak
   * @param {string} language - Language code (e.g., 'en', 'es')
   * @param {string} gender - Voice gender ('male' or 'female')
   * @returns {Promise<void>}
   */
  async speak(text, language = 'en', gender = 'female') {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/tts`,
        { text, language, gender },
        { 
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true
        }
      );

      if (response.data.success && response.data.audio_base64) {
        await this.playBase64Audio(response.data.audio_base64);
      }
    } catch (error) {
      console.error('TTS Error:', error);
      // Fallback to browser TTS if available
      this.fallbackToBrowserTTS(text);
    }
  },

  /**
   * Play a transaction alert
   * @param {string} eventType - Type of alert (e.g., 'transaction_success', 'fraud_alert')
   * @param {Object} details - Transaction details
   * @param {string} language - Language code
   * @param {string} gender - Voice gender
   * @returns {Promise<void>}
   */
  async playTransactionAlert(eventType, details, language = 'en', gender = 'female') {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/tts`,
        { 
          event_type: eventType,
          transaction_details: details,
          language,
          gender 
        },
        { 
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true
        }
      );

      if (response.data.success && response.data.audio_base64) {
        await this.playBase64Audio(response.data.audio_base64);
      }
    } catch (error) {
      console.error('TTS Alert Error:', error);
      // Fallback to a generic browser message
      this.fallbackToBrowserTTS(this.getFallbackMessage(eventType, details, language));
    }
  },

  /**
   * Play audio from base64 data
   * @private
   */
  playBase64Audio(base64Data) {
    return new Promise((resolve, reject) => {
      try {
        const audio = new Audio(`data:audio/mp3;base64,${base64Data}`);
        audio.onended = resolve;
        audio.onerror = reject;
        audio.play().catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  },

  /**
   * Fallback to browser TTS if available
   * @private
   */
  fallbackToBrowserTTS(text) {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  },

  /**
   * Generate fallback messages for different transaction events
   * @private
   */
  getFallbackMessage(eventType, details, language) {
    const messages = {
      en: {
        transaction_success: `Transaction of ${details.amount} ${details.currency} to ${details.recipient} was successful.`,
        fraud_alert: 'Suspicious transaction detected. Please review your account.',
        default: 'Transaction processed.'
      },
      es: {
        transaction_success: `Transacción de ${details.amount} ${details.currency} a ${details.recipient} exitosa.`,
        fraud_alert: 'Transacción sospechosa detectada. Por favor revise su cuenta.',
        default: 'Transacción procesada.'
      },
      fr: {
        transaction_success: `Transaction de ${details.amount} ${details.currency} à ${details.recipient} réussie.`,
        fraud_alert: 'Transaction suspecte détectée. Veuillez vérifier votre compte.',
        default: 'Transaction traitée.'
      }
    };

    const langMessages = messages[language] || messages.en;
    return langMessages[eventType] || langMessages.default;
  }
};

export default TTS_SERVICE;
