/**
 * Application Configuration
 * 
 * This file contains all the configuration settings for the application.
 * In production, these values should be overridden by environment variables.
 */

const config = {
  // API Configuration
  API_BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  
  // Feature Flags
  FEATURES: {
    VOICE_ALERTS: true,
    MULTILINGUAL: true,
    OFFLINE_MODE: false
  },
  
  // UI Configuration
  UI: {
    DEFAULT_LANGUAGE: 'en',
    SUPPORTED_LANGUAGES: [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Español' },
      { code: 'fr', name: 'Français' },
      { code: 'de', name: 'Deutsch' }
    ],
    THEME: {
      DEFAULT: 'dark',
      AVAILABLE: ['light', 'dark', 'system']
    }
  },
  
  // TTS Configuration
  TTS: {
    DEFAULT_VOICE: 'female',
    VOICE_OPTIONS: [
      { id: 'female', label: 'Female Voice' },
      { id: 'male', label: 'Male Voice' }
    ]
  },
  
  // Timeouts (in milliseconds)
  TIMEOUTS: {
    API_REQUEST: 30000, // 30 seconds
    TOKEN_REFRESH: 300000, // 5 minutes
    NOTIFICATION_AUTO_CLOSE: 5000 // 5 seconds
  },
  
  // Local Storage Keys
  STORAGE_KEYS: {
    AUTH: 'aura_auth',
    SETTINGS: 'aura_settings',
    RECENT_TRANSACTIONS: 'aura_recent_transactions'
  }
};

export default config;

export const { 
  API_BASE_URL, 
  FEATURES, 
  UI, 
  TTS, 
  TIMEOUTS, 
  STORAGE_KEYS 
} = config;
