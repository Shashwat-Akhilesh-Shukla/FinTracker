"""
Chatbot API endpoint that:
- Accepts a POST request with a user message
- Fetches portfolio data from DB for the authenticated user
- Streams the Perplexity AI response as Server-Sent Events (SSE)
"""

from typing import List, Optional
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.services.chatbot_service import stream_chat_response

router = APIRouter()


class ConversationTurn(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[ConversationTurn]] = None


@router.post("/chat")
async def chat(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Stream a chatbot response based on the user's portfolio data.

    - **message**: The user's question or message.
    - **conversation_history**: Optional list of prior turns for multi-turn conversations.

    Returns a `text/event-stream` response. Each chunk is formatted as:
    ```
    data: <token>\\n\\n
    ```
    The stream ends with:
    ```
    data: [DONE]\\n\\n
    ```
    """
    user_id = current_user["user_id"]

    history = (
        [{"role": t.role, "content": t.content} for t in request.conversation_history]
        if request.conversation_history
        else None
    )

    return StreamingResponse(
        stream_chat_response(
            db=db,
            user_id=user_id,
            message=request.message,
            conversation_history=history,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
            "Connection": "keep-alive",
        },
    )
