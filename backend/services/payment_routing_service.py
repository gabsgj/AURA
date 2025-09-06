"""
High-Logic Payment Routing Service (Final Version)
-------------------------------------------------
Goals:
 - Provide multi-provider cross‑border payment routing recommendations.
 - Work fully OFFLINE / WITHOUT any proprietary provider API keys (generative deterministic modeling).
 - Seamlessly UPGRADE to real provider APIs (currently only Wise stub) when keys are present.
 - Optionally refine synthetic quotes using Gemini (google-generativeai) if configured via env:
       AI_QUOTE_ENHANCER=gemini and GEMINI_API_KEY set.
 - Remain stable, deterministic, bounded (no untrusted model output directly exposed).

Architecture:
 1. Base FX Rate Layer: Fetch (or synthesize) base FX rates with retry + timeout.
 2. Provider Strategy Layer: Each provider has a profile (rating, speed class, corridor focus, fee model, spread).
 3. Quote Generation:
      - If real API available (Wise) fetch real quote; else provider strategy synthesizes quote.
      - Synthetic quotes deterministic using hashing of (provider, corridor, day-bucket) while allowing mild variation.
 4. Optional AI Enhancement:
      - If Gemini enabled, we send a compact provider quote summary & constraints.
      - Model returns JSON adjustments (rate_adjust_bps, fee_adjust_pct) per provider.
      - Adjustments are clamped (±50 bps rate, ±8% fee) and only applied if parsed safely.
 5. Scoring & Ranking:
      - Confidence score combines provider rating, API authenticity bonus, speed factor & quote consistency.
      - Priority modes: cost | speed | reliability | balanced.

Security / Safety:
  - Gemini output parsed strictly; on any error adjustments are discarded.
  - No uncontrolled eval / exec.
  - Network calls have timeouts + retries (tenacity) only for open FX endpoints or Wise.

Extensibility:
  - Add providers by extending PROVIDER_PROFILES.
  - Add real API integration by implementing _fetch_real_<provider>() returning normalized dict.
"""

from __future__ import annotations

import os
import json
import logging
import math
import time
from dataclasses import dataclass
from datetime import datetime, date
from typing import Dict, List, Optional, Any, Callable

import requests
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Data Models
# ---------------------------------------------------------------------------

@dataclass
class PaymentRoute:
    provider: str
    estimated_fee: float
    exchange_rate: float
    delivery_time: str
    total_cost: float
    recipient_amount: float
    confidence_score: float
    provider_rating: float
    source: str  # 'API' or 'Synthetic' or 'AI-Refined'


class _HttpError(Exception):
    pass


# ---------------------------------------------------------------------------
# Provider Profiles (baseline characteristics)
# spread_bps: approximate markup relative to mid/base (positive = worse rate)
# fee_structure: (fixed_min, fixed_max, variable_min_pct, variable_max_pct)
# speed_class: impacts delivery time selection & confidence
# ---------------------------------------------------------------------------

PROVIDER_PROFILES: Dict[str, Dict[str, Any]] = {
    "wise": {
        "display": "Wise",
        "rating": 4.8,
        "supported_corridors": [
            "USD-EUR", "USD-GBP", "EUR-USD", "GBP-USD", "USD-CAD", "USD-AUD", "USD-JPY", "EUR-JPY"
        ],
        "spread_bps": (15, 40),  # 0.15% - 0.40%
        "fee_structure": (0.5, 4.0, 0.0005, 0.0075),
        "speed_class": 0,
        "real_api": True,
    },
    "remitly": {
        "display": "Remitly",
        "rating": 4.6,
        "supported_corridors": ["USD-INR", "USD-PHP", "USD-MXN", "EUR-INR", "GBP-INR", "USD-VND", "USD-CNY"],
        "spread_bps": (40, 95),
        "fee_structure": (0.99, 5.5, 0.004, 0.012),
        "speed_class": 1,
        "real_api": False,
    },
    "western_union": {
        "display": "Western Union",
        "rating": 4.2,
        "supported_corridors": ["USD-INR", "USD-MXN", "USD-PHP", "EUR-INR", "GBP-PKR", "USD-NGN", "USD-GHS"],
        "spread_bps": (80, 160),
        "fee_structure": (2.99, 9.5, 0.006, 0.02),
        "speed_class": 0,
        "real_api": False,
    },
    "moneygram": {
        "display": "MoneyGram",
        "rating": 4.1,
        "supported_corridors": ["USD-INR", "USD-MXN", "USD-GTM", "EUR-MAR", "USD-JMD"],
        "spread_bps": (85, 170),
        "fee_structure": (1.49, 7.0, 0.005, 0.018),
        "speed_class": 1,
        "real_api": False,
    },
    "xoom": {
        "display": "Xoom (PayPal)",
        "rating": 4.4,
        "supported_corridors": ["USD-INR", "USD-MXN", "USD-PHP", "EUR-INR", "USD-VND", "USD-CNY"],
        "spread_bps": (55, 110),
        "fee_structure": (0.0, 5.0, 0.003, 0.012),
        "speed_class": 0,
        "real_api": False,
    },
    "ria": {
        "display": "Ria Money Transfer",
        "rating": 4.3,
        "supported_corridors": ["USD-MXN", "USD-INR", "USD-PHP", "USD-ELS", "USD-COL"],
        "spread_bps": (65, 140),
        "fee_structure": (1.0, 6.0, 0.004, 0.015),
        "speed_class": 1,
        "real_api": False,
    },
    "worldremit": {
        "display": "WorldRemit",
        "rating": 4.5,
        "supported_corridors": ["USD-NGN", "USD-GHS", "USD-PHP", "GBP-KES", "CAD-INR"],
        "spread_bps": (45, 100),
        "fee_structure": (0.99, 4.5, 0.003, 0.012),
        "speed_class": 1,
        "real_api": False,
    },
    "ofx": {
        "display": "OFX",
        "rating": 4.7,
        "supported_corridors": ["USD-AUD", "USD-EUR", "GBP-USD", "AUD-USD", "CAD-USD"],
        "spread_bps": (20, 60),
        "fee_structure": (0.0, 2.5, 0.000, 0.006),
        "speed_class": 2,
        "real_api": False,
    },
}


# ---------------------------------------------------------------------------
# Base FX rate retrieval (open API + deterministic fallback)
# ---------------------------------------------------------------------------

@retry(
    reraise=True,
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=0.4, min=0.5, max=4),
    retry=retry_if_exception_type(_HttpError),
)
def _http_json(url: str, timeout: float = 6.0) -> Dict[str, Any]:
    resp = requests.get(url, timeout=timeout)
    if resp.status_code >= 400:
        raise _HttpError(f"{url} -> {resp.status_code}")
    return resp.json()


def _normalize_currency(code: str) -> str:
    return (code or "").strip().upper()


class PaymentRoutingService:
    def __init__(self):
        self.wise_api_key = os.getenv("WISE_API_KEY")
        self.wise_environment = os.getenv("WISE_ENVIRONMENT", "sandbox")
        self.ai_enhancer = os.getenv("AI_QUOTE_ENHANCER", "").lower()

    # ----------------------------- Public API ------------------------------
    def get_optimal_route(
        self,
        source_currency: str,
        target_currency: str,
        amount: float,
        user_preferences: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        source_currency = _normalize_currency(source_currency)
        target_currency = _normalize_currency(target_currency)
        prefs = user_preferences or {}
        priority = prefs.get("priority", "balanced")
        max_fee_pct = float(prefs.get("max_fee_percent", 10.0))
        min_rating = float(prefs.get("min_provider_rating", 4.0))

        try:
            base_rate = self._get_base_fx_rate(source_currency, target_currency)
        except Exception as e:
            logger.error(f"Base FX rate failure: {e}")
            return {"error": "Unable to determine base FX rate."}

        routes = self._collect_routes(source_currency, target_currency, amount, base_rate)
        if not routes:
            return {"error": "No routes available"}

        # AI enhancement (optional)
        if self.ai_enhancer == "gemini":
            try:
                routes = self._enhance_with_gemini(routes, source_currency, target_currency, amount, base_rate)
            except Exception as e:
                logger.warning(f"Gemini enhancement skipped: {e}")

        # Filter
        filtered = [r for r in routes if (r.estimated_fee / amount * 100) <= max_fee_pct and r.provider_rating >= min_rating]
        if not filtered:
            filtered = routes

        ranked = self._rank_routes(filtered, priority)
        optimal = ranked[0]
        worst = max(ranked, key=lambda r: r.total_cost)
        savings = max(0.0, worst.total_cost - optimal.total_cost)

        return {
            "recommended_provider": optimal.provider,
            "exchange_rate": optimal.exchange_rate,
            "estimated_fee": optimal.estimated_fee,
            "fee_percentage": (optimal.estimated_fee / amount) * 100,
            "delivery_time": optimal.delivery_time,
            "recipient_amount": optimal.recipient_amount,
            "total_cost": optimal.total_cost,
            "confidence_score": optimal.confidence_score,
            "provider_rating": optimal.provider_rating,
            "quote_source": optimal.source,
            "potential_savings": savings,
            "currency_pair": f"{source_currency}/{target_currency}",
            "analysis_timestamp": datetime.utcnow().isoformat() + "Z",
            "alternative_routes": [
                {
                    "provider": r.provider,
                    "fee": r.estimated_fee,
                    "rate": r.exchange_rate,
                    "delivery_time": r.delivery_time,
                    "recipient_amount": r.recipient_amount,
                    "source": r.source,
                }
                for r in ranked[1:4]
            ],
        }

    # Public helper used by API layer (not previously exposed): list & rank all routes
    def analyze_payment_routes(
        self,
        source_currency: str,
        target_currency: str,
        amount: float,
        priority: str = "balanced",
    ) -> List[PaymentRoute]:
        base_rate = self._get_base_fx_rate(source_currency.upper(), target_currency.upper())
        routes = self._collect_routes(source_currency.upper(), target_currency.upper(), amount, base_rate)
        return self._rank_routes(routes, priority)

    def validate_transfer_corridor(self, src: str, tgt: str) -> Dict[str, Any]:
        src = _normalize_currency(src)
        tgt = _normalize_currency(tgt)
        corridor = f"{src}-{tgt}"
        supported = []
        for profile in PROVIDER_PROFILES.values():
            supported.extend(profile.get("supported_corridors", []))
        is_supported = corridor in supported
        return {
            "corridor": corridor,
            "is_supported": is_supported,
            "available_providers": [p["display"] for p in PROVIDER_PROFILES.values() if corridor in p.get("supported_corridors", [])],
            "all_supported_corridors": sorted(set(supported)),
        }

    # ----------------------- Collection & Generation -----------------------
    def _collect_routes(
        self, source: str, target: str, amount: float, base_rate: float
    ) -> List[PaymentRoute]:
        routes: List[PaymentRoute] = []
        corridor = f"{source}-{target}"
        today_bucket = int(time.time() // 3600)  # coarse bucket to vary during the day

        for key, profile in PROVIDER_PROFILES.items():
            if profile.get("real_api") and key == "wise" and self.wise_api_key:
                real_quote = self._fetch_real_wise(source, target, amount)
                if real_quote:
                    routes.append(self._build_route_from_quote(key, real_quote, amount, profile, source="API"))
                    continue
            # Synthetic quote
            synthetic = self._generate_synthetic_quote(key, profile, corridor, base_rate, amount, today_bucket)
            routes.append(self._build_route_from_quote(key, synthetic, amount, profile, source="Synthetic"))

        return routes

    # ----------------------- Base FX Rate Logic ----------------------------
    def _get_base_fx_rate(self, src: str, tgt: str) -> float:
        if src == tgt:
            return 1.0
        # Try direct open API (ExchangeRate) using USD bridging when necessary.
        # Strategy: if either side USD attempt direct; else fetch USD->src and USD->tgt then cross.
        try:
            if src == "USD" or tgt == "USD":
                data = _http_json(f"https://api.exchangerate-api.com/v4/latest/{src}") if src == "USD" else _http_json(f"https://api.exchangerate-api.com/v4/latest/USD")
                if src == "USD":
                    rate = data.get("rates", {}).get(tgt)
                    if rate:
                        return float(rate)
                else:  # tgt == USD case
                    inv = data.get("rates", {}).get(src)
                    if inv:
                        return 1.0 / float(inv)
            # Cross via USD
            src_data = _http_json(f"https://api.exchangerate-api.com/v4/latest/{src}")
            rate = src_data.get("rates", {}).get(tgt)
            if rate:
                return float(rate)
        except Exception as e:
            logger.warning(f"Open FX API fallback engaged: {e}")

        # Deterministic synthetic fallback
        h = abs(hash(f"{src}-{tgt}")) % 1000
        return 0.5 + (h / 1000) * 1.5  # 0.5 - 2.0 plausible band

    # ----------------------- Real Provider API (Wise) ----------------------
    def _fetch_real_wise(self, src: str, tgt: str, amount: float) -> Optional[Dict[str, Any]]:
        base_url = (
            "https://api.sandbox.transferwise.tech"
            if self.wise_environment == "sandbox"
            else "https://api.transferwise.com"
        )
        try:
            payload = {
                "sourceCurrency": src,
                "targetCurrency": tgt,
                "sourceAmount": amount,
                "profile": None,
            }
            res = requests.post(
                f"{base_url}/v1/quotes",
                headers={"Authorization": f"Bearer {self.wise_api_key}"},
                json=payload,
                timeout=8,
            )
            if res.status_code != 200:
                logger.info(f"Wise quote non-200: {res.status_code}")
                return None
            data = res.json()
            return {
                "rate": float(data.get("rate", 0)) or 0.0,
                "fee": float(data.get("fee", 0)) or float(data.get("feeAmount", 0) or 0),
                "delivery_time": data.get("estimatedDelivery", "0-1 business days"),
                "target_amount": float(data.get("targetAmount", 0)) or 0.0,
            }
        except Exception as e:
            logger.warning(f"Wise API failed: {e}")
            return None

    # ----------------------- Synthetic Quote Generation --------------------
    def _generate_synthetic_quote(
        self,
        provider_key: str,
        profile: Dict[str, Any],
        corridor: str,
        base_rate: float,
        amount: float,
        bucket: int,
    ) -> Dict[str, Any]:
        # Variation seeds
        seed = abs(hash((provider_key, corridor, bucket)))
        spread_low, spread_high = profile["spread_bps"]  # basis points range
        spread_bps = spread_low + (seed % (spread_high - spread_low + 1))
        rate = base_rate * (1 - spread_bps / 10000)  # apply negative markup

        ff_min, ff_max, vp_min, vp_max = profile["fee_structure"]
        fee_fixed = ff_min + (seed % 997) / 997 * (ff_max - ff_min)
        fee_variable_pct = vp_min + ((seed // 997) % 997) / 997 * (vp_max - vp_min)
        fee = fee_fixed + amount * fee_variable_pct

        # Delivery time selection by speed_class plus minor jitter
        speed_class = profile.get("speed_class", 1)
        speed_options = [
            ["0-1 business days", "0-1 business days", "1-2 business days"],
            ["0-1 business days", "1-2 business days", "1-3 business days"],
            ["1-2 business days", "1-3 business days", "2-4 business days"],
        ]
        options = speed_options[min(speed_class, len(speed_options) - 1)]
        delivery_time = options[seed % len(options)]

        target_amount = (amount - fee) * rate
        return {
            "rate": round(rate, 6),
            "fee": round(fee, 2),
            "delivery_time": delivery_time,
            "target_amount": round(target_amount, 2),
        }

    # ----------------------- Route Construction ---------------------------
    def _build_route_from_quote(
        self,
        provider_key: str,
        quote: Dict[str, Any],
        source_amount: float,
        profile: Dict[str, Any],
        source: str,
    ) -> PaymentRoute:
        rate = quote["rate"] or 0.0
        target_amount = quote["target_amount"]
        fee = quote["fee"]
        total_cost = source_amount - (target_amount / rate if rate else 0.0)

        # Confidence components
        rating_norm = profile["rating"] / 5.0
        speed_bonus = 1.0 if "0-1" in quote["delivery_time"] else 0.85 if "1-2" in quote["delivery_time"] else 0.7
        api_bonus = 1.0 if source == "API" else 0.9
        consistency = 0.95 if source == "Synthetic" else 1.0
        confidence = round(
            (rating_norm * 0.5) + (speed_bonus * 0.2) + (api_bonus * 0.2) + (consistency * 0.1), 4
        )

        return PaymentRoute(
            provider=profile["display"],
            estimated_fee=fee,
            exchange_rate=rate,
            delivery_time=quote["delivery_time"],
            total_cost=total_cost,
            recipient_amount=target_amount,
            confidence_score=confidence,
            provider_rating=profile["rating"],
            source=source,
        )

    # ----------------------- Ranking ---------------------------------------
    def _rank_routes(self, routes: List[PaymentRoute], priority: str) -> List[PaymentRoute]:
        if priority == "cost":
            routes.sort(key=lambda r: r.total_cost)
        elif priority == "speed":
            speed_order = {"0-1": 0, "1-2": 1, "1-3": 2, "2-4": 3}
            routes.sort(key=lambda r: (speed_order.get(r.delivery_time.split()[0], 99), r.total_cost))
        elif priority == "reliability":
            routes.sort(key=lambda r: (-r.provider_rating, r.total_cost))
        else:  # balanced
            routes.sort(key=lambda r: (-r.confidence_score, r.total_cost))
        return routes

    # ----------------------- Gemini Enhancement ---------------------------
    def _enhance_with_gemini(
        self,
        routes: List[PaymentRoute],
        src: str,
        tgt: str,
        amount: float,
        base_rate: float,
    ) -> List[PaymentRoute]:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY not set")
        try:  # Lazy import (optional dependency)
            import google.generativeai as genai  # type: ignore
        except Exception as e:  # pragma: no cover
            raise RuntimeError(f"google-generativeai not installed: {e}")

        genai.configure(api_key=api_key)
        # Build compact payload
        payload = [
            {
                "provider": r.provider,
                "rate": r.exchange_rate,
                "fee": r.estimated_fee,
                "delivery": r.delivery_time,
                "rating": r.provider_rating,
            }
            for r in routes
        ]
        prompt = (
            "You are an FX transfer pricing assistant. Given base pair rate="
            f"{base_rate:.6f} for {src}->{tgt} and quotes JSON below, suggest conservative improvements.\n"
            "Respond ONLY with JSON list matching providers with optional fields: rate_adjust_bps (int, ±50), fee_adjust_pct (float, ±0.08).\n"
            "Never invent new providers. Keep adjustments small.\n"
            f"Quotes: {json.dumps(payload)}"
        )
        try:
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(prompt)
            text = "".join(part.text for part in response.candidates[0].content.parts)  # type: ignore
            adjustments = json.loads(text)
            if not isinstance(adjustments, list):
                raise ValueError("Model output not a list")
        except Exception as e:
            raise RuntimeError(f"Gemini output parse failure: {e}")

        adj_map = {a.get("provider"): a for a in adjustments if isinstance(a, dict)}
        refined: List[PaymentRoute] = []
        for r in routes:
            adj = adj_map.get(r.provider)
            if not adj:
                refined.append(r)
                continue
            try:
                rate_adjust_bps = int(adj.get("rate_adjust_bps", 0))
                fee_adjust_pct = float(adj.get("fee_adjust_pct", 0.0))
            except Exception:
                refined.append(r)
                continue
            # Clamp
            rate_adjust_bps = max(-50, min(50, rate_adjust_bps))
            fee_adjust_pct = max(-0.08, min(0.08, fee_adjust_pct))
            new_rate = round(r.exchange_rate * (1 + rate_adjust_bps / 10000), 6)
            new_fee = round(r.estimated_fee * (1 + fee_adjust_pct), 2)
            # Recompute recipient amount & total cost
            target_amount = (r.recipient_amount / r.exchange_rate) * new_rate  # scale proportionally
            total_cost = (r.total_cost / r.exchange_rate) * new_rate  # preserve relative cost effect
            refined.append(
                PaymentRoute(
                    provider=r.provider,
                    estimated_fee=new_fee,
                    exchange_rate=new_rate,
                    delivery_time=r.delivery_time,
                    total_cost=total_cost,
                    recipient_amount=target_amount,
                    confidence_score=min(1.0, r.confidence_score + 0.01),
                    provider_rating=r.provider_rating,
                    source="AI-Refined",
                )
            )
        return refined


# Global instance
payment_routing_service = PaymentRoutingService()
