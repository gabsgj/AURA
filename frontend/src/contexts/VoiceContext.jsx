import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import TTS_SERVICE from '../services/ttsService';
import { TTS, UI } from '../config';

// Create context
const VoiceContext = createContext();

// Custom hook to use voice context
export const useVoice = () => {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
};
// Context provider component
export const VoiceProvider = ({ children }) => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [language, setLanguage] = useState(UI.DEFAULT_LANGUAGE);
  const [voiceGender, setVoiceGender] = useState(TTS.DEFAULT_VOICE);
  const [volume, setVolume] = useState(1); // 0 to 1

  // Load saved settings from localStorage
  useEffect(() => {
    try {
      const savedSettings = JSON.parse(localStorage.getItem('voiceSettings'));
      if (savedSettings) {
        setIsEnabled(savedSettings.isEnabled ?? true);
        setLanguage(savedSettings.language ?? UI.DEFAULT_LANGUAGE);
        setVoiceGender(savedSettings.voiceGender ?? TTS.DEFAULT_VOICE);
        setVolume(savedSettings.volume ?? 1);
      }
    } catch (error) {
      console.error('Failed to load voice settings:', error);
    }
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    const settings = { isEnabled, language, voiceGender, volume };
    localStorage.setItem('voiceSettings', JSON.stringify(settings));
  }, [isEnabled, language, voiceGender, volume]);

  // Speak text using TTS service
  const speak = useCallback(
    async (text, options = {}) => {
      if (!isEnabled) return;

      const {
        lang = language,
        gender = voiceGender,
        onStart,
        onEnd,
        onError,
      } = options;

      try {
        setIsSpeaking(true);
        onStart?.();

        await TTS_SERVICE.speak(text, lang, gender);
        
        onEnd?.();
      } catch (error) {
        console.error('Error in speak:', error);
        onError?.(error);
      } finally {
        setIsSpeaking(false);
      }
    },
    [isEnabled, language, voiceGender]
  );

  // Play a transaction alert
  const playTransactionAlert = useCallback(
    async (eventType, details, options = {}) => {
      if (!isEnabled) return;

      const {
        lang = language,
        gender = voiceGender,
        onStart,
        onEnd,
        onError,
      } = options;

      try {
        setIsSpeaking(true);
        onStart?.();

        await TTS_SERVICE.playTransactionAlert(eventType, details, lang, gender);
        
        onEnd?.();
      } catch (error) {
        console.error('Error in playTransactionAlert:', error);
        onError?.(error);
      } finally {
        setIsSpeaking(false);
      }
    },
    [isEnabled, language, voiceGender]
  );

  // Stop any ongoing speech
  const stopSpeaking = useCallback(() => {
    // This will stop any audio elements currently playing
    const audioElements = document.getElementsByTagName('audio');
    Array.from(audioElements).forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    
    // Also stop any browser speech synthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    setIsSpeaking(false);
  }, []);

  // Toggle voice on/off
  const toggleVoice = useCallback(() => {
    setIsEnabled(prev => !prev);
  }, []);

  // Set language for TTS
  const setLanguageAndSpeak = useCallback(
    (newLanguage) => {
      setLanguage(newLanguage);
      
      // Optional: Speak a confirmation when language changes
      if (isEnabled) {
        const langName = UI.SUPPORTED_LANGUAGES.find(lang => lang.code === newLanguage)?.name || 'English';
        speak(`Language set to ${langName}`);
      }
    },
    [isEnabled, speak]
  );

  // Set voice gender
  const setVoiceGenderAndSpeak = useCallback(
    (gender) => {
      setVoiceGender(gender);
      
      // Optional: Speak a confirmation when voice changes
      if (isEnabled) {
        const genderText = gender === 'male' ? 'male voice' : 'female voice';
        speak(`Using ${genderText}`);
      }
    },
    [isEnabled, speak]
  );

  // Value to be provided by the context
  const value = {
    // State
    isEnabled,
    isSpeaking,
    language,
    voiceGender,
    volume,
    
    // Actions
    speak,
    playTransactionAlert,
    stopSpeaking,
    toggleVoice,
    setLanguage: setLanguageAndSpeak,
    setVoiceGender: setVoiceGenderAndSpeak,
    setVolume,
  };

  return (
    <VoiceContext.Provider value={value}>
      {children}
    </VoiceContext.Provider>
  );
};

export default VoiceContext;
