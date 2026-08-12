"""
LLM Service Router
- Tries NVIDIA NIM first (primary)
- Falls back to Groq if NIM fails or is unavailable
- Falls back to a structured auto-explanation if both fail
"""
import logging
from app.services.llm.base import LLMProvider
from app.services.llm.groq import GroqProvider
from app.services.llm.nvidia_nim import NVIDIANIMProvider
from typing import Dict, Any

logger = logging.getLogger(__name__)


class LLMService:
    def __init__(self):
        self.providers: list[tuple[str, LLMProvider]] = []
        self._init_providers()

    def _init_providers(self):
        # Try NIM first (primary)
        try:
            nim = NVIDIANIMProvider()
            self.providers.append(("nvidia_nim", nim))
            logger.info("NVIDIA NIM provider initialized")
        except Exception as e:
            logger.warning(f"NVIDIA NIM not available: {e}")

        # Groq as fallback
        try:
            groq = GroqProvider()
            self.providers.append(("groq", groq))
            logger.info("Groq provider initialized")
        except Exception as e:
            logger.warning(f"Groq not available: {e}")

        if not self.providers:
            logger.warning("No LLM providers available — will use auto-explanation fallback")

    async def explain(self, pattern_data: Dict[str, Any]) -> tuple[str, str]:
        """
        Returns (explanation_text, provider_used).
        Tries each provider in order; falls back to structured auto-explanation.
        """
        for name, provider in self.providers:
            try:
                logger.info(f"Requesting explanation from {name} ...")
                text = await provider.explain(pattern_data)
                logger.info(f"Got explanation from {name}")
                return text, name
            except Exception as e:
                logger.warning(f"{name} failed: {e}")
                continue

        # Auto-fallback explanation
        fallback = _auto_explain(pattern_data)
        return fallback, "auto"


def _auto_explain(pattern_data: Dict[str, Any]) -> str:
    """Structured rule-based explanation when no LLM is available."""
    name = pattern_data.get("pattern", "unknown").replace("_", " ").title()
    n = pattern_data.get("affected_sessions", 0)
    sim = pattern_data.get("similarity", 0)
    sim_pct = f"{sim:.0%}" if isinstance(sim, float) else str(sim)
    tools = ", ".join(pattern_data.get("tools", [])) or "multiple tools"
    risk = pattern_data.get("risk", "UNKNOWN")

    return (
        f"{n} agent sessions exhibited {sim_pct} behavioral similarity, "
        f"consistently using {tools} in the same action sequence pattern. "
        f"This cross-session repetition is characteristic of coordinated {name} "
        f"behavior rather than coincidental usage. "
        f"Risk assessed as {risk} based on frequency, tool sensitivity, and cluster cohesion."
    )


# Singleton
_llm_service: LLMService | None = None


def get_llm_service() -> LLMService:
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service


async def generate_pattern_explanation(pattern_data: Dict[str, Any]) -> str:
    """Convenience wrapper — returns just the explanation text."""
    service = get_llm_service()
    text, provider = await service.explain(pattern_data)
    return text