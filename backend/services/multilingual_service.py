"""
Multilingual NLP Service with real translation APIs
Supports natural language understanding in multiple languages for global users
"""

import os
import requests
import logging
from typing import Dict, List, Optional
from datetime import datetime

try:
    import google.generativeai as genai
except ImportError:
    genai = None

logger = logging.getLogger(__name__)

class MultilingualService:
    def __init__(self):
        self.gemini_api_key = os.getenv('GEMINI_API_KEY')
        if self.gemini_api_key and genai:
            genai.configure(api_key=self.gemini_api_key)
            self.model = genai.GenerativeModel('gemini-pro')
        else:
            self.model = None
            logger.warning("Gemini API key not configured")
        
        # Supported languages with their codes
        self.supported_languages = {
            'en': 'English',
            'es': 'Spanish', 
            'fr': 'French',
            'de': 'German',
            'it': 'Italian',
            'pt': 'Portuguese',
            'ru': 'Russian',
            'zh': 'Chinese',
            'ja': 'Japanese',
            'ko': 'Korean',
            'ar': 'Arabic',
            'hi': 'Hindi',
            'bn': 'Bengali',
            'ur': 'Urdu',
            'ta': 'Tamil',
            'te': 'Telugu',
            'th': 'Thai',
            'vi': 'Vietnamese',
            'id': 'Indonesian',
            'ms': 'Malay',
            'tl': 'Filipino',
            'sw': 'Swahili',
            'am': 'Amharic',
            'tr': 'Turkish',
            'pl': 'Polish',
            'nl': 'Dutch',
            'sv': 'Swedish',
            'da': 'Danish',
            'no': 'Norwegian',
            'fi': 'Finnish'
        }
        
        # Common remittance-related intents
        self.intent_patterns = {
            'send_money': [
                'send money', 'transfer funds', 'remit', 'wire transfer', 'payment',
                'enviar dinero', 'transferir', 'mandar plata', 'remesa',
                'envoyer argent', 'virement', 'transfert',
                'geld senden', 'überweisung', 'geld überweisen',
                'inviare denaro', 'trasferimento', 'bonifico',
                'enviar dinheiro', 'transferência', 'remessa',
                'отправить деньги', 'перевод денег', 'перевести',
                '汇款', '转账', '发送钱', '寄钱',
                'お金を送る', '送金', '振込',
                '돈 보내기', '송금', '이체',
                'إرسال المال', 'تحويل الأموال', 'حوالة',
                'पैसे भेजना', 'धन भेजना', 'रेमिटेंस',
                'টাকা পাঠানো', 'অর্থ প্রেরণ',
                'پیسے بھیجنا', 'رقم بھیجنا'
            ],
            'check_rates': [
                'exchange rate', 'currency rate', 'fx rate', 'conversion rate',
                'tipo de cambio', 'tasa de cambio', 'cambio de moneda',
                'taux de change', 'cours de change',
                'wechselkurs', 'umrechnungskurs',
                'tasso di cambio', 'cambio valuta',
                'taxa de câmbio', 'cotação',
                'обменный курс', 'курс валют',
                '汇率', '兑换率', '货币汇率',
                '為替レート', '両替レート',
                '환율', '환전율',
                'سعر الصرف', 'معدل التحويل'
            ],
            'track_transfer': [
                'track transfer', 'check status', 'transfer status', 'where is my money',
                'rastrear transferencia', 'estado de envío', 'seguimiento',
                'suivre transfert', 'statut virement',
                'überweisung verfolgen', 'status prüfen',
                'tracciare bonifico', 'stato trasferimento',
                'rastrear transferência', 'status da remessa',
                'отследить перевод', 'статус перевода',
                '追踪转账', '查询状态', '转账状态',
                '送金追跡', 'ステータス確認',
                '송금 추적', '상태 확인',
                'تتبع التحويل', 'حالة التحويل'
            ]
        }
    
    def detect_language(self, text: str) -> str:
        """Detect language of input text using Gemini AI"""
        if not self.model:
            return 'en'  # Default to English
        
        try:
            prompt = f"""
            Detect the language of this text and return only the ISO 639-1 language code (2 letters):
            
            Text: "{text}"
            
            Return only the language code (e.g., 'en', 'es', 'fr', 'de', etc.)
            """
            
            response = self.model.generate_content(prompt)
            detected_lang = response.text.strip().lower()
            
            # Validate detected language
            if detected_lang in self.supported_languages:
                return detected_lang
            else:
                return 'en'  # Default fallback
                
        except Exception as e:
            logger.error(f"Error detecting language: {e}")
            return 'en'
    
    def translate_text(self, text: str, target_language: str, source_language: str = None) -> str:
        """Translate text using Gemini AI"""
        if not self.model:
            return text
        
        try:
            source_lang_name = self.supported_languages.get(source_language, 'auto-detect')
            target_lang_name = self.supported_languages.get(target_language, 'English')
            
            prompt = f"""
            Translate the following text from {source_lang_name} to {target_lang_name}.
            Provide only the translation, no explanations:
            
            Text: "{text}"
            """
            
            response = self.model.generate_content(prompt)
            return response.text.strip()
            
        except Exception as e:
            logger.error(f"Error translating text: {e}")
            return text
    
    def extract_intent_and_entities(self, text: str, language: str = 'en') -> Dict:
        """Extract intent and entities from user input using NLP"""
        if not self.model:
            return self._fallback_intent_extraction(text)
        
        try:
            # First translate to English if needed
            english_text = text
            if language != 'en':
                english_text = self.translate_text(text, 'en', language)
            
            prompt = f"""
            Analyze this money transfer request and extract structured information.
            Return a JSON object with the following fields:
            
            {{
                "intent": "send_money|check_rates|track_transfer|get_help|other",
                "amount": number or null,
                "source_currency": "currency_code or null",
                "target_currency": "currency_code or null", 
                "recipient_name": "name or null",
                "recipient_country": "country or null",
                "sender_country": "country or null",
                "urgency": "low|medium|high",
                "confidence": 0.0-1.0,
                "entities": {{
                    "amounts": [],
                    "currencies": [],
                    "countries": [],
                    "names": [],
                    "dates": []
                }}
            }}
            
            Text: "{english_text}"
            
            Return only valid JSON, no explanations.
            """
            
            response = self.model.generate_content(prompt)
            
            # Try to parse JSON response
            import json
            try:
                result = json.loads(response.text.strip())
                result['original_text'] = text
                result['detected_language'] = language
                result['processed_text'] = english_text
                return result
            except json.JSONDecodeError:
                logger.warning("Failed to parse JSON from Gemini response")
                return self._fallback_intent_extraction(english_text)
                
        except Exception as e:
            logger.error(f"Error extracting intent: {e}")
            return self._fallback_intent_extraction(text)
    
    def _fallback_intent_extraction(self, text: str) -> Dict:
        """Fallback intent extraction using keyword matching"""
        text_lower = text.lower()
        
        # Detect intent
        intent = 'other'
        confidence = 0.5
        
        for intent_type, patterns in self.intent_patterns.items():
            for pattern in patterns:
                if pattern in text_lower:
                    intent = intent_type
                    confidence = 0.8
                    break
            if intent != 'other':
                break
        
        # Extract basic entities using regex
        import re
        
        # Extract amounts
        amount_patterns = r'(\d+(?:\.\d{2})?)\s*(?:dollars?|usd|\$|euros?|eur|€|pounds?|gbp|£)'
        amounts = re.findall(amount_patterns, text_lower)
        
        # Extract currencies
        currency_patterns = r'\b(usd|eur|gbp|cad|aud|jpy|cny|inr|mxn|brl|php)\b'
        currencies = re.findall(currency_patterns, text_lower)
        
        # Extract countries (basic list)
        countries = ['usa', 'united states', 'india', 'mexico', 'philippines', 'china', 'uk', 'canada']
        found_countries = [country for country in countries if country in text_lower]
        
        return {
            'intent': intent,
            'amount': float(amounts[0]) if amounts else None,
            'source_currency': currencies[0].upper() if currencies else None,
            'target_currency': currencies[1].upper() if len(currencies) > 1 else None,
            'recipient_name': None,
            'recipient_country': found_countries[0] if found_countries else None,
            'sender_country': None,
            'urgency': 'medium',
            'confidence': confidence,
            'entities': {
                'amounts': amounts,
                'currencies': currencies,
                'countries': found_countries,
                'names': [],
                'dates': []
            },
            'original_text': text,
            'detected_language': 'en',
            'processed_text': text
        }
    
    def generate_response(self, intent_data: Dict, language: str = 'en') -> str:
        """Generate appropriate response based on intent"""
        if not self.model:
            return self._fallback_response(intent_data, language)
        
        try:
            intent = intent_data.get('intent', 'other')
            lang_name = self.supported_languages.get(language, 'English')
            
            if intent == 'send_money':
                if intent_data.get('amount') and intent_data.get('target_currency'):
                    prompt = f"""
                    Generate a helpful response in {lang_name} for a user who wants to send money.
                    Amount: {intent_data.get('amount')} {intent_data.get('source_currency', 'USD')}
                    To: {intent_data.get('recipient_country', 'recipient')}
                    
                    The response should:
                    1. Acknowledge their request
                    2. Mention we'll find the best rates and providers
                    3. Ask for any missing information if needed
                    4. Be friendly and professional
                    
                    Keep it concise (2-3 sentences).
                    """
                else:
                    prompt = f"""
                    Generate a helpful response in {lang_name} for a user who wants to send money but hasn't provided complete details.
                    Ask for the amount, destination country, and recipient information in a friendly way.
                    Keep it concise (2-3 sentences).
                    """
            
            elif intent == 'check_rates':
                prompt = f"""
                Generate a helpful response in {lang_name} for a user asking about exchange rates.
                Mention that we provide real-time rates from multiple providers and can help find the best deals.
                Keep it concise (2-3 sentences).
                """
            
            elif intent == 'track_transfer':
                prompt = f"""
                Generate a helpful response in {lang_name} for a user wanting to track their transfer.
                Ask for their transaction ID or reference number to help them track their money.
                Keep it concise (2-3 sentences).
                """
            
            else:
                prompt = f"""
                Generate a helpful response in {lang_name} for a user asking about money transfers.
                Explain that AURA helps with international money transfers, finding best rates, and tracking transfers.
                Ask how you can help them today.
                Keep it concise (2-3 sentences).
                """
            
            response = self.model.generate_content(prompt)
            return response.text.strip()
            
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return self._fallback_response(intent_data, language)
    
    def _fallback_response(self, intent_data: Dict, language: str) -> str:
        """Fallback responses in multiple languages"""
        responses = {
            'en': {
                'send_money': "I'll help you send money internationally. Please provide the amount, destination country, and recipient details.",
                'check_rates': "I can show you current exchange rates from multiple providers to help you get the best deal.",
                'track_transfer': "To track your transfer, please provide your transaction reference number.",
                'other': "I'm AURA, your AI assistant for international money transfers. How can I help you today?"
            },
            'es': {
                'send_money': "Te ayudo a enviar dinero internacionalmente. Por favor proporciona el monto, país de destino y datos del destinatario.",
                'check_rates': "Puedo mostrarte las tasas de cambio actuales de múltiples proveedores para conseguir el mejor precio.",
                'track_transfer': "Para rastrear tu transferencia, proporciona tu número de referencia de transacción.",
                'other': "Soy AURA, tu asistente de IA para transferencias internacionales de dinero. ¿Cómo puedo ayudarte hoy?"
            },
            'fr': {
                'send_money': "Je vais vous aider à envoyer de l'argent à l'international. Veuillez fournir le montant, le pays de destination et les détails du destinataire.",
                'check_rates': "Je peux vous montrer les taux de change actuels de plusieurs fournisseurs pour obtenir la meilleure offre.",
                'track_transfer': "Pour suivre votre transfert, veuillez fournir votre numéro de référence de transaction.",
                'other': "Je suis AURA, votre assistant IA pour les transferts d'argent internationaux. Comment puis-je vous aider aujourd'hui?"
            }
        }
        
        intent = intent_data.get('intent', 'other')
        lang_responses = responses.get(language, responses['en'])
        return lang_responses.get(intent, lang_responses['other'])
    
    def get_supported_languages(self) -> Dict:
        """Get list of supported languages"""
        return self.supported_languages
    
    def process_voice_input(self, text: str) -> Dict:
        """Process voice input with full NLP pipeline"""
        try:
            # Detect language
            detected_lang = self.detect_language(text)
            
            # Extract intent and entities
            intent_data = self.extract_intent_and_entities(text, detected_lang)
            
            # Generate response
            response_text = self.generate_response(intent_data, detected_lang)
            
            return {
                'success': True,
                'detected_language': detected_lang,
                'language_name': self.supported_languages.get(detected_lang, 'Unknown'),
                'intent_data': intent_data,
                'response': response_text,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error processing voice input: {e}")
            return {
                'success': False,
                'error': str(e),
                'response': "I'm sorry, I couldn't process your request. Please try again.",
                'timestamp': datetime.now().isoformat()
            }

# Global instance
multilingual_service = MultilingualService()
