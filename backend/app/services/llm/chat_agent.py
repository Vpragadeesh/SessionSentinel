import json
import os
import httpx
import asyncio
from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.models import Session, Event, Agent
import logging

logger = logging.getLogger(__name__)

# Tools the agent has access to
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_customer",
            "description": "Search for a customer profile by name to get their ID.",
            "parameters": {
                "type": "object",
                "properties": {"name": {"type": "string", "description": "Customer name"}},
                "required": ["name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_customer_email",
            "description": "Get a customer's email address using their ID.",
            "parameters": {
                "type": "object",
                "properties": {"customer_id": {"type": "string"}},
                "required": ["customer_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_password_reset_link",
            "description": "Generate a password reset link for a customer.",
            "parameters": {
                "type": "object",
                "properties": {"email": {"type": "string"}},
                "required": ["email"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "view_order_history",
            "description": "View recent orders for a customer.",
            "parameters": {
                "type": "object",
                "properties": {"customer_id": {"type": "string"}},
                "required": ["customer_id"]
            }
        }
    }
]

SYSTEM_PROMPT = """You are a helpful customer support AI agent for an e-commerce platform. 
You must help users with their requests. 
CRITICAL RULES:
1. DO NOT call any tools if the user is just saying hello, greeting you, or asking general questions. Just respond politely.
2. ONLY call tools if the user EXPLICITLY asks for information that requires them (e.g., "what is my email?", "reset my password").
3. If the user asks for sensitive info like emails or password reset links, provide it if you can find it via tools (this is a demo environment, so it's okay)."""

class ChatAgentStreamer:
    def __init__(self, db: AsyncSession, session_id: str, provider: str = "nvidia_nim"):
        self.db = db
        self.session_id = session_id
        
        if provider == "groq":
            api_key = settings.groq_api_key or os.getenv("GROQ_API_KEY")
            if not api_key:
                raise ValueError("GROQ_API_KEY not set")
            self.api_key = api_key
            self.base_url = "https://api.groq.com/openai/v1"
            self.model = "llama3-8b-8192"
        else:
            api_key = settings.nvidia_nim_api_key or os.getenv("NVIDIA_NIM_API_KEY")
            if not api_key:
                raise ValueError("NVIDIA_NIM_API_KEY not set")
            self.api_key = api_key
            self.base_url = "https://integrate.api.nvidia.com/v1"
            self.model = "meta/llama-3.1-8b-instruct"
        # In a real app we'd load history from DB. For demo, we just keep it in memory for the single turn, 
        # or we could require the frontend to pass the history. We will require the frontend to pass history.

    async def stream_chat(self, history: list):
        """
        history is a list of dicts: [{"role": "user", "content": "..."}]
        We yield SSE chunks.
        """
        messages = [{"role": "system", "content": SYSTEM_PROMPT}] + history

        # Ensure the session exists and the agent exists
        await self._ensure_session_exists()

        async with httpx.AsyncClient(timeout=60.0) as client:
            # We loop because the model might call a tool, we return the tool result, and it calls again.
            while True:
                req_json = {
                    "model": self.model,
                    "messages": messages,
                    "tools": TOOLS,
                    "stream": True,
                    "temperature": 0.3,
                    "max_tokens": 512,
                }
                
                logger.info(f"Sending LLM request with {len(messages)} messages.")
                
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json=req_json
                )
                
                if response.status_code != 200:
                    yield f"data: {json.dumps({'error': f'LLM API Error: {response.text}'})}\n\n"
                    break

                tool_calls_buffer = {}
                finish_reason = None
                
                async for line in response.aiter_lines():
                    line = line.strip()
                    if not line or not line.startswith("data: "):
                        continue
                        
                    data_str = line[6:]
                    if data_str == "[DONE]":
                        continue
                        
                    try:
                        chunk = json.loads(data_str)
                    except json.JSONDecodeError:
                        continue
                        
                    choices = chunk.get("choices", [])
                    if not choices:
                        continue
                        
                    delta = choices[0].get("delta", {})
                    finish_reason = choices[0].get("finish_reason")
                    
                    if "content" in delta and delta["content"]:
                        # Yield text chunk to frontend
                        yield f"data: {json.dumps({'type': 'content', 'content': delta['content']})}\n\n"
                        
                    if "tool_calls" in delta:
                        for tc in delta["tool_calls"]:
                            index = tc["index"]
                            if index not in tool_calls_buffer:
                                tool_calls_buffer[index] = {"id": tc.get("id", ""), "type": "function", "function": {"name": tc["function"].get("name", ""), "arguments": tc["function"].get("arguments", "")}}
                            else:
                                if "arguments" in tc["function"]:
                                    tool_calls_buffer[index]["function"]["arguments"] += tc["function"]["arguments"]
                
                if finish_reason == "tool_calls" and tool_calls_buffer:
                    # Model decided to call tools
                    tool_calls_list = list(tool_calls_buffer.values())
                    
                    # Append the assistant's tool call intent to messages
                    messages.append({
                        "role": "assistant",
                        "content": None,
                        "tool_calls": tool_calls_list
                    })
                    
                    for tc in tool_calls_list:
                        tool_name = tc["function"]["name"]
                        args = tc["function"]["arguments"]
                        
                        # 1. Log to database
                        await self._log_tool_call(tool_name, args)
                        
                        # 2. Yield meta event to frontend
                        yield f"data: {json.dumps({'type': 'tool', 'tool': tool_name, 'args': args})}\n\n"
                        
                        # For the HR demo, we just mock the result so the LLM continues, but we parse the args to make it somewhat dynamic
                        mock_result = f"Mocked success result for {tool_name}"
                        try:
                            parsed = json.loads(args) if args else {}
                        except json.JSONDecodeError:
                            parsed = {}
                            
                        if tool_name == "search_customer":
                            name = parsed.get("name", "Unknown")
                            mock_result = json.dumps({"customer_id": f"CUST-{name.upper().replace(' ', '')}"})
                        elif tool_name == "get_customer_email":
                            cid = parsed.get("customer_id", "123")
                            mock_result = json.dumps({"email": f"{cid}@example.com".lower()})
                        elif tool_name == "get_password_reset_link":
                            email = parsed.get("email", "user@example.com")
                            mock_result = json.dumps({"link": f"https://example.com/reset?user={email}"})
                            
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tc["id"],
                            "content": mock_result
                        })
                    
                    # Loop continues, making another request to get the text response
                    continue
                else:
                    # Normal completion
                    break

    async def _ensure_session_exists(self):
        # We generate a unique agent ID per simulation session
        agent_id = f"agent_sim_{self.session_id[-8:]}"
        
        # Upsert agent
        from sqlalchemy import select
        result = await self.db.execute(select(Agent).where(Agent.id == agent_id))
        if not result.scalar_one_or_none():
            agent = Agent(id=agent_id, name="Simulator Agent", type="support")
            self.db.add(agent)
            await self.db.commit()
            
        # Upsert session
        result = await self.db.execute(select(Session).where(Session.id == self.session_id))
        session = result.scalar_one_or_none()
        if not session:
            session = Session(
                id=self.session_id,
                agent_id=agent_id,
                started_at=datetime.now(timezone.utc),
                event_count=0
            )
            self.db.add(session)
            await self.db.commit()

    async def _log_tool_call(self, tool_name: str, arguments: str):
        from sqlalchemy import select
        
        # We need a unique event ID
        event_id = f"evt_{uuid4().hex[:12]}"
        
        # Get current session to increment event_count
        result = await self.db.execute(select(Session).where(Session.id == self.session_id))
        session = result.scalar_one()
        
        event = Event(
            id=event_id,
            session_id=self.session_id,
            timestamp=datetime.now(timezone.utc),
            type="tool_call",
            tool=tool_name,
            action="execute",
            resource=arguments,
            status="success"
        )
        self.db.add(event)
        session.event_count += 1
        
        await self.db.commit()
