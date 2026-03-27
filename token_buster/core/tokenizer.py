"""
Token Buster - Tokenizer Core
Author: Muhammad Faizan | github.com/faizzyhon | instagram.com/faizzyhon
"""

import re
from typing import Optional

try:
    import tiktoken
    TIKTOKEN_AVAILABLE = True
except ImportError:
    TIKTOKEN_AVAILABLE = False

try:
    from transformers import AutoTokenizer
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False


class TokenizerEngine:
    """
    Multi-backend tokenizer supporting tiktoken (OpenAI/Claude-compatible)
    and HuggingFace transformers.
    """

    def __init__(self, backend: str = "tiktoken", model: str = "cl100k_base"):
        self.backend = backend
        self.model = model
        self._tokenizer = None
        self._init_tokenizer()

    def _init_tokenizer(self):
        if self.backend == "tiktoken" and TIKTOKEN_AVAILABLE:
            try:
                self._tokenizer = tiktoken.get_encoding(self.model)
            except Exception:
                try:
                    self._tokenizer = tiktoken.get_encoding("cl100k_base")
                except Exception:
                    self._tokenizer = None  # fall through to fallback
        elif self.backend == "huggingface" and TRANSFORMERS_AVAILABLE:
            try:
                self._tokenizer = AutoTokenizer.from_pretrained(self.model)
            except Exception:
                self._tokenizer = None
        # Fallback: word-split estimator
        if self._tokenizer is None:
            self.backend = "fallback"

    def count_tokens(self, text: str) -> int:
        """Count tokens for a given text string."""
        if not text:
            return 0

        if self.backend == "tiktoken" and self._tokenizer:
            return len(self._tokenizer.encode(text))
        elif self.backend == "huggingface" and self._tokenizer:
            return len(self._tokenizer.encode(text, add_special_tokens=False))
        else:
            # Fallback: rough word/punctuation estimate (~1.3 tokens per word)
            words = re.findall(r"\w+|[^\w\s]", text)
            return int(len(words) * 1.3)

    def estimate_cost(self, token_count: int, model: str = "claude-3-5-sonnet") -> dict:
        """
        Estimate cost based on token count and model pricing.
        Prices per 1M tokens (USD) — approximate 2025 rates.
        """
        pricing = {
            "claude-3-5-sonnet":  {"input": 3.00,  "output": 15.00},
            "claude-3-opus":      {"input": 15.00, "output": 75.00},
            "claude-3-haiku":     {"input": 0.25,  "output": 1.25},
            "gpt-4o":             {"input": 5.00,  "output": 15.00},
            "gpt-4-turbo":        {"input": 10.00, "output": 30.00},
            "gpt-3.5-turbo":      {"input": 0.50,  "output": 1.50},
        }
        rates = pricing.get(model, pricing["claude-3-5-sonnet"])
        input_cost = (token_count / 1_000_000) * rates["input"]
        return {
            "tokens": token_count,
            "model": model,
            "input_cost_usd": round(input_cost, 6),
            "output_cost_usd": round((token_count / 1_000_000) * rates["output"], 6),
        }

    def diff_tokens(self, old_text: str, new_text: str) -> dict:
        """Compare token counts between two text versions."""
        old_count = self.count_tokens(old_text)
        new_count = self.count_tokens(new_text)
        saved = old_count - new_count
        ratio = round(old_count / new_count, 2) if new_count > 0 else 0
        return {
            "old_tokens": old_count,
            "new_tokens": new_count,
            "tokens_saved": saved,
            "reduction_ratio": ratio,
            "reduction_pct": round((saved / old_count) * 100, 1) if old_count > 0 else 0,
        }

    def summarize_for_context(self, text: str, max_tokens: int = 500) -> str:
        """
        Truncate or trim text to fit within max_tokens for context injection.
        """
        if self.count_tokens(text) <= max_tokens:
            return text

        # Binary search for the right cutoff
        lo, hi = 0, len(text)
        while lo < hi - 1:
            mid = (lo + hi) // 2
            if self.count_tokens(text[:mid]) <= max_tokens:
                lo = mid
            else:
                hi = mid

        return text[:lo] + "\n... [truncated by Token Buster]"


# Singleton
_engine: Optional[TokenizerEngine] = None


def get_engine(backend: str = "tiktoken") -> TokenizerEngine:
    global _engine
    if _engine is None:
        _engine = TokenizerEngine(backend=backend)
    return _engine
