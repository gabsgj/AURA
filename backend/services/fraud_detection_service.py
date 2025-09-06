"""
Advanced Fraud Detection Service using ML models and behavioral analysis
Real-time transaction monitoring and risk assessment
"""

import os
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib
import logging
from typing import Dict, List, Optional, Tuple
import json
from dataclasses import dataclass

logger = logging.getLogger(__name__)

def safe_parse_datetime(timestamp_str: str, default: datetime = None) -> datetime:
    """Safely parse datetime string with fallback to default"""
    if not timestamp_str:
        return default or datetime.now()
    
    try:
        return datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
    except (ValueError, AttributeError) as e:
        logger.warning(f"Failed to parse timestamp '{timestamp_str}': {e}")
        return default or datetime.now()

@dataclass
class FraudRiskFactors:
    velocity_risk: float
    amount_risk: float
    location_risk: float
    time_risk: float
    behavioral_risk: float
    overall_score: float
    risk_level: str

class FraudDetectionService:
    def __init__(self):
        self.threshold = float(os.getenv('FRAUD_DETECTION_THRESHOLD', 0.7))
        self.model = None
        self.scaler = None
        self.user_profiles = {}
        self.transaction_history = []
        self.load_or_create_model()
    
    def load_or_create_model(self):
        """Load existing model or create new one"""
        try:
            model_path = 'backend/models/fraud_model.pkl'
            scaler_path = 'backend/models/fraud_scaler.pkl'
            
            if os.path.exists(model_path) and os.path.exists(scaler_path):
                self.model = joblib.load(model_path)
                self.scaler = joblib.load(scaler_path)
                logger.info("Loaded existing fraud detection model")
            else:
                self._create_and_train_model()
                
        except Exception as e:
            logger.error(f"Error loading fraud model: {e}")
            self._create_and_train_model()
    
    def _create_and_train_model(self):
        """Create and train fraud detection model with synthetic data"""
        try:
            # Generate synthetic training data
            np.random.seed(42)
            n_samples = 10000
            
            # Normal transactions (90%)
            normal_data = []
            for _ in range(int(n_samples * 0.9)):
                normal_data.append([
                    np.random.lognormal(3, 1),  # amount (log-normal distribution)
                    np.random.randint(9, 18),   # hour of day (business hours)
                    np.random.randint(1, 6),    # day of week (weekdays)
                    np.random.exponential(2),   # time since last transaction
                    np.random.normal(1, 0.2),  # amount ratio to average
                    np.random.randint(0, 3),    # location changes
                    np.random.poisson(2),       # transactions per day
                    0  # not fraud
                ])
            
            # Fraudulent transactions (10%)
            fraud_data = []
            for _ in range(int(n_samples * 0.1)):
                fraud_data.append([
                    np.random.lognormal(5, 2),  # higher amounts
                    np.random.randint(0, 24),   # any time of day
                    np.random.randint(1, 8),    # any day
                    np.random.exponential(0.5), # rapid succession
                    np.random.normal(5, 2),     # unusual amount patterns
                    np.random.randint(2, 10),   # multiple locations
                    np.random.poisson(10),      # high frequency
                    1  # fraud
                ])
            
            # Combine data
            all_data = normal_data + fraud_data
            df = pd.DataFrame(all_data, columns=[
                'amount', 'hour', 'day_of_week', 'time_since_last',
                'amount_ratio', 'location_changes', 'daily_count', 'is_fraud'
            ])
            
            # Prepare features and target
            X = df.drop('is_fraud', axis=1)
            y = df['is_fraud']
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
            
            # Scale features
            self.scaler = StandardScaler()
            X_train_scaled = self.scaler.fit_transform(X_train)
            X_test_scaled = self.scaler.transform(X_test)
            
            # Train Isolation Forest for anomaly detection
            self.model = IsolationForest(
                contamination=0.1,
                random_state=42,
                n_estimators=100
            )
            self.model.fit(X_train_scaled)
            
            # Save model
            os.makedirs('backend/models', exist_ok=True)
            joblib.dump(self.model, 'backend/models/fraud_model.pkl')
            joblib.dump(self.scaler, 'backend/models/fraud_scaler.pkl')
            
            logger.info("Created and trained new fraud detection model")
            
        except Exception as e:
            logger.error(f"Error creating fraud model: {e}")
    
    def analyze_transaction_risk(self, transaction_data: Dict, user_id: str) -> FraudRiskFactors:
        """Analyze transaction for fraud risk"""
        try:
            # Extract transaction features
            amount = float(transaction_data.get('amount', 0))
            timestamp = safe_parse_datetime(transaction_data.get('timestamp'), datetime.now())
            recipient_country = transaction_data.get('recipient_country', 'US')
            sender_country = transaction_data.get('sender_country', 'US')
            
            # Get user profile
            user_profile = self.get_user_profile(user_id)
            
            # Calculate risk factors
            velocity_risk = self._calculate_velocity_risk(user_id, timestamp)
            amount_risk = self._calculate_amount_risk(amount, user_profile)
            location_risk = self._calculate_location_risk(sender_country, recipient_country, user_profile)
            time_risk = self._calculate_time_risk(timestamp, user_profile)
            behavioral_risk = self._calculate_behavioral_risk(transaction_data, user_profile)
            
            # Prepare features for ML model
            features = [
                amount,
                timestamp.hour,
                timestamp.weekday() + 1,
                self._time_since_last_transaction(user_id, timestamp),
                amount / max(user_profile.get('avg_amount', amount), 1),
                len(set(user_profile.get('countries', [recipient_country]))),
                len(user_profile.get('recent_transactions', []))
            ]
            
            # Get ML prediction
            if self.model and self.scaler:
                features_scaled = self.scaler.transform([features])
                ml_score = self.model.decision_function(features_scaled)[0]
                ml_risk = max(0, min(1, (ml_score + 0.5) / 1.0))  # Normalize to 0-1
            else:
                ml_risk = 0.5
            
            # Combine all risk factors
            overall_score = (
                velocity_risk * 0.25 +
                amount_risk * 0.20 +
                location_risk * 0.15 +
                time_risk * 0.10 +
                behavioral_risk * 0.15 +
                ml_risk * 0.15
            )
            
            # Determine risk level
            if overall_score >= 0.8:
                risk_level = "HIGH"
            elif overall_score >= 0.6:
                risk_level = "MEDIUM"
            elif overall_score >= 0.4:
                risk_level = "LOW"
            else:
                risk_level = "MINIMAL"
            
            return FraudRiskFactors(
                velocity_risk=velocity_risk,
                amount_risk=amount_risk,
                location_risk=location_risk,
                time_risk=time_risk,
                behavioral_risk=behavioral_risk,
                overall_score=overall_score,
                risk_level=risk_level
            )
            
        except Exception as e:
            logger.error(f"Error analyzing transaction risk: {e}")
            return FraudRiskFactors(0.5, 0.5, 0.5, 0.5, 0.5, 0.5, "MEDIUM")
    
    def _calculate_velocity_risk(self, user_id: str, timestamp: datetime) -> float:
        """Calculate risk based on transaction velocity"""
        try:
            recent_transactions = []
            for t in self.transaction_history:
                if t.get('user_id') == user_id:
                    t_timestamp = safe_parse_datetime(t.get('timestamp'))
                    if t_timestamp > timestamp - timedelta(hours=24):
                        recent_transactions.append(t)
            
            count_1h = 0
            for t in recent_transactions:
                t_timestamp = safe_parse_datetime(t.get('timestamp'))
                if t_timestamp > timestamp - timedelta(hours=1):
                    count_1h += 1
                    
            count_24h = len(recent_transactions)
            
            # Risk increases with frequency
            velocity_score = min(1.0, (count_1h * 0.3 + count_24h * 0.05))
            return velocity_score
            
        except Exception as e:
            logger.error(f"Error calculating velocity risk: {e}")
            return 0.0
    
    def _calculate_amount_risk(self, amount: float, user_profile: Dict) -> float:
        """Calculate risk based on transaction amount"""
        try:
            avg_amount = user_profile.get('avg_amount', amount)
            max_amount = user_profile.get('max_amount', amount)
            
            if avg_amount == 0:
                return 0.5
            
            # Risk increases for amounts significantly higher than usual
            ratio = amount / avg_amount
            if ratio > 10:
                return 1.0
            elif ratio > 5:
                return 0.8
            elif ratio > 3:
                return 0.6
            elif ratio > 2:
                return 0.4
            else:
                return 0.2
                
        except Exception:
            return 0.0
    
    def _calculate_location_risk(self, sender_country: str, recipient_country: str, user_profile: Dict) -> float:
        """Calculate risk based on location patterns"""
        try:
            # High-risk countries (simplified list)
            high_risk_countries = {'AF', 'IQ', 'SY', 'YE', 'SO', 'LY'}
            
            # User's typical countries
            typical_countries = set(user_profile.get('countries', []))
            
            risk_score = 0.0
            
            # New recipient country
            if recipient_country not in typical_countries:
                risk_score += 0.3
            
            # High-risk country
            if recipient_country in high_risk_countries:
                risk_score += 0.5
            
            # Cross-border vs domestic
            if sender_country != recipient_country:
                risk_score += 0.1
            
            return min(1.0, risk_score)
            
        except Exception:
            return 0.0
    
    def _calculate_time_risk(self, timestamp: datetime, user_profile: Dict) -> float:
        """Calculate risk based on timing patterns"""
        try:
            hour = timestamp.hour
            day_of_week = timestamp.weekday()
            
            # Unusual hours (late night/early morning)
            if hour < 6 or hour > 22:
                time_risk = 0.6
            elif hour < 9 or hour > 18:
                time_risk = 0.3
            else:
                time_risk = 0.1
            
            # Weekend transactions
            if day_of_week >= 5:  # Saturday, Sunday
                time_risk += 0.2
            
            return min(1.0, time_risk)
            
        except Exception:
            return 0.0
    
    def _calculate_behavioral_risk(self, transaction_data: Dict, user_profile: Dict) -> float:
        """Calculate risk based on behavioral patterns"""
        try:
            risk_score = 0.0
            
            # Check for unusual recipient patterns
            recipient_info = transaction_data.get('recipient', {})
            if not recipient_info.get('name') or len(recipient_info.get('name', '')) < 3:
                risk_score += 0.3
            
            # Check for round amounts (often suspicious)
            amount = float(transaction_data.get('amount', 0))
            if amount % 100 == 0 and amount >= 1000:
                risk_score += 0.2
            
            # Check purpose/description
            purpose = transaction_data.get('purpose', '').lower()
            suspicious_purposes = ['investment', 'business opportunity', 'emergency', 'urgent']
            if any(word in purpose for word in suspicious_purposes):
                risk_score += 0.3
            
            return min(1.0, risk_score)
            
        except Exception:
            return 0.0
    
    def _time_since_last_transaction(self, user_id: str, timestamp: datetime) -> float:
        """Calculate hours since last transaction"""
        try:
            user_transactions = [
                t for t in self.transaction_history
                if t.get('user_id') == user_id
            ]
            
            if not user_transactions:
                return 24.0  # Default if no history
            
            # Find the most recent transaction with safe datetime parsing
            last_time = None
            for t in user_transactions:
                t_time = safe_parse_datetime(t.get('timestamp'))
                if last_time is None or t_time > last_time:
                    last_time = t_time
            
            if last_time is None:
                return 24.0
                
            return (timestamp - last_time).total_seconds() / 3600
            
        except Exception as e:
            logger.error(f"Error calculating time since last transaction: {e}")
            return 24.0
    
    def get_user_profile(self, user_id: str) -> Dict:
        """Get or create user behavioral profile"""
        if user_id not in self.user_profiles:
            self.user_profiles[user_id] = {
                'avg_amount': 0,
                'max_amount': 0,
                'transaction_count': 0,
                'countries': [],
                'recent_transactions': [],
                'created_at': datetime.now().isoformat()
            }
        
        return self.user_profiles[user_id]
    
    def update_user_profile(self, user_id: str, transaction_data: Dict):
        """Update user profile with new transaction"""
        try:
            profile = self.get_user_profile(user_id)
            amount = float(transaction_data.get('amount', 0))
            
            # Update statistics
            profile['transaction_count'] += 1
            profile['avg_amount'] = (
                (profile['avg_amount'] * (profile['transaction_count'] - 1) + amount) /
                profile['transaction_count']
            )
            profile['max_amount'] = max(profile['max_amount'], amount)
            
            # Update countries
            recipient_country = transaction_data.get('recipient_country')
            if recipient_country and recipient_country not in profile['countries']:
                profile['countries'].append(recipient_country)
            
            # Keep recent transactions (last 10)
            profile['recent_transactions'].append({
                'amount': amount,
                'timestamp': transaction_data.get('timestamp'),
                'country': recipient_country
            })
            profile['recent_transactions'] = profile['recent_transactions'][-10:]
            
            # Add to global transaction history
            self.transaction_history.append({
                'user_id': user_id,
                'amount': amount,
                'timestamp': transaction_data.get('timestamp', datetime.now().isoformat()),
                'recipient_country': recipient_country
            })
            
            # Keep only recent history (last 1000 transactions)
            self.transaction_history = self.transaction_history[-1000:]
            
        except Exception as e:
            logger.error(f"Error updating user profile: {e}")
    
    def should_block_transaction(self, risk_factors: FraudRiskFactors) -> Dict:
        """Determine if transaction should be blocked"""
        if risk_factors.overall_score >= 0.9:
            return {
                "block": True,
                "reason": "High fraud risk detected",
                "action": "BLOCK",
                "message": "Transaction blocked due to high fraud risk. Please contact support."
            }
        elif risk_factors.overall_score >= 0.7:
            return {
                "block": False,
                "reason": "Medium fraud risk detected",
                "action": "REVIEW",
                "message": "Transaction flagged for manual review. Additional verification may be required."
            }
        elif risk_factors.overall_score >= 0.5:
            return {
                "block": False,
                "reason": "Low fraud risk detected",
                "action": "MONITOR",
                "message": "Transaction approved with monitoring."
            }
        else:
            return {
                "block": False,
                "reason": "Low risk transaction",
                "action": "APPROVE",
                "message": "Transaction approved."
            }

# Global instance
fraud_detection_service = FraudDetectionService()
