import os
import asyncio
from dotenv import load_dotenv
from groq import Groq
from app.services.llm.base import LLMProvider
from app.config import settings
from typing import Dict, Any

load_dotenv()  # ensure .env is loaded


class GroqProvider(LLMProvider):
    def __init__(self):
        api_key = settings.groq_api_key or os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY not set")
        self.client = Groq(api_key=api_key)
        self.model = "llama3-8b-8192"

    async def explain(self, pattern_data: Dict[str, Any]) -> str:
        """
        Groq SDK is synchronous — run in a thread pool so we don't block
        FastAPI's async event loop.
        """
        prompt = self._build_prompt(pattern_data)
        system_msg = (
            "You are a senior AI security analyst. "
            "Explain detected adversarial patterns in AI agent behavior clearly and concisely "
            "for a security operations dashboard. Be specific about the threat."
        )

        def _call():
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_msg},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=300,
            )
            return response.choices[0].message.content.strip()

        return await asyncio.to_thread(_call)

    def _build_prompt(self, pattern_data: Dict[str, Any]) -> str:
        tools = ", ".join(pattern_data.get("tools", [])) or "unknown"
        resources = ", ".join(pattern_data.get("resources", [])) or "unknown"
        similarity = pattern_data.get("similarity", 0)
        sim_pct = f"{similarity:.0%}" if isinstance(similarity, float) else str(similarity)

        return f"""
Adversarial Pattern Detected Across Multiple AI Agent Sessions:

Pattern Name:        {pattern_data['pattern']}
Affected Sessions:   {pattern_data['affected_sessions']}
Cross-Session Similarity: {sim_pct}
Common Tools Used:   {tools}
Actions Performed:   {resources}
Risk Level:          {pattern_data['risk']}

In 2-3 sentences, explain what this cross-session pattern indicates about coordinated or progressive adversarial behavior. Focus on the attack intent and why repeated similarity across sessions is suspicious.
""".strip()