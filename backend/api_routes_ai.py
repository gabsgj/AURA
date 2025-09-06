"""
AI-Powered API Routes for AURA Cross-Border Payments Platform
Integrates all AI services: FX prediction, payment routing, fraud detection, multilingual NLP
"""

from flask import Blueprint, request, jsonify, current_app
import logging
from datetime import datetime
from typing import Dict, Any
from functools import wraps

# Import AI services
from backend.services.fx_prediction_service import fx_prediction_service
from backend.services.payment_routing_service import payment_routing_service
from backend.services.fraud_detection_service import fraud_detection_service
from backend.services.multilingual_service import multilingual_service

logger = logging.getLogger(__name__)

ai_bp = Blueprint('ai', __name__)

# Rate limiting & auth imports
try:  # pragma: no cover - defensive import
    from flask_limiter import Limiter
    from backend.auth import token_required
except Exception:  # pragma: no cover
    Limiter = None  # type: ignore
    def token_required(f):  # type: ignore
        return f

def _limit(limit_spec: str):
    """Safely apply a rate limit if the global limiter is configured."""
    def decorator(func):
        if Limiter is None:
            return func
        @wraps(func)
        def wrapped(*args, **kwargs):
            return func(*args, **kwargs)
        try:
            limiter = current_app.extensions.get('limiter')  # type: ignore
            if limiter:
                return limiter.limit(limit_spec)(func)
        except Exception:
            return func
        return wrapped
    return decorator

@ai_bp.route('/analyze-transfer', methods=['POST'])
@token_required
@_limit("10 per minute")
def analyze_transfer():
    """
    Comprehensive AI analysis for cross-border transfer
    Combines FX prediction, payment routing, and fraud detection
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['amount', 'source_currency', 'target_currency']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return jsonify({
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        amount = float(data['amount'])
        source_currency = data['source_currency'].upper()
        target_currency = data['target_currency'].upper()
        user_id = data.get('user_id', 'anonymous')
        user_preferences = data.get('preferences', {})
        
        # 1. FX Rate Analysis and Prediction
        fx_analysis = fx_prediction_service.get_rate_analysis(
            source_currency, target_currency, amount
        )
        
        # 2. Payment Routing Optimization
        routing_analysis = payment_routing_service.get_optimal_route(
            source_currency, target_currency, amount, user_preferences
        )
        
        # 3. Fraud Risk Assessment
        transaction_data = {
            'amount': amount,
            'timestamp': datetime.now().isoformat(),
            'recipient_country': data.get('recipient_country', 'US'),
            'sender_country': data.get('sender_country', 'US'),
            'recipient': data.get('recipient', {}),
            'purpose': data.get('purpose', '')
        }
        
        fraud_risk = fraud_detection_service.analyze_transaction_risk(transaction_data, user_id)
        fraud_decision = fraud_detection_service.should_block_transaction(fraud_risk)
        
        # 4. Corridor Validation
        corridor_info = payment_routing_service.validate_transfer_corridor(
            source_currency, target_currency
        )
        
        # Combine all analyses
        result = {
            'success': True,
            'analysis_id': f"analysis_{int(datetime.now().timestamp())}",
            'timestamp': datetime.now().isoformat(),
            'transfer_details': {
                'amount': amount,
                'source_currency': source_currency,
                'target_currency': target_currency,
                'corridor': f"{source_currency}-{target_currency}"
            },
            'fx_analysis': fx_analysis,
            'routing_recommendation': routing_analysis,
            'fraud_assessment': {
                'risk_level': fraud_risk.risk_level,
                'overall_score': fraud_risk.overall_score,
                'risk_factors': {
                    'velocity_risk': fraud_risk.velocity_risk,
                    'amount_risk': fraud_risk.amount_risk,
                    'location_risk': fraud_risk.location_risk,
                    'time_risk': fraud_risk.time_risk,
                    'behavioral_risk': fraud_risk.behavioral_risk
                },
                'decision': fraud_decision
            },
            'corridor_support': corridor_info,
            'recommendations': _generate_recommendations(fx_analysis, routing_analysis, fraud_risk)
        }
        
        # Update user profile for future fraud detection
        fraud_detection_service.update_user_profile(user_id, transaction_data)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in transfer analysis: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ai_bp.route('/fx-prediction', methods=['POST'])
@token_required
@_limit("60 per minute")
def fx_prediction():
    """Get FX rate predictions and timing recommendations"""
    try:
        data = request.get_json()
        
        from_currency = data.get('from_currency', 'USD').upper()
        to_currency = data.get('to_currency', 'EUR').upper()
        days_ahead = int(data.get('days_ahead', 1))
        
        prediction = fx_prediction_service.predict_rate(from_currency, to_currency, days_ahead)
        
        return jsonify({
            'success': True,
            'prediction': prediction,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in FX prediction: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ai_bp.route('/payment-routing', methods=['POST'])
@token_required
@_limit("30 per minute")
def payment_routing():
    """Get optimal payment routing recommendations"""
    try:
        data = request.get_json()
        
        source_currency = data.get('source_currency', 'USD').upper()
        target_currency = data.get('target_currency', 'EUR').upper()
        amount = float(data.get('amount', 1000))
        preferences = data.get('preferences', {})
        
        routing = payment_routing_service.get_optimal_route(
            source_currency, target_currency, amount, preferences
        )
        
        return jsonify({
            'success': True,
            'routing': routing,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in payment routing: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ai_bp.route('/fraud-check', methods=['POST'])
@token_required
@_limit("30 per minute")
def fraud_check():
    """Perform fraud risk assessment"""
    try:
        data = request.get_json()
        user_id = data.get('user_id', 'anonymous')
        
        transaction_data = {
            'amount': float(data.get('amount', 0)),
            'timestamp': data.get('timestamp', datetime.now().isoformat()),
            'recipient_country': data.get('recipient_country', 'US'),
            'sender_country': data.get('sender_country', 'US'),
            'recipient': data.get('recipient', {}),
            'purpose': data.get('purpose', '')
        }
        
        risk_factors = fraud_detection_service.analyze_transaction_risk(transaction_data, user_id)
        decision = fraud_detection_service.should_block_transaction(risk_factors)
        
        return jsonify({
            'success': True,
            'risk_assessment': {
                'risk_level': risk_factors.risk_level,
                'overall_score': risk_factors.overall_score,
                'risk_factors': {
                    'velocity_risk': risk_factors.velocity_risk,
                    'amount_risk': risk_factors.amount_risk,
                    'location_risk': risk_factors.location_risk,
                    'time_risk': risk_factors.time_risk,
                    'behavioral_risk': risk_factors.behavioral_risk
                },
                'decision': decision
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in fraud check: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ai_bp.route('/nlu-process', methods=['POST'])
def nlu_process():
    """Process natural language input with multilingual support"""
    try:
        data = request.get_json()
        text = data.get('text', '').strip()
        
        if not text:
            return jsonify({
                'success': False,
                'error': 'Text input is required'
            }), 400
        
        # Process with multilingual NLP
        result = multilingual_service.process_voice_input(text)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in NLU processing: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ai_bp.route('/translate', methods=['POST'])
def translate():
    """Translate text between languages"""
    try:
        data = request.get_json()
        text = data.get('text', '').strip()
        target_language = data.get('target_language', 'en')
        source_language = data.get('source_language')
        
        if not text:
            return jsonify({
                'success': False,
                'error': 'Text input is required'
            }), 400
        
        # Detect language if not provided
        if not source_language:
            source_language = multilingual_service.detect_language(text)
        
        # Translate text
        translated_text = multilingual_service.translate_text(text, target_language, source_language)
        
        return jsonify({
            'success': True,
            'original_text': text,
            'translated_text': translated_text,
            'source_language': source_language,
            'target_language': target_language,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in translation: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ai_bp.route('/languages', methods=['GET'])
def supported_languages():
    """Get list of supported languages"""
    try:
        languages = multilingual_service.get_supported_languages()
        
        return jsonify({
            'success': True,
            'languages': languages,
            'count': len(languages)
        })
        
    except Exception as e:
        logger.error(f"Error getting languages: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ai_bp.route('/current-rates', methods=['GET'])
def current_rates():
    """Get current exchange rates"""
    try:
        base_currency = request.args.get('base', 'USD').upper()
        
        rates = fx_prediction_service.get_current_rates(base_currency)
        
        return jsonify({
            'success': True,
            'base_currency': base_currency,
            'rates': rates,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting current rates: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def _generate_recommendations(fx_analysis: Dict, routing_analysis: Dict, fraud_risk) -> Dict:
    """Generate AI-powered recommendations based on all analyses"""
    recommendations = {
        'overall_recommendation': 'proceed',
        'confidence': 0.8,
        'reasons': [],
        'actions': []
    }
    
    # FX timing recommendation
    if 'prediction' in fx_analysis and 'recommendation' in fx_analysis['prediction']:
        fx_rec = fx_analysis['prediction']['recommendation']
        recommendations['reasons'].append(f"FX Analysis: {fx_rec['message']}")
        
        if fx_rec['action'] == 'wait':
            recommendations['actions'].append('Consider waiting for better exchange rates')
        elif fx_rec['action'] == 'send_now':
            recommendations['actions'].append('Send now to avoid rate deterioration')
    
    # Payment routing recommendation
    if 'recommended_provider' in routing_analysis:
        provider = routing_analysis['recommended_provider']
        savings = routing_analysis.get('potential_savings', 0)
        recommendations['reasons'].append(f"Best provider: {provider}")
        
        if savings > 0:
            recommendations['actions'].append(f"Save ${savings:.2f} by using {provider}")
    
    # Fraud risk consideration
    if fraud_risk.risk_level == 'HIGH':
        recommendations['overall_recommendation'] = 'review_required'
        recommendations['confidence'] = 0.3
        recommendations['reasons'].append('High fraud risk detected')
        recommendations['actions'].append('Additional verification required')
    elif fraud_risk.risk_level == 'MEDIUM':
        recommendations['confidence'] = 0.6
        recommendations['reasons'].append('Medium fraud risk - proceed with caution')
    
    return recommendations

def register_ai_routes(app):
    """Register AI routes with the Flask app"""
    app.register_blueprint(ai_bp, url_prefix='/api/ai')
