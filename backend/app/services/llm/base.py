from abc import ABC, abstractmethod
from typing import Dict, Any


class LLMProvider(ABC):
    @abstractmethod
    async def explain(self, pattern_data: Dict[str, Any]) -> str:
        pass