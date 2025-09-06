"""
API routes for AURA application
"""
from flask import Blueprint, request, jsonify, current_app
from backend.models import User, Wallet, Transaction, FraudLog, db
from backend.auth import token_required, generate_token
from backend.ml_models import fraud_detector
from backend.fx_service import fx_service
from backend.services.payments_service import payments_service
from backend.services.payment_routing_service import payment_routing_service
from backend.services.supabase_service import supabase_service
from backend.nlp_service import nlp_service
from backend.utils import sanitize_input
import logging
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)

# Create blueprints
auth_bp = Blueprint('auth', __name__, url_prefix='/auth')
payments_bp = Blueprint('payments', __name__, url_prefix='/payments')
fx_bp = Blueprint('fx', __name__, url_prefix='/fx')
fraud_bp = Blueprint('fraud', __name__, url_prefix='/fraud')
nlp_bp = Blueprint('nlp', __name__, url_prefix='/nlp')
wallet_bp = Blueprint('wallet', __name__, url_prefix='/wallet')
recurring_bp = Blueprint('recurring', __name__, url_prefix='/recurring')
health_bp = Blueprint('health', __name__, url_prefix='')

# Aggregate blueprint to mount at /api
api_bp = Blueprint('api', __name__)

def _register_sub_blueprints():
    api_bp.register_blueprint(auth_bp)
    api_bp.register_blueprint(payments_bp)
    api_bp.register_blueprint(fx_bp)
    api_bp.register_blueprint(fraud_bp)
    api_bp.register_blueprint(nlp_bp)
    api_bp.register_blueprint(wallet_bp)
    api_bp.register_blueprint(recurring_bp)
    api_bp.register_blueprint(health_bp)

_register_sub_blueprints()

# Authentication Routes
@auth_bp.route('/register', methods=['POST'])
def register():
    """User registration endpoint"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['email', 'password', 'first_name', 'last_name']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Sanitize inputs
        email = sanitize_input(data['email'].lower().strip())
        first_name = sanitize_input(data['first_name'].strip())
        last_name = sanitize_input(data['last_name'].strip())
        phone = sanitize_input(data.get('phone', '').strip()) if data.get('phone') else None
        country = sanitize_input(data.get('country', '').strip()) if data.get('country') else None
        
        # Check if user already exists
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already registered'}), 400
        
        # Create new user
        user = User(
            email=email,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            country=country
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.commit()
        
        # Create default wallets
        default_currencies = ['USD', 'EUR', 'GBP', 'INR']
        for currency in default_currencies:
            wallet = Wallet(user_id=user.id, currency=currency, balance=0.00)
            db.session.add(wallet)
        
        db.session.commit()
        
        # Generate token
        token = generate_token(user.id)
        
        logger.info(f"New user registered: {email}")
        
        return jsonify({
            'success': True,
            'message': 'User registered successfully',
            'user': user.to_dict(),
            'token': token
        }), 201
        
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Registration failed'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """User login endpoint"""
    try:
        data = request.get_json()
        
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password are required'}), 400
        
        email = sanitize_input(data['email'].lower().strip())
        password = data['password']
        
        # Find user
        user = User.query.filter_by(email=email).first()
        
        if not user or not user.check_password(password):
            return jsonify({'error': 'Invalid email or password'}), 401
        
        if not user.is_active:
            return jsonify({'error': 'Account is deactivated'}), 401
        
        # Generate token
        token = generate_token(user.id)
        
        logger.info(f"User logged in: {email}")
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'user': user.to_dict(),
            'token': token
        })
        
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({'error': 'Login failed'}), 500

# Payment Routes
@payments_bp.route('/providers', methods=['POST'])
def get_providers():
    """Get payment provider quotes using AI-powered routing service"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['amount', 'from_currency', 'to_currency']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        amount = float(data['amount'])
        from_currency = data['from_currency'].upper()
        to_currency = data['to_currency'].upper()
        
        if amount <= 0:
            return jsonify({'error': 'Amount must be greater than 0'}), 400
        
        # Validate corridor support
        corridor_info = payment_routing_service.validate_transfer_corridor(from_currency, to_currency)
        if not corridor_info['is_supported']:
            return jsonify({
                'error': f'Transfer corridor {from_currency}-{to_currency} is not currently supported',
                'supported_corridors': ['USD-EUR', 'USD-GBP', 'USD-INR', 'USD-MXN', 'USD-PHP', 'EUR-USD', 'GBP-USD']
            }), 400
        
        # User preferences (no auth needed for quote discovery)
        user_preferences = {
            'priority': data.get('priority', 'balanced'),
            'max_fee_percent': data.get('max_fee_percent', 5.0),
            'min_provider_rating': data.get('min_provider_rating', 4.0)
        }
        
        # Analyze payment routes using AI-powered service
        routes = payment_routing_service.analyze_payment_routes(
            from_currency, to_currency, amount, 
            user_preferences.get('priority', 'balanced')
        )
        
        # Get optimal route
        optimal_route_info = payment_routing_service.get_optimal_route(
            from_currency, to_currency, amount, user_preferences
        )
        
        # Format providers for frontend
        providers = []
        for route in routes:
            providers.append({
                'name': route.provider,
                'provider': route.provider.lower().replace(' ', '_'),
                'fee': route.estimated_fee,
                'exchange_rate': route.exchange_rate,
                'delivery_time': route.delivery_time,
                'rating': route.provider_rating,
                'total_cost': route.total_cost,
                'recipient_amount': route.recipient_amount,
                'confidence_score': route.confidence_score,
                'is_recommended': route.provider == optimal_route_info.get('recommended_provider'),
                'features': [
                    'Low fees' if route.estimated_fee/amount < 0.01 else 'Standard fees',
                    'Fast' if '0-1' in route.delivery_time else 'Reliable',
                    'High rating' if route.provider_rating >= 4.5 else 'Trusted'
                ]
            })
        
        return jsonify({
            'success': True,
            'providers': providers,
            'optimal_route': optimal_route_info,
            'corridor_info': corridor_info,
            'request': {
                'amount': amount,
                'from_currency': from_currency,
                'to_currency': to_currency,
                'preferences': user_preferences
            }
        })
        
    except ValueError:
        return jsonify({'error': 'Invalid amount'}), 400
    except Exception as e:
        logger.error(f"Error getting providers: {str(e)}")
        return jsonify({'error': 'Failed to get provider quotes'}), 500

@payments_bp.route('/execute', methods=['POST'])
@token_required
def execute_payment(user):
    """Execute a payment transaction"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['amount', 'from_currency', 'to_currency', 'provider', 'recipient']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        amount = float(data['amount'])
        from_currency = data['from_currency'].upper()
        to_currency = data['to_currency'].upper()
        provider = sanitize_input(data['provider'])
        recipient = sanitize_input(data['recipient'])
        
        if amount <= 0:
            return jsonify({'error': 'Amount must be greater than 0'}), 400
        
        # Get exchange rate
        exchange_rate = fx_service.get_rate(from_currency, to_currency)
        if not exchange_rate:
            return jsonify({'error': 'Unable to get exchange rate'}), 500
        
        # Calculate fee (simplified)
        fee = round(amount * 0.01 + 2.99, 2)
        total_cost = amount + fee
        
        # Check fraud score
        fraud_score = fraud_detector.predict_fraud_score(data, user.to_dict())
        is_fraud, _ = fraud_detector.is_fraud(data, user.to_dict())
        
        # Create transaction
        transaction = Transaction(
            user_id=user.id,
            amount=amount,
            from_currency=from_currency,
            to_currency=to_currency,
            exchange_rate=exchange_rate,
            fee=fee,
            total_cost=total_cost,
            provider=provider,
            recipient=recipient,
            status='on_hold' if is_fraud else 'initiated',
            fraud_score=fraud_score
        )
        
        db.session.add(transaction)
        db.session.commit()

        # Create Stripe test payment intent
        stripe_intent = payments_service.create_test_payment(
            amount=amount,
            currency=from_currency,
            description=f"AURA transfer to {recipient}",
            metadata={
                'user_id': str(user.id),
                'transaction_id': str(transaction.id),
                'provider': provider,
                'from_currency': from_currency,
                'to_currency': to_currency,
            }
        )

        # Log fraud to Supabase (if configured)
        try:
            supabase_service.insert('fraud_logs', {
                'user_id': str(user.id),
                'transaction_id': str(transaction.id),
                'risk_score': float(fraud_score),
                'is_fraud': bool(is_fraud),
                'payload': data,
            })
        except Exception:
            pass
        
        # Log fraud check
        fraud_log = FraudLog(
            user_id=user.id,
            transaction_id=transaction.id,
            event_type='payment_execution',
            event_data=data,
            risk_score=fraud_score,
            is_fraud=is_fraud
        )
        
        db.session.add(fraud_log)
        db.session.commit()
        
        logger.info(f"Payment executed: {transaction.id} by user {user.id}")
        
        return jsonify({
            'success': True,
            'transaction': transaction.to_dict(),
            'fraud_score': fraud_score,
            'status': 'on_hold' if is_fraud else 'initiated',
            'stripe': {
                'id': stripe_intent.get('id'),
                'status': stripe_intent.get('status')
            }
        }), 201
        
    except ValueError:
        return jsonify({'error': 'Invalid amount'}), 400
    except Exception as e:
        logger.error(f"Error executing payment: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Payment execution failed'}), 500

# FX Routes
@fx_bp.route('/quotes', methods=['GET'])
def get_fx_quotes():
    """Get foreign exchange quotes"""
    try:
        # Get and validate parameters
        from_currency = request.args.get('from', 'USD').upper()
        to_currency = request.args.get('to', 'EUR').upper()
        
        if len(from_currency) != 3 or not from_currency.isalpha():
            return jsonify({'error': 'Invalid from_currency code'}), 400
        if len(to_currency) != 3 or not to_currency.isalpha():
            return jsonify({'error': 'Invalid to_currency code'}), 400
            
        try:
            amount = float(request.args.get('amount', 1))
            if amount <= 0:
                return jsonify({'error': 'Amount must be greater than 0'}), 400
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid amount format'}), 400
        
        logger.info(f"Fetching FX quote: {amount} {from_currency} to {to_currency}")
        
        # Get current rate with enhanced error handling
        rate = fx_service.get_rate(from_currency, to_currency)
        if rate is None:
            logger.error(f"Failed to get FX rate for {from_currency}/{to_currency}")
            return jsonify({
                'error': 'Service temporarily unavailable',
                'details': 'Could not fetch exchange rates. Please try again later.'
            }), 503
        
        # Get historical rates with error handling
        historical_rates = []
        try:
            historical_rates = fx_service.get_historical_rates(from_currency, to_currency, days=7)
            if not historical_rates:
                logger.warning(f"No historical rates available for {from_currency}/{to_currency}")
        except Exception as e:
            logger.error(f"Error getting historical rates: {str(e)}")
            # Continue with empty historical rates if there's an error
        
        response = {
            'success': True,
            'quote': {
                'from_currency': from_currency,
                'to_currency': to_currency,
                'rate': rate,
                'amount': amount,
                'converted_amount': round(amount * rate, 6),  # More precision for small amounts
                'timestamp': datetime.utcnow().isoformat()
            },
            'historical_rates': historical_rates[-10:],  # Last 10 rates
            'disclaimer': 'Rates are for informational purposes only and may be delayed.'
        }
        
        return jsonify(response)
        
    except Exception as e:
        logger.exception("Unexpected error in get_fx_quotes")
        return jsonify({
            'error': 'Internal server error',
            'details': 'An unexpected error occurred while processing your request.'
        }), 500

@fx_bp.route('/forecast', methods=['GET'])
def get_fx_forecast():
    """Get AI-powered FX forecast"""
    try:
        # Get and validate parameters
        from_currency = request.args.get('from', 'USD').upper()
        to_currency = request.args.get('to', 'EUR').upper()
        
        if len(from_currency) != 3 or not from_currency.isalpha():
            return jsonify({'error': 'Invalid from_currency code'}), 400
        if len(to_currency) != 3 or not to_currency.isalpha():
            return jsonify({'error': 'Invalid to_currency code'}), 400
            
        try:
            days = int(request.args.get('days', 7))
            if days < 1 or days > 30:
                return jsonify({
                    'error': 'Invalid forecast period',
                    'details': 'Days must be between 1 and 30'
                }), 400
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid days parameter'}), 400
            
        logger.info(f"Generating FX forecast: {from_currency} to {to_currency} for {days} days")
        
        # Get current rate first to verify the currency pair is valid
        current_rate = fx_service.get_rate(from_currency, to_currency)
        if current_rate is None:
            return jsonify({
                'error': 'Unsupported currency pair',
                'details': f'Cannot get rates for {from_currency}/{to_currency}'
            }), 400
            
        # Get forecast with error handling
        forecast = fx_service.get_forecast(from_currency, to_currency, days)
        if not forecast:
            logger.error(f"Failed to generate forecast for {from_currency}/{to_currency}")
            return jsonify({
                'error': 'Forecast service unavailable',
                'details': 'Could not generate forecast. Please try again later.'
            }), 503
            
        response = {
            'success': True,
            'forecast': forecast,
            'current_rate': current_rate,
            'disclaimer': (
                'Forecasts are based on historical data and market analysis. '
                'Past performance is not indicative of future results.'
            )
        }
        
        return jsonify(response)
        
    except Exception as e:
        logger.exception("Unexpected error in get_fx_forecast")
        return jsonify({
            'error': 'Internal server error',
            'details': 'An unexpected error occurred while generating the forecast.'
        }), 500

# Fraud Detection Routes
@fraud_bp.route('/check', methods=['POST'])
@token_required
def check_fraud(user):
    """Check transaction for fraud"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Transaction data is required'}), 400
        
        # Get fraud score
        fraud_score = fraud_detector.predict_fraud_score(data, user.to_dict())
        is_fraud, _ = fraud_detector.is_fraud(data, user.to_dict())
        
        # Log the check
        fraud_log = FraudLog(
            user_id=user.id,
            event_type='fraud_check',
            event_data=data,
            risk_score=fraud_score,
            is_fraud=is_fraud
        )
        
        db.session.add(fraud_log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'fraud_score': fraud_score,
            'is_fraud': is_fraud,
            'risk_level': 'high' if fraud_score > 0.7 else 'medium' if fraud_score > 0.4 else 'low'
        })
        
    except Exception as e:
        logger.error(f"Error checking fraud: {str(e)}")
        return jsonify({'error': 'Fraud check failed'}), 500

@fraud_bp.route('/log', methods=['POST'])
@token_required
def log_fraud_event(user):
    """Log user event for model retraining"""
    try:
        data = request.get_json()
        
        required_fields = ['event_type', 'event_data']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        event_type = sanitize_input(data['event_type'])
        event_data = data['event_data']
        is_fraud = data.get('is_fraud', False)
        
        # Create fraud log
        fraud_log = FraudLog(
            user_id=user.id,
            event_type=event_type,
            event_data=event_data,
            is_fraud=is_fraud
        )
        
        db.session.add(fraud_log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Event logged successfully'
        })
        
    except Exception as e:
        logger.error(f"Error logging fraud event: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to log event'}), 500

# NLP Routes
@nlp_bp.route('/translate', methods=['POST'])
def translate_text(user):
    """Translate text to different language"""
    try:
        data = request.get_json()
        
        required_fields = ['text', 'target_language']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        text = data['text']
        target_language = data['target_language']
        source_language = data.get('source_language', 'auto')
        
        if not text.strip():
            return jsonify({'error': 'Text cannot be empty'}), 400
        
        # Auto-detect source language if needed
        if source_language == 'auto':
            source_language = nlp_service.detect_language(text)
        
        # Translate text
        result = nlp_service.translate_text(text, source_language, target_language)
        
        return jsonify({
            'success': True,
            'translation': result
        })
        
    except Exception as e:
        logger.error(f"Error translating text: {str(e)}")
        return jsonify({'error': 'Translation failed'}), 500

@nlp_bp.route('/languages', methods=['GET'])
def get_supported_languages():
    """Get supported languages for translation"""
    try:
        languages = nlp_service.get_supported_languages()
        
        return jsonify({
            'success': True,
            'supported_languages': languages
        })
        
    except Exception as e:
        logger.error(f"Error getting supported languages: {str(e)}")
        return jsonify({'error': 'Failed to get supported languages'}), 500

# Simple NLU endpoint for frontend compatibility
@nlp_bp.route('/nlu', methods=['POST'])
def nlu_process():
    """Natural Language Understanding endpoint"""
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({'error': 'Missing required field: text'}), 400
        
        text = sanitize_input(data.get('text', ''))
        if not text:
            return jsonify({'error': 'Empty text provided'}), 400
        
        # Extract intent and entities
        intent_result = nlp_service.extract_intent(text)
        language = nlp_service.detect_language(text)
        
        result = {
            'success': True,
            'text': text,
            'language': language,
            'intent': intent_result.get('intent', 'unknown'),
            'confidence': 0.8,  # Mock confidence
            'entities': [],
            'processed_at': datetime.utcnow().isoformat()
        }
        
        logger.info(f"NLU processed: {text} -> {intent_result.get('intent', 'unknown')}")
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in NLU processing: {str(e)}")
        return jsonify({'error': 'NLU processing failed'}), 500

# Health and Metrics Routes
@health_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        # Check database connection
        db.session.execute('SELECT 1')
        
        return jsonify({
            'status': 'healthy',
            'service': 'AURA API',
            'version': '1.0.0',
            'timestamp': datetime.utcnow().isoformat(),
            'database': 'connected'
        })
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            'status': 'unhealthy',
            'service': 'AURA API',
            'version': '1.0.0',
            'timestamp': datetime.utcnow().isoformat(),
            'database': 'disconnected',
            'error': str(e)
        }), 500

@health_bp.route('/metrics/count', methods=['GET'])
@token_required
def get_metrics(user):
    """Get basic metrics"""
    try:
        # Get counts
        total_users = User.query.count()
        total_transactions = Transaction.query.count()
        user_transactions = Transaction.query.filter_by(user_id=user.id).count()
        
        # Get recent activity
        recent_transactions = Transaction.query.filter_by(user_id=user.id)\
            .order_by(Transaction.created_at.desc()).limit(5).all()
        
        return jsonify({
            'success': True,
            'metrics': {
                'total_users': total_users,
                'total_transactions': total_transactions,
                'user_transactions': user_transactions,
                'recent_transactions': [tx.to_dict() for tx in recent_transactions]
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting metrics: {str(e)}")
        return jsonify({'error': 'Failed to get metrics'}), 500

# Wallet Routes
@wallet_bp.route('/', methods=['GET'])
@token_required
def get_wallet(user):
    """Get user wallet balances"""
    try:
        wallets = Wallet.query.filter_by(user_id=user.id).all()
        
        wallet_data = []
        for wallet in wallets:
            wallet_data.append({
                'currency': wallet.currency,
                'balance': float(wallet.balance),
                'status': 'active'
            })
        
        return jsonify({
            'success': True,
            'wallets': wallet_data,
            'user_id': user.id
        })
        
    except Exception as e:
        logger.error(f"Error getting wallet: {str(e)}")
        return jsonify({'error': 'Failed to get wallet'}), 500

@wallet_bp.route('/deposit', methods=['POST'])
@token_required
def deposit_to_wallet(user):
    """Deposit money to wallet"""
    try:
        data = request.get_json()
        
        required_fields = ['amount', 'currency']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        amount = float(data['amount'])
        currency = data['currency'].upper()
        
        if amount <= 0:
            return jsonify({'error': 'Amount must be greater than 0'}), 400
        
        # Find or create wallet
        wallet = Wallet.query.filter_by(user_id=user.id, currency=currency).first()
        if not wallet:
            wallet = Wallet(user_id=user.id, currency=currency, balance=0.00)
            db.session.add(wallet)
        
        # Update balance
        wallet.balance += amount
        db.session.commit()
        
        logger.info(f"Deposit: {amount} {currency} to user {user.id}")
        
        return jsonify({
            'success': True,
            'message': f'Deposited {amount} {currency}',
            'new_balance': float(wallet.balance)
        })
        
    except ValueError:
        return jsonify({'error': 'Invalid amount'}), 400
    except Exception as e:
        logger.error(f"Error depositing to wallet: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Deposit failed'}), 500

@wallet_bp.route('/withdraw', methods=['POST'])
@token_required
def withdraw_from_wallet(user):
    """Withdraw money from wallet"""
    try:
        data = request.get_json()
        
        required_fields = ['amount', 'currency']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        amount = float(data['amount'])
        currency = data['currency'].upper()
        
        if amount <= 0:
            return jsonify({'error': 'Amount must be greater than 0'}), 400
        
        # Find wallet
        wallet = Wallet.query.filter_by(user_id=user.id, currency=currency).first()
        if not wallet:
            return jsonify({'error': f'No {currency} wallet found'}), 404
        
        if wallet.balance < amount:
            return jsonify({'error': 'Insufficient balance'}), 400
        
        # Update balance
        wallet.balance -= amount
        db.session.commit()
        
        logger.info(f"Withdrawal: {amount} {currency} from user {user.id}")
        
        return jsonify({
            'success': True,
            'message': f'Withdrew {amount} {currency}',
            'new_balance': float(wallet.balance)
        })
        
    except ValueError:
        return jsonify({'error': 'Invalid amount'}), 400
    except Exception as e:
        logger.error(f"Error withdrawing from wallet: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Withdrawal failed'}), 500

# Recurring Payment Routes
@recurring_bp.route('/', methods=['GET'])
@token_required
def get_recurring_payments(user):
    """Get user's recurring payments"""
    try:
        # For now, return mock data since we don't have RecurringPayment model
        recurring_payments = [
            {
                'id': 'rec_001',
                'recipient': 'John Doe',
                'amount': 500.00,
                'currency': 'USD',
                'frequency': 'monthly',
                'next_payment': '2024-02-01',
                'status': 'active'
            }
        ]
        
        return jsonify({
            'success': True,
            'recurring_payments': recurring_payments
        })
        
    except Exception as e:
        logger.error(f"Error getting recurring payments: {str(e)}")
        return jsonify({'error': 'Failed to get recurring payments'}), 500

@recurring_bp.route('/', methods=['POST'])
@token_required
def create_recurring_payment(user):
    """Create a new recurring payment"""
    try:
        data = request.get_json()
        
        required_fields = ['recipient', 'amount', 'currency', 'frequency']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        # For now, just return success since we don't have RecurringPayment model
        payment_id = f"rec_{uuid.uuid4().hex[:8]}"
        
        logger.info(f"Recurring payment created: {payment_id} for user {user.id}")
        
        return jsonify({
            'success': True,
            'message': 'Recurring payment created',
            'payment_id': payment_id
        }), 201
        
    except Exception as e:
        logger.error(f"Error creating recurring payment: {str(e)}")
        return jsonify({'error': 'Failed to create recurring payment'}), 500

@recurring_bp.route('/<payment_id>', methods=['DELETE'])
@token_required
def cancel_recurring_payment(user, payment_id):
    """Cancel a recurring payment"""
    try:
        # For now, just return success
        logger.info(f"Recurring payment cancelled: {payment_id} for user {user.id}")
        
        return jsonify({
            'success': True,
            'message': 'Recurring payment cancelled'
        })
        
    except Exception as e:
        logger.error(f"Error cancelling recurring payment: {str(e)}")
        return jsonify({'error': 'Failed to cancel recurring payment'}), 500

# Register all blueprints
def register_routes(app):
    """Register all route blueprints with the Flask app"""
    app.register_blueprint(auth_bp)
    app.register_blueprint(payments_bp)
    app.register_blueprint(fx_bp)
    app.register_blueprint(fraud_bp)
    app.register_blueprint(nlp_bp)
    app.register_blueprint(wallet_bp)
    app.register_blueprint(recurring_bp)
    app.register_blueprint(health_bp)