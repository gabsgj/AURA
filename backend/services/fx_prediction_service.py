"""
FX Rate Prediction Service using real APIs and ML models
Provides optimal timing recommendations for cross-border payments
"""

import os
import requests
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
import joblib
import logging
from typing import Dict, List, Optional, Tuple
from alpha_vantage.foreignexchange import ForeignExchange
from alpha_vantage.timeseries import TimeSeries

logger = logging.getLogger(__name__)

import requests
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

_session = requests.Session()
_adapter = requests.adapters.HTTPAdapter(pool_connections=10, pool_maxsize=20, max_retries=0)
_session.mount("http://", _adapter)
_session.mount("https://", _adapter)

class _HttpError(Exception):
    pass

@retry(
    reraise=True,
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=0.5, min=0.5, max=4),
    retry=retry_if_exception_type(_HttpError),
)
def _get_json(url: str, timeout: float = 8.0):
    resp = _session.get(url, timeout=timeout)
    if resp.status_code >= 400:
        raise _HttpError(f"GET {url} -> {resp.status_code}")
    return resp.json()

class FXPredictionService:
    def __init__(self):
        self.alpha_vantage_key = os.getenv('ALPHA_VANTAGE_API_KEY')
        self.exchangerate_key = os.getenv('EXCHANGERATE_API_KEY')
        self.fx = ForeignExchange(key=self.alpha_vantage_key, output_format='pandas') if self.alpha_vantage_key else None
        self.ts = TimeSeries(key=self.alpha_vantage_key, output_format='pandas') if self.alpha_vantage_key else None
        self.model_cache = {}
        self.scaler_cache = {}
        
    def get_current_rates(self, base_currency: str = 'USD') -> Dict:
        """Get current exchange rates from multiple sources"""
        rates = {}
        
        # Primary: ExchangeRate-API
        if self.exchangerate_key:
            try:
                url = f"https://v6.exchangerate-api.com/v6/{self.exchangerate_key}/latest/{base_currency}"
                data = _get_json(url)
                if data:
                    rates.update(data.get('conversion_rates', {}))
                    logger.info(f"Retrieved rates from ExchangeRate-API for {base_currency}")
            except Exception as e:
                logger.error(f"ExchangeRate-API error: {e}")
        
        # Fallback: Free API
        if not rates:
            try:
                url = f"https://api.exchangerate-api.com/v4/latest/{base_currency}"
                data = _get_json(url)
                if data:
                    rates.update(data.get('rates', {}))
                    logger.info(f"Retrieved rates from fallback API for {base_currency}")
            except Exception as e:
                logger.error(f"Fallback API error: {e}")
        
        return rates
    
    def get_historical_data(self, from_currency: str, to_currency: str, days: int = 100) -> pd.DataFrame:
        """Get historical FX data for prediction model"""
        if not self.fx:
            logger.warning("Alpha Vantage API key not configured")
            return pd.DataFrame()
        
        try:
            # Get daily FX data
            data, _ = self.fx.get_currency_exchange_daily(
                from_symbol=from_currency,
                to_symbol=to_currency,
                outputsize='full'
            )
            
            if data.empty:
                return pd.DataFrame()
            
            # Clean and prepare data
            data = data.head(days)
            data.columns = ['open', 'high', 'low', 'close']
            data['date'] = data.index
            data = data.sort_values('date')
            
            # Add technical indicators
            data['sma_5'] = data['close'].rolling(window=5).mean()
            data['sma_20'] = data['close'].rolling(window=20).mean()
            data['volatility'] = data['close'].rolling(window=10).std()
            data['rsi'] = self._calculate_rsi(data['close'])
            
            return data.dropna()
            
        except Exception as e:
            logger.error(f"Error fetching historical data: {e}")
            return pd.DataFrame()
    
    def _calculate_rsi(self, prices: pd.Series, window: int = 14) -> pd.Series:
        """Calculate Relative Strength Index"""
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=window).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=window).mean()
        rs = gain / loss
        return 100 - (100 / (1 + rs))
    
    def train_prediction_model(self, from_currency: str, to_currency: str) -> bool:
        """Train ML model for FX prediction"""
        try:
            data = self.get_historical_data(from_currency, to_currency)
            if data.empty or len(data) < 50:
                logger.warning(f"Insufficient data for {from_currency}/{to_currency}")
                return False
            
            # Prepare features
            features = ['open', 'high', 'low', 'sma_5', 'sma_20', 'volatility', 'rsi']
            X = data[features].values
            y = data['close'].shift(-1).dropna().values  # Predict next day's close
            X = X[:-1]  # Remove last row to match y
            
            # Split data
            split_idx = int(len(X) * 0.8)
            X_train, X_test = X[:split_idx], X[split_idx:]
            y_train, y_test = y[:split_idx], y[split_idx:]
            
            # Scale features
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            
            # Train model
            model = RandomForestRegressor(n_estimators=100, random_state=42)
            model.fit(X_train_scaled, y_train)
            
            # Evaluate
            score = model.score(X_test_scaled, y_test)
            logger.info(f"Model trained for {from_currency}/{to_currency} with R² score: {score:.3f}")
            
            # Cache model and scaler
            pair = f"{from_currency}_{to_currency}"
            self.model_cache[pair] = model
            self.scaler_cache[pair] = scaler
            
            return True
            
        except Exception as e:
            logger.error(f"Error training model: {e}")
            return False
    
    def predict_rate(self, from_currency: str, to_currency: str, days_ahead: int = 1) -> Dict:
        """Predict future exchange rate"""
        pair = f"{from_currency}_{to_currency}"
        
        # Check if model exists
        if pair not in self.model_cache:
            if not self.train_prediction_model(from_currency, to_currency):
                return {"error": "Unable to train prediction model"}
        
        try:
            # Get recent data
            data = self.get_historical_data(from_currency, to_currency, days=30)
            if data.empty:
                return {"error": "No historical data available"}
            
            # Prepare features from latest data
            latest = data.iloc[-1]
            features = [latest['open'], latest['high'], latest['low'], 
                       latest['sma_5'], latest['sma_20'], latest['volatility'], latest['rsi']]
            
            # Scale and predict
            model = self.model_cache[pair]
            scaler = self.scaler_cache[pair]
            features_scaled = scaler.transform([features])
            
            predicted_rate = model.predict(features_scaled)[0]
            current_rate = latest['close']
            
            # Calculate confidence and recommendation
            confidence = min(0.95, max(0.5, model.score(features_scaled, [current_rate])))
            change_percent = ((predicted_rate - current_rate) / current_rate) * 100
            
            recommendation = self._get_timing_recommendation(change_percent, confidence)
            
            return {
                "current_rate": float(current_rate),
                "predicted_rate": float(predicted_rate),
                "change_percent": float(change_percent),
                "confidence": float(confidence),
                "recommendation": recommendation,
                "prediction_date": (datetime.now() + timedelta(days=days_ahead)).isoformat(),
                "currency_pair": f"{from_currency}/{to_currency}"
            }
            
        except Exception as e:
            logger.error(f"Error predicting rate: {e}")
            return {"error": str(e)}
    
    def _get_timing_recommendation(self, change_percent: float, confidence: float) -> Dict:
        """Generate timing recommendation based on prediction"""
        if confidence < 0.6:
            return {
                "action": "neutral",
                "message": "Low prediction confidence. Consider current market rates.",
                "urgency": "low"
            }
        
        if change_percent > 2:
            return {
                "action": "wait",
                "message": f"Rate expected to improve by {change_percent:.1f}%. Consider waiting.",
                "urgency": "medium"
            }
        elif change_percent < -2:
            return {
                "action": "send_now",
                "message": f"Rate may decline by {abs(change_percent):.1f}%. Send now for better rates.",
                "urgency": "high"
            }
        else:
            return {
                "action": "neutral",
                "message": "Rate expected to remain stable. Send when convenient.",
                "urgency": "low"
            }
    
    def get_rate_analysis(self, from_currency: str, to_currency: str, amount: float) -> Dict:
        """Comprehensive rate analysis for a transaction"""
        try:
            # Get current rates
            current_rates = self.get_current_rates(from_currency)
            current_rate = current_rates.get(to_currency)
            
            if not current_rate:
                return {"error": f"Rate not available for {from_currency}/{to_currency}"}
            
            # Get prediction
            prediction = self.predict_rate(from_currency, to_currency)
            
            # Calculate potential savings/loss
            current_amount = amount * current_rate
            if 'predicted_rate' in prediction:
                predicted_amount = amount * prediction['predicted_rate']
                potential_difference = predicted_amount - current_amount
            else:
                predicted_amount = current_amount
                potential_difference = 0
            
            # Get historical volatility
            historical_data = self.get_historical_data(from_currency, to_currency, days=30)
            volatility = historical_data['close'].std() if not historical_data.empty else 0
            
            return {
                "currency_pair": f"{from_currency}/{to_currency}",
                "current_rate": current_rate,
                "amount_to_send": amount,
                "current_converted_amount": current_amount,
                "predicted_converted_amount": predicted_amount,
                "potential_difference": potential_difference,
                "volatility_30d": float(volatility),
                "prediction": prediction,
                "analysis_timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in rate analysis: {e}")
            return {"error": str(e)}

# Global instance
fx_prediction_service = FXPredictionService()
