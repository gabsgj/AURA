"""
Minimal database models for AURA AI-powered payments platform
"""
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import uuid

db = SQLAlchemy()

class User(db.Model):
    """User model for authentication"""
    __tablename__ = 'users'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    phone = db.Column(db.String(20))
    country = db.Column(db.String(3))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'phone': self.phone,
            'country': self.country,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Wallet(db.Model):
    __tablename__ = 'wallets'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    currency = db.Column(db.String(3), nullable=False)
    balance = db.Column(db.Numeric(15, 2), default=0.00)
    status = db.Column(db.String(20), default='active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (db.UniqueConstraint('user_id', 'currency'),)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'currency': self.currency,
            'balance': float(self.balance),
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Transaction(db.Model):
    __tablename__ = 'transactions'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    amount = db.Column(db.Numeric(15, 2), nullable=False)
    from_currency = db.Column(db.String(3), nullable=False)
    to_currency = db.Column(db.String(3), nullable=False)
    exchange_rate = db.Column(db.Numeric(10, 6))
    fee = db.Column(db.Numeric(10, 2))
    total_cost = db.Column(db.Numeric(15, 2))
    provider = db.Column(db.String(50))
    recipient = db.Column(db.String(255))
    status = db.Column(db.String(20), default='initiated')
    provider_reference = db.Column(db.String(255))
    completed_at = db.Column(db.DateTime)
    failure_reason = db.Column(db.Text)
    notes = db.Column(db.Text)
    fraud_score = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'amount': float(self.amount),
            'from_currency': self.from_currency,
            'to_currency': self.to_currency,
            'exchange_rate': float(self.exchange_rate) if self.exchange_rate else None,
            'fee': float(self.fee) if self.fee else None,
            'total_cost': float(self.total_cost) if self.total_cost else None,
            'provider': self.provider,
            'recipient': self.recipient,
            'status': self.status,
            'provider_reference': self.provider_reference,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'failure_reason': self.failure_reason,
            'notes': self.notes,
            'fraud_score': self.fraud_score,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class FraudLog(db.Model):
    __tablename__ = 'fraud_logs'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    transaction_id = db.Column(db.String(36), db.ForeignKey('transactions.id'))
    event_type = db.Column(db.String(50), nullable=False)
    event_data = db.Column(db.JSON)
    risk_score = db.Column(db.Float)
    is_fraud = db.Column(db.Boolean)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'transaction_id': self.transaction_id,
            'event_type': self.event_type,
            'event_data': self.event_data,
            'risk_score': self.risk_score,
            'is_fraud': self.is_fraud,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class FXRate(db.Model):
    __tablename__ = 'fx_rates'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    from_currency = db.Column(db.String(3), nullable=False)
    to_currency = db.Column(db.String(3), nullable=False)
    rate = db.Column(db.Numeric(10, 6), nullable=False)
    source = db.Column(db.String(50), default='exchangerate.host')
    created_at = db.Column(db.DateTime, default=lambda: datetime.utcnow().replace(microsecond=0))
    
    __table_args__ = (db.UniqueConstraint('from_currency', 'to_currency', 'created_at'),)
    
    def to_dict(self):
        return {
            'id': self.id,
            'from_currency': self.from_currency,
            'to_currency': self.to_currency,
            'rate': float(self.rate),
            'source': self.source,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }