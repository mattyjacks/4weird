"""
cost_calculator.py - Accurate API Cost Calculator, Daily & Lifetime Budget Tracker,
and Gateway Preparation Engine for MediaMogul.
"""

import os
import json
import time
from datetime import datetime


class CostCalculator:
    """
    Tracks real-time API spend with accurate pricing models across OpenAI models,
    Whisper audio transcription, TTS audio synthesis, DALL-E 3 image generation,
    and local $0.00 FFmpeg operations.
    Maintains daily and lifetime budgets and prepares for custom API key gateway routing.
    """

    # Accurate pricing per unit (as of current OpenAI API pricing)
    RATES = {
        # LLM token pricing per 1M tokens: (input_rate_per_1M, output_rate_per_1M)
        "models": {
            "gpt-5.6-luna": {"input_per_m": 2.50, "output_per_m": 10.00},
            "gpt-4o": {"input_per_m": 2.50, "output_per_m": 10.00},
            "gpt-4o-mini": {"input_per_m": 0.15, "output_per_m": 0.60},
            "gpt-3.5-turbo": {"input_per_m": 0.50, "output_per_m": 1.50},
        },
        # Whisper STT: $0.006 per minute ($0.0001 per second)
        "whisper_per_minute": 0.006,
        # TTS: $0.015 per 1,000 characters for tts-1, $0.030 for tts-1-hd
        "tts_per_1k_chars": {
            "tts-1": 0.015,
            "tts-1-hd": 0.030
        },
        # DALL-E 3: Standard $0.040, HD $0.080
        "dalle3_per_image": {
            "1024x1024": 0.040,
            "1024x1792": 0.080,
            "1792x1024": 0.080,
            "standard": 0.040,
            "hd": 0.080
        }
    }

    def __init__(self, storage_path: str = None):
        if not storage_path:
            storage_path = os.path.join(os.path.expanduser("~"), ".mediamogul_budget.json")
        self.storage_path = storage_path
        self.data = {
            "daily_budget_limit": 5.00,       # $5.00 default daily budget limit
            "lifetime_budget_limit": 50.00,   # $50.00 default lifetime budget limit
            "daily_spend": {},                # YYYY-MM-DD -> {cost, tokens, audio_sec, tts_chars, images}
            "lifetime_spend": 0.0,
            "ledger": [],                     # Recent transaction records
            "custom_gateway": {
                "enabled": False,
                "url": "",                    # e.g. https://api.mediamogul.internal/v1/gateway
                "key": "",                    # Custom gateway bearer token / billing ID
                "billing_account_id": ""
            }
        }
        self.load()

    def load(self):
        """Loads persistent budget data from disk."""
        if os.path.exists(self.storage_path):
            try:
                with open(self.storage_path, "r", encoding="utf-8") as f:
                    saved = json.load(f)
                    self.data.update(saved)
            except Exception:
                pass

    def save(self):
        """Saves budget data safely to disk."""
        try:
            with open(self.storage_path, "w", encoding="utf-8") as f:
                json.dump(self.data, f, indent=2)
        except Exception:
            pass

    def _today_str(self) -> str:
        return datetime.now().strftime("%Y-%m-%d")

    def get_daily_spend(self, date_str: str = None) -> float:
        """Returns total spend for the specified date (default today)."""
        d = date_str or self._today_str()
        rec = self.data["daily_spend"].get(d, {})
        return float(rec.get("cost", 0.0))

    def get_lifetime_spend(self) -> float:
        """Returns total cumulative spend."""
        return float(self.data.get("lifetime_spend", 0.0))

    def get_daily_budget_limit(self) -> float:
        return float(self.data.get("daily_budget_limit", 5.00))

    def get_lifetime_budget_limit(self) -> float:
        return float(self.data.get("lifetime_budget_limit", 50.00))

    def set_budget_limits(self, daily: float, lifetime: float):
        """Updates daily and lifetime budget limits."""
        self.data["daily_budget_limit"] = max(0.0, float(daily))
        self.data["lifetime_budget_limit"] = max(0.0, float(lifetime))
        self.save()

    def set_gateway_config(self, enabled: bool, url: str, key: str, billing_id: str = ""):
        """Prepares and saves custom API key gateway configuration."""
        self.data["custom_gateway"] = {
            "enabled": bool(enabled),
            "url": str(url).strip(),
            "key": str(key).strip(),
            "billing_account_id": str(billing_id).strip()
        }
        self.save()

    def get_gateway_config(self) -> dict:
        return dict(self.data.get("custom_gateway", {}))

    # -------------------------------------------------------------------------
    # Accurate Cost Calculation Methods
    # -------------------------------------------------------------------------
    def calculate_llm_cost(self, model: str, prompt_tokens: int, completion_tokens: int) -> float:
        """Computes exact LLM completion cost based on token counts."""
        m_info = self.RATES["models"].get(model.lower(), self.RATES["models"]["gpt-5.6-luna"])
        in_cost = (prompt_tokens / 1_000_000.0) * m_info["input_per_m"]
        out_cost = (completion_tokens / 1_000_000.0) * m_info["output_per_m"]
        return round(in_cost + out_cost, 6)

    def calculate_whisper_cost(self, duration_seconds: float) -> float:
        """Whisper STT is $0.006 per minute ($0.0001 / second)."""
        minutes = max(0.0, float(duration_seconds)) / 60.0
        return round(minutes * self.RATES["whisper_per_minute"], 6)

    def calculate_tts_cost(self, char_count: int, model: str = "tts-1") -> float:
        """OpenAI TTS is $0.015 per 1,000 characters for tts-1."""
        rate = self.RATES["tts_per_1k_chars"].get(model.lower(), 0.015)
        return round((max(0, char_count) / 1000.0) * rate, 6)

    def calculate_dalle_cost(self, size: str = "1024x1024", quality: str = "standard") -> float:
        """DALL-E 3 image generation cost ($0.040 standard, $0.080 HD)."""
        if quality.lower() == "hd" or size in ("1024x1792", "1792x1024"):
            return self.RATES["dalle3_per_image"]["hd"]
        return self.RATES["dalle3_per_image"]["standard"]

    # -------------------------------------------------------------------------
    # Record and Ledger Accounting
    # -------------------------------------------------------------------------
    def record_transaction(self, service: str, cost: float, units: dict = None, details: str = ""):
        """
        Records an itemized spend transaction, updates daily spend and lifetime spend.
        """
        cost = max(0.0, float(cost))
        today = self._today_str()

        # Update daily breakdown
        if today not in self.data["daily_spend"]:
            self.data["daily_spend"][today] = {
                "cost": 0.0,
                "tokens": 0,
                "audio_seconds": 0.0,
                "tts_chars": 0,
                "dalle_images": 0
            }
        d_rec = self.data["daily_spend"][today]
        d_rec["cost"] = round(d_rec["cost"] + cost, 6)

        if units:
            d_rec["tokens"] += int(units.get("tokens", 0))
            d_rec["audio_seconds"] += float(units.get("audio_seconds", 0.0))
            d_rec["tts_chars"] += int(units.get("tts_chars", 0))
            d_rec["dalle_images"] += int(units.get("dalle_images", 0))

        # Update lifetime spend
        self.data["lifetime_spend"] = round(self.data.get("lifetime_spend", 0.0) + cost, 6)

        # Append to ledger (keep latest 100 entries)
        tx = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "service": service,
            "cost": cost,
            "units": units or {},
            "details": details
        }
        self.data["ledger"].append(tx)
        if len(self.data["ledger"]) > 100:
            self.data["ledger"] = self.data["ledger"][-100:]

        self.save()

    def check_budget_status(self) -> dict:
        """
        Returns budget status including warnings if daily or lifetime thresholds are reached.
        """
        d_spend = self.get_daily_spend()
        d_limit = self.get_daily_budget_limit()
        l_spend = self.get_lifetime_spend()
        l_limit = self.get_lifetime_budget_limit()

        d_pct = (d_spend / d_limit * 100.0) if d_limit > 0 else 0.0
        l_pct = (l_spend / l_limit * 100.0) if l_limit > 0 else 0.0

        is_daily_exceeded = d_spend >= d_limit
        is_lifetime_exceeded = l_spend >= l_limit
        warning = None

        if is_daily_exceeded:
            warning = f"⚠️ Daily Budget Exceeded: Spent ${d_spend:.4f} of ${d_limit:.2f} daily limit."
        elif d_pct >= 85.0:
            warning = f"⚠️ Daily Budget Warning: Spent ${d_spend:.4f} ({d_pct:.0f}%) of ${d_limit:.2f} limit."
        elif is_lifetime_exceeded:
            warning = f"⚠️ Lifetime Budget Exceeded: Spent ${l_spend:.4f} of ${l_limit:.2f} lifetime limit."

        return {
            "daily_spend": d_spend,
            "daily_limit": d_limit,
            "daily_percent": min(100.0, d_pct),
            "lifetime_spend": l_spend,
            "lifetime_limit": l_limit,
            "lifetime_percent": min(100.0, l_pct),
            "is_daily_exceeded": is_daily_exceeded,
            "is_lifetime_exceeded": is_lifetime_exceeded,
            "warning": warning
        }

    def reset_history(self):
        """Clears transaction ledger and spend counters."""
        self.data["daily_spend"] = {}
        self.data["lifetime_spend"] = 0.0
        self.data["ledger"] = []
        self.save()


# Singleton shared instance
_global_calculator = None

def get_cost_calculator() -> CostCalculator:
    global _global_calculator
    if _global_calculator is None:
        _global_calculator = CostCalculator()
    return _global_calculator
