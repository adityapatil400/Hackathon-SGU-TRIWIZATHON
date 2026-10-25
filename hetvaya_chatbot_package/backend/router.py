"""
HETVAYA Product AI Assistant - FastAPI Router
Can be mounted on any FastAPI application:
    from backend.router import router as chatbot_router
    app.include_router(chatbot_router, prefix="/api")
"""

from typing import Optional, Any
from fastapi import APIRouter, status, Depends
try:
    from .schemas import ChatQueryRequest, ChatQueryResponse
    from .chat_service import ProductChatIntelligenceService
except ImportError:
    from schemas import ChatQueryRequest, ChatQueryResponse
    from chat_service import ProductChatIntelligenceService

router = APIRouter(prefix="/ai", tags=["HETVAYA Product AI Assistant"])


@router.post(
    "/chat",
    response_model=ChatQueryResponse,
    status_code=status.HTTP_200_OK,
    summary="Query HETVAYA Product AI Assistant",
    description=(
        "Answers product catalog, inventory availability, batch-level FEFO expiry risks, "
        "warehouse sourcing, freight rates, and distribution plan allocation questions."
    ),
)
def query_product_ai_assistant(
    payload: ChatQueryRequest,
) -> ChatQueryResponse:
    """Processes product intelligence and supply-chain chat queries."""
    return ProductChatIntelligenceService.process_chat_query(
        payload=payload,
        db=None,
    )


@router.get(
    "/chat/health",
    summary="Chatbot Health Check",
    status_code=status.HTTP_200_OK,
)
def chatbot_health():
    """Returns the operational status of the Product AI Assistant."""
    return {
        "status": "HEALTHY",
        "service": "HETVAYA Product AI Assistant",
        "zero_hallucination_guarantee": True,
        "supported_intents": [
            "out_of_stock",
            "expiry_risk",
            "stock_availability",
            "warehouse_sourcing",
            "freight_cost",
            "allocation_explanation",
            "catalog_search",
        ],
    }
