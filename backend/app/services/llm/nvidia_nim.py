import os
import httpx
from dotenv import load_dotenv
from app.services.llm.base import LLMProvider
from app.config import settings
from typing import Dict, Any

load_dotenv()  # ensure .env is loaded


class NVIDIANIMProvider(LLMProvider):
    def __init__(self):
        api_key = settings.nvidia_nim_api_key or os.getenv("NVIDIA_NIM_API_KEY")
        if not api_key:
            raise ValueError("NVIDIA_NIM_API_KEY not set")
        self.api_key = api_key
        self.base_url = "https://integrate.api.nvidia.com/v1"
        self.model = "meta/llama-3.1-8b-instruct"

    async def explain(self, pattern_data: Dict[str, Any]) -> str:
        prompt = self._build_prompt(pattern_data)
        system_msg = (
            "You are a senior AI security analyst. "
            "Explain detected adversarial patterns in AI agent behavior clearly and concisely "
            "for a security operations dashboard. Be specific about the threat."
        )

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": system_msg},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.3,
                    "max_tokens": 300,
                },
            )

            if response.status_code != 200:
                raise Exception(f"NVIDIA NIM API error {response.status_code}: {response.text[:300]}")

            data = response.json()
            return data["choices"][0]["message"]["content"].strip()

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