"""
HETVAYA Agentic Chatbot & Fuel Surcharge API Endpoints.
Powered by 'nemotron-3-ultra:cloud' with verifiable data grounding,
continuous system resource synchronization, and strict rule-based freight calculations.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.fuel_service import FuelPriceService, DISTRIBUTION_CORRIDORS
from hetvaya_chatbot_package.backend.schemas import (
    ChatQueryRequest,
    ChatQueryResponse,
    ChatSourceItem,
)
from hetvaya_chatbot_package.backend.chat_service import ProductChatIntelligenceService

router = APIRouter(prefix="/chat", tags=["HETVAYA Agentic Chatbot"])


class RouteFreightImpactRequest(BaseModel):
    corridor_id: Optional[str] = Field(default=None, description="Corridor ID e.g. COR-PUN-DMA")
    origin_wh: Optional[str] = Field(default=None, description="Origin warehouse code")
    destination_ret: Optional[str] = Field(default=None, description="Destination store code")
    current_diesel: Optional[float] = Field(default=None, description="Optional custom diesel rate in INR")
    cases: int = Field(default=100, ge=1, description="Number of standard cases dispatched")


@router.post(
    "",
    response_model=ChatQueryResponse,
    status_code=status.HTTP_200_OK,
    summary="Agentic Chatbot Copilot Query",
    description=(
        "Processes user inquiries regarding product catalog, inventory availability, "
        "FEFO batch-level expiry risks, warehouse sourcing, fuel prices across India, "
        "and strict rule-based freight impact calculations using nemotron-3-ultra:cloud."
    ),
)
def chat_copilot(payload: ChatQueryRequest) -> ChatQueryResponse:
    """Executes the agentic chat reasoning pipeline with tool dispatch."""
    return ProductChatIntelligenceService.process_chat_query(
        payload=payload,
        db=None,
    )


@router.get(
    "/fuel-prices",
    status_code=status.HTTP_200_OK,
    summary="Fetch Fuel Prices Across India",
    description=(
        "Fetches live diesel and petrol prices across Indian states using Google RSS News API "
        "and SerpAPI with verified OMC benchmark indexes and strict rule-based surcharge formulas."
    ),
)
def get_fuel_prices(
    state: str = Query(default="Maharashtra", description="Indian state name (e.g. Maharashtra, Delhi, Karnataka)"),
    use_live_api: bool = Query(default=True, description="Whether to query live Google RSS News API"),
) -> Dict[str, Any]:
    """Returns state and city fuel rates with rule-based surcharge analysis."""
    return FuelPriceService.get_fuel_prices_across_india(
        target_state=state,
        use_live_api=use_live_api,
    )


@router.post(
    "/fuel-impact",
    status_code=status.HTTP_200_OK,
    summary="Calculate Route Freight Impact",
    description="Calculates adjusted freight cost per case and total trip cost based on strict rule-based fuel surcharges.",
)
def calculate_fuel_impact(payload: RouteFreightImpactRequest) -> Dict[str, Any]:
    """Calculates corridor freight adjustment using strict rule-based formula."""
    return FuelPriceService.calculate_route_freight_impact(
        corridor_id=payload.corridor_id,
        origin_wh=payload.origin_wh,
        destination_ret=payload.destination_ret,
        current_diesel=payload.current_diesel,
        cases=payload.cases,
    )


@router.get(
    "/corridors",
    status_code=status.HTTP_200_OK,
    summary="List Distribution Corridors with Adjusted Freight",
    description="Returns all registered supply chain corridors with base freight and current fuel-adjusted freight.",
)
def list_corridors_impact(
    current_diesel: Optional[float] = Query(default=None, description="Optional custom diesel rate in INR"),
) -> List[Dict[str, Any]]:
    """Lists all corridors with current freight rates."""
    return FuelPriceService.get_all_corridors_impact(current_diesel=current_diesel)


@router.get(
    "/model-info",
    status_code=status.HTTP_200_OK,
    summary="Get Chatbot & Model Details",
)
def get_model_info() -> Dict[str, Any]:
    """Returns active model metadata and registered agentic tools."""
    return {
        "active_model": settings.OLLAMA_MODEL,
        "fallback_model": settings.OLLAMA_FALLBACK_MODEL,
        "base_url": settings.OLLAMA_BASE_URL,
        "ollama_enabled": settings.OLLAMA_ENABLED,
        "status": "ONLINE",
        "reasoning_mode": "cloud_agentic",
        "registered_tools": [
            {
                "name": "fetch_fuel_prices_india",
                "description": "Fetches diesel/petrol prices across India using Google RSS News API and SerpAPI",
                "parameters": ["state"],
            },
            {
                "name": "calculate_strict_rule_surcharge",
                "description": "Calculates freight surcharge % and corridor rate adjustments with strict base ₹90/L rule",
                "parameters": ["current_diesel", "base_freight_per_case", "cases"],
            },
            {
                "name": "scan_fefo_inventory_batches",
                "description": "Identifies near-expiry batches breaching minimum retailer shelf-life thresholds",
                "parameters": ["sku", "warehouse_id", "min_shelf_life_pct"],
            },
            {
                "name": "inspect_active_allocation_plan",
                "description": "Audits candidate stock movements, fill rate, and logistics costs",
                "parameters": ["plan_code"],
            },
            {
                "name": "query_product_inventory",
                "description": "Checks warehouse stock availability for catalog SKUs",
                "parameters": ["sku", "warehouse_id"],
            },
        ],
    }
