"""
HETVAYA Product AI Assistant - Standalone Server
Runs a dedicated FastAPI service on port 8001 with interactive Swagger UI.

Usage:
    python backend/standalone_server.py
    # or
    python standalone_server.py
"""

import sys
import os
from pathlib import Path

# Ensure backend directory is in python path
current_dir = Path(__file__).resolve().parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

try:
    from .schemas import ChatQueryRequest, ChatQueryResponse
    from .chat_service import ProductChatIntelligenceService
    from .router import router as chatbot_router
except ImportError:
    from schemas import ChatQueryRequest, ChatQueryResponse
    from chat_service import ProductChatIntelligenceService
    from router import router as chatbot_router

app = FastAPI(
    title="HETVAYA Product AI Assistant — Standalone API",
    version="1.0.0",
    description=(
        "Dedicated microservice for FMCG product intelligence, stock availability, "
        "FEFO batch expiry risks, warehouse sourcing, freight matrix rates, and "
        "distribution plan explanations. Grounded in verified application data."
    ),
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount chatbot router at /api and root alias /chat
app.include_router(chatbot_router, prefix="/api")


@app.post("/chat", response_model=ChatQueryResponse, tags=["Direct Chat Endpoint"])
def chat_direct(payload: ChatQueryRequest) -> ChatQueryResponse:
    """Convenience top-level chat endpoint."""
    return ProductChatIntelligenceService.process_chat_query(payload=payload, db=None)


@app.get("/", tags=["Info"])
def root():
    return {
        "service": "HETVAYA Product AI Assistant Standalone Server",
        "docs_url": "/docs",
        "chat_endpoint": "/chat",
        "api_chat_endpoint": "/api/ai/chat",
        "status": "OPERATIONAL",
    }


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8001"))
    print(f"\n=======================================================")
    print(f"🚀 HETVAYA Product AI Assistant Server Starting")
    print(f"📍 Interactive Docs: http://localhost:{port}/docs")
    print(f"📍 Direct Chat:     http://localhost:{port}/chat")
    print(f"=======================================================\n")
    uvicorn.run("standalone_server:app", host="0.0.0.0", port=port, reload=True)
