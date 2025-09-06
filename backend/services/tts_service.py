"""
ElevenLabs Text-to-Speech Service
Handles synthesis for free-form text and transaction alert messages.
"""

import os
import base64
import logging
from typing import Dict

try:
    from elevenlabs import generate, set_api_key
except Exception:  # Library may not be installed yet
    generate = None
    set_api_key = None

logger = logging.getLogger(__name__)


class ElevenLabsTTSService:
    def __init__(self):
        self.api_key = os.getenv('ELEVENLABS_API_KEY')
        # Multilingual model recommended by ElevenLabs
        self.model = os.getenv('ELEVENLABS_MODEL', 'eleven_multilingual_v2')
        # Optional explicit voice IDs
        self.voice_id_female = os.getenv('ELEVENLABS_VOICE_ID_FEMALE')
        self.voice_id_male = os.getenv('ELEVENLABS_VOICE_ID_MALE')

    def _ensure_sdk(self):
        if generate is None or set_api_key is None:
            raise RuntimeError('ElevenLabs SDK not available. Ensure dependency is installed.')
        if not self.api_key:
            raise RuntimeError('ELEVENLABS_API_KEY is not set')
        set_api_key(self.api_key)

    def _select_voice(self, language: str, gender: str) -> str:
        # Prefer explicit voice IDs from env
        if gender and gender.lower() == 'male' and self.voice_id_male:
            return self.voice_id_male
        if gender and gender.lower() == 'female' and self.voice_id_female:
            return self.voice_id_female
        # Fall back to common default voice names (available in most accounts)
        if gender and gender.lower() == 'male':
            return os.getenv('ELEVENLABS_VOICE_NAME_MALE', 'Adam')
        return os.getenv('ELEVENLABS_VOICE_NAME_FEMALE', 'Rachel')

    def synthesize_to_base64(self, text: str, language: str = 'en', gender: str = 'female') -> str:
        """Synthesize speech and return base64-encoded audio (mp3)."""
        if not text or not isinstance(text, str):
            raise ValueError('Text is required for TTS')

        self._ensure_sdk()
        voice = self._select_voice(language, gender)

        logger.info(f"Synthesizing TTS via ElevenLabs: lang={language}, gender={gender}, voice={voice}")

        audio_bytes = generate(
            text=text,
            voice=voice,
            model=self.model
        )

        return base64.b64encode(audio_bytes).decode('utf-8')

    def generate_alert_message(self, event_type: str, details: Dict, language: str = 'en') -> str:
        """Generate localized transaction alert message."""
        details = details or {}
        amount = details.get('amount')
        currency = details.get('currency')
        recipient = details.get('recipient')

        # Minimal i18n messages
        messages = {
            'en': {
                'transaction_success': f"Transaction of {amount} {currency} to {recipient} was successful.",
                'fraud_alert': 'Suspicious transaction detected. Please review your account.',
                'default': 'Transaction processed.'
            },
            'es': {
                'transaction_success': f"Transacción de {amount} {currency} a {recipient} exitosa.",
                'fraud_alert': 'Transacción sospechosa detectada. Por favor revise su cuenta.',
                'default': 'Transacción procesada.'
            },
            'fr': {
                'transaction_success': f"Transaction de {amount} {currency} à {recipient} réussie.",
                'fraud_alert': 'Transaction suspecte détectée. Veuillez vérifier votre compte.',
                'default': 'Transaction traitée.'
            },
            'de': {
                'transaction_success': f"Transaktion über {amount} {currency} an {recipient} war erfolgreich.",
                'fraud_alert': 'Verdächtige Transaktion erkannt. Bitte prüfen Sie Ihr Konto.',
                'default': 'Transaktion verarbeitet.'
            }
        }

        lang = (language or 'en').lower()
        selected = messages.get(lang, messages['en'])
        return selected.get(event_type, selected['default'])


# Singleton instance
tts_service = ElevenLabsTTSService()

