from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ChatQueryContext(BaseModel):
    product_sku: Optional[str] = Field(default=None, description="Optional active product SKU context")
    product_name: Optional[str] = Field(default=None, description="Optional product name")
    warehouse_id: Optional[str] = Field(default=None, description="Optional warehouse identifier")
    retailer_id: Optional[str] = Field(default=None, description="Optional retailer / store identifier")
    plan_code: Optional[str] = Field(default=None, description="Optional distribution plan code")
    system_resources: Optional[Dict[str, Any]] = Field(default=None, description="Continuous live snapshot of frontend application data (products, warehouses, stores, batches, forecasts, plan)")


class ChatSourceItem(BaseModel):
    title: str = Field(..., description="Display title for the retrieved data record")
    source_type: str = Field(..., description="inventory, batch_expiry, warehouse, retailer, route_freight, forecast, plan, or fuel_price")
    product_sku: Optional[str] = None
    identifier: Optional[str] = None
    verified_data: Dict[str, Any] = Field(default_factory=dict, description="Structured verified attributes")


class ChatQueryRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000, description="User prompt or question")
    conversation_id: Optional[str] = Field(default=None, description="Optional client conversation tracking ID")
    context: Optional[ChatQueryContext] = Field(default=None, description="Active UI context")
    language: Optional[str] = Field(default="en", description="Preferred response language: en, hi, mr")


class ChatQueryResponse(BaseModel):
    answer: str = Field(..., description="Natural language answer grounded in authoritative application data")
    conversation_id: Optional[str] = None
    sources: List[ChatSourceItem] = Field(default_factory=list, description="Authoritative sources retrieved from the database/services")
    intent: str = Field(default="general_query", description="Identified intent")
    suggested_followups: List[str] = Field(default_factory=list, description="Suggested follow-up questions")
    is_ai_generated: bool = Field(default=False, description="True if generated via local Ollama LLM, False if synthesized via deterministic engine")
    active_model: str = Field(default="nemotron-3-ultra:cloud", description="The active reasoning model name")
    tools_executed: List[Dict[str, Any]] = Field(default_factory=list, description="List of agentic tools executed to answer the query")
    structured_card: Optional[Dict[str, Any]] = Field(default=None, description="Optional interactive structured data card (e.g. fuel_surcharge, expiry_batches)")
    missing_information: Optional[str] = Field(default=None, description="Notice of what information is missing if data is incomplete")
    response_timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
