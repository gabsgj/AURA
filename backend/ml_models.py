"""Lightweight ML models stub for fraud detection used by legacy routes."""

class FraudDetector:
    def predict_fraud_score(self, transaction: dict, user: dict) -> float:
        amount = float(transaction.get('amount', 0))
        # Simple heuristic: higher amount -> higher score
        return max(0.05, min(0.95, amount / 10000.0))

    def is_fraud(self, transaction: dict, user: dict):
        score = self.predict_fraud_score(transaction, user)
        return (score > 0.85, score)


fraud_detector = FraudDetector()

