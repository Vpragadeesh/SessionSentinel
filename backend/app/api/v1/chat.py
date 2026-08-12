from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any

from app.db.database import get_db
from app.services.llm.chat_agent import ChatAgentStreamer

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatMessageRequest(BaseModel):
    session_id: str
    messages: List[Dict[str, Any]]  # List of {"role": "user", "content": "..."}
    provider: str = "nvidia_nim"

@router.post("/message")
async def stream_chat_message(req: ChatMessageRequest, db: AsyncSession = Depends(get_db)):
    """
    Streams a chat response back to the client using Server-Sent Events (SSE).
    Intercepts and logs tool calls to the database under the given session_id.
    """
    streamer = ChatAgentStreamer(db=db, session_id=req.session_id, provider=req.provider)
    
    # We use StreamingResponse with media_type text/event-stream
    return StreamingResponse(
        streamer.stream_chat(req.messages),
        media_type="text/event-stream"
    )
