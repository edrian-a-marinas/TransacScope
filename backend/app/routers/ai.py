import logging
from fastapi import APIRouter, Depends
from typing import Tuple
from app.auth.format_role import get_user_id_and_role
from app.schemas.ai import ChatRequest, ChatResponse
from app.services import ai_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["AI"])


@router.post("/chat", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    user_data: Tuple[int, str] = Depends(get_user_id_and_role),
):
    user_id, role = user_data
    logger.info(f"AI chat request from user_id={user_id} role={role}")
    reply = await ai_service.chat(
        message=payload.message,
        history=[msg.model_dump() for msg in payload.history],
        user_id=user_id,
        role=role,
    )
    return ChatResponse(reply=reply)


@router.get("/context", response_model=dict)
async def get_context(
    user_data: Tuple[int, str] = Depends(get_user_id_and_role),
):
    """
    Returns the financial context the AI currently sees.
    Useful for the frontend to show an auto-greeting on page load.
    """
    user_id, role = user_data
    context = await ai_service.get_financial_context(user_id, role)
    return {"context": context}