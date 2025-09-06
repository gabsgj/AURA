import React from 'react';
import { useVoice } from '../../contexts/VoiceContext';
import { UI, TTS } from '../../config';

const VoiceSettings = () => {
  const {
    isEnabled,
    isSpeaking,
    language,
    voiceGender,
    volume,
    toggleVoice,
    setLanguage,
    setVoiceGender,
    setVolume,
    speak
  } = useVoice();

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
  };

  const handleVoiceGenderChange = (e) => {
    const newGender = e.target.value;
    setVoiceGender(newGender);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  const handleTestVoice = () => {
    const testMessages = {
      en: 'This is a test of the voice settings.',
      es: 'Esta es una prueba de la configuración de voz.',
      fr: "Ceci est un test des paramètres vocaux.",
      de: 'Dies ist ein Test der Spracheinstellungen.'
    };
    
    speak(testMessages[language] || testMessages.en);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Voice Alerts</h3>
          <p className="text-sm text-gray-400">
            {isEnabled ? 'Voice alerts are enabled' : 'Voice alerts are disabled'}
          </p>
        </div>
        <button
          type="button"
          className={`${
            isEnabled ? 'bg-blue-600' : 'bg-gray-700'
          } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
          role="switch"
          aria-checked={isEnabled}
          onClick={toggleVoice}
        >
          <span className="sr-only">Toggle voice alerts</span>
          <span
            aria-hidden="true"
            className={`${
              isEnabled ? 'translate-x-5' : 'translate-x-0'
            } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
          />
        </button>
      </div>

      {isEnabled && (
        <div className="space-y-6 pl-4 border-l-2 border-gray-700">
          <div>
            <label htmlFor="language" className="block text-sm font-medium text-gray-300 mb-1">
              Language
            </label>
            <select
              id="language"
              value={language}
              onChange={handleLanguageChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-gray-700 text-white"
              disabled={isSpeaking}
            >
              {UI.SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="voice-gender" className="block text-sm font-medium text-gray-300 mb-1">
              Voice
            </label>
            <select
              id="voice-gender"
              value={voiceGender}
              onChange={handleVoiceGenderChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-gray-700 text-white"
              disabled={isSpeaking}
            >
              {TTS.VOICE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between">
              <label htmlFor="volume" className="block text-sm font-medium text-gray-300">
                Volume
              </label>
              <span className="text-sm text-gray-400">{Math.round(volume * 100)}%</span>
            </div>
            <input
              id="volume"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="mt-2 w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleTestVoice}
              disabled={isSpeaking}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSpeaking ? 'Speaking...' : 'Test Voice'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceSettings;
