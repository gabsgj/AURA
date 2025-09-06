"""Live FX service backed by exchangerate.host API."""

import os
import requests
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class FXService:
    def __init__(self):
        # Use free exchangerate-api.com for demo
        self.api_base = os.getenv('FX_API_BASE', 'https://api.exchangerate-api.com/v4/latest')

    def get_rate(self, from_currency: str, to_currency: str) -> float:
        if from_currency == to_currency:
            return 1.0
            
        # Try API first, then fallback to mock rates
        rate = self._get_rate_from_api(from_currency, to_currency)
        if rate is not None:
            return rate
            
        # Fallback to mock rates when API fails
        logger.warning(f"API failed, using fallback rates for {from_currency}/{to_currency}")
        return self._get_fallback_rate(from_currency, to_currency)
    
    def _get_rate_from_api(self, from_currency: str, to_currency: str) -> float:
        # Use exchangerate-api.com format
        url = f"{self.api_base}/{from_currency}"
        
        try:
            logger.info(f"Fetching FX rate from {url} for {from_currency} to {to_currency}")
            resp = requests.get(url, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            
            # Check if target currency exists in rates
            if 'rates' not in data or to_currency not in data['rates']:
                logger.error(f"Currency {to_currency} not found in API response")
                return None
                
            rate = float(data['rates'][to_currency])
            logger.info(f"Successfully got rate for {from_currency}/{to_currency}: {rate}")
            return rate
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching FX rate: {str(e)}")
            return None
        except (ValueError, KeyError) as e:
            logger.error(f"Error parsing FX rate response: {str(e)}")
            return None
    
    def _get_fallback_rate(self, from_currency: str, to_currency: str) -> float:
        """Provide fallback exchange rates when API is unavailable"""
        # Mock exchange rates for common currency pairs
        fallback_rates = {
            ('USD', 'EUR'): 0.92,
            ('EUR', 'USD'): 1.09,
            ('USD', 'GBP'): 0.79,
            ('GBP', 'USD'): 1.27,
            ('USD', 'INR'): 83.25,
            ('INR', 'USD'): 0.012,
            ('USD', 'PHP'): 56.50,
            ('PHP', 'USD'): 0.018,
            ('USD', 'MXN'): 17.85,
            ('MXN', 'USD'): 0.056,
            ('EUR', 'GBP'): 0.86,
            ('GBP', 'EUR'): 1.16,
            ('EUR', 'INR'): 90.75,
            ('INR', 'EUR'): 0.011,
        }
        
        rate = fallback_rates.get((from_currency, to_currency))
        if rate:
            return rate
            
        # If no direct rate, try inverse
        inverse_rate = fallback_rates.get((to_currency, from_currency))
        if inverse_rate:
            return 1.0 / inverse_rate
            
        # Default fallback rate
        logger.warning(f"No fallback rate available for {from_currency}/{to_currency}, using 1.0")
        return 1.0

    def get_historical_rates(self, from_currency: str, to_currency: str, days: int = 7):
        end = datetime.utcnow().date()
        start = end - timedelta(days=days)
        url = f"{self.api_base}/timeseries"
        params = {
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            "base": from_currency,
            "symbols": to_currency,
        }
        
        try:
            logger.info(f"Fetching historical rates from {self.api_base} for {from_currency} to {to_currency}")
            resp = requests.get(url, params=params, timeout=15)
            resp.raise_for_status()
            data = resp.json()
            
            if 'rates' not in data:
                logger.error(f"Unexpected historical rates response format: {data}")
                return []
                
            rates = data['rates']
            out = []
            for date_str in sorted(rates.keys()):
                day_rates = rates[date_str]
                rate = day_rates.get(to_currency)
                if rate is not None:
                    out.append({"date": date_str, "rate": float(rate)})
                    
            logger.info(f"Successfully retrieved {len(out)} historical rates")
            return out
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching historical rates: {str(e)}")
            return []
        except (ValueError, KeyError) as e:
            logger.error(f"Error parsing historical rates: {str(e)}")
            return []

    def get_forecast(self, from_currency: str, to_currency: str, days: int = 7):
        # Simple forward-fill with last known rate as a placeholder forecast
        history = self.get_historical_rates(from_currency, to_currency, days=7)
        
        # Get last rate from history or current rate as fallback
        if history and len(history) > 0:
            last_rate = history[-1]['rate']
        else:
            last_rate = self.get_rate(from_currency, to_currency)
        
        # Ensure we have a valid rate
        if last_rate is None:
            logger.error(f"Unable to get rate for forecast {from_currency}/{to_currency}")
            return []
        
        forecast = []
        for i in range(1, days + 1):
            forecast.append({
                'date': (datetime.utcnow().date() + timedelta(days=i)).isoformat(),
                'predicted_rate': float(last_rate),
                'confidence': 0.6
            })
        return forecast


fx_service = FXService()

