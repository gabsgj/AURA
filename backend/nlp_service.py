"""Lightweight NLP service stub.
Provides simple language detection, translation mock, and naive intent extraction.
"""

class NLPService:
    def detect_language(self, text: str) -> str:
        return 'en'

    def translate_text(self, text: str, source_language: str, target_language: str) -> dict:
        # Simple passthrough with language tags for demo
        return {
            'source_language': source_language or 'auto',
            'target_language': target_language,
            'translated_text': text if target_language == 'en' else f"[{target_language}] {text}"
        }

    def extract_intent(self, text: str) -> dict:
        t = text.lower()
        if 'send' in t:
            return {'intent': 'send_money'}
        if 'rate' in t or 'rates' in t:
            return {'intent': 'check_rates'}
        return {'intent': 'unknown'}
    
    def get_supported_languages(self) -> list:
        """Return list of supported languages"""
        return [
            {'code': 'en', 'name': 'English'},
            {'code': 'es', 'name': 'Spanish'},
            {'code': 'fr', 'name': 'French'},
            {'code': 'de', 'name': 'German'},
            {'code': 'it', 'name': 'Italian'},
            {'code': 'pt', 'name': 'Portuguese'},
        ]


nlp_service = NLPService()

