"""Stripe payments service (test mode) for providers and execution."""

import os
import stripe
from typing import Dict


class PaymentsService:
    def __init__(self):
        api_key = os.getenv('STRIPE_API_KEY')
        if api_key:
            stripe.api_key = api_key
        self.currency_default = os.getenv('PAYMENT_BASE_CURRENCY', 'USD')

    def list_providers(self, amount: float, from_currency: str, to_currency: str, rate: float) -> Dict:
        # For now, expose Stripe as the provider. Fees estimated: 2.9% + $0.30
        estimated_fee = round(amount * 0.029 + 0.30, 2)
        recipient_amount = round((amount - estimated_fee) * rate, 2)
        return {
            'providers': [
                {
                    'provider': 'Stripe (Test)',
                    'exchange_rate': rate,
                    'fee': estimated_fee,
                    'delivery_time': 'Instant',
                    'rating': 4.7,
                    'features': ['Card', 'Apple Pay', 'Google Pay'],
                }
            ],
            'recipient_amount': recipient_amount,
        }

    def create_test_payment(self, amount: float, currency: str, description: str, metadata: Dict) -> Dict:
        # Convert amount to minor units
        cents = int(round(amount * 100))
        intent = stripe.PaymentIntent.create(
            amount=cents,
            currency=currency.lower(),
            description=description,
            metadata=metadata,
            automatic_payment_methods={"enabled": True},
            confirm=True,
            payment_method="pm_card_visa",
        )
        return intent.to_dict()

    def get_status(self, payment_intent_id: str) -> Dict:
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        return intent.to_dict()


payments_service = PaymentsService()

