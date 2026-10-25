import enum
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class MessagePriority(str, enum.Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"


class MessageStatus(str, enum.Enum):
    NEW = "NEW"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"


class RelatedModule(str, enum.Enum):
    INVENTORY = "Inventory"
    FORECASTING = "Forecasting"
    DELIVERY = "Delivery"
    WAREHOUSE = "Warehouse"
    POS_SYNC = "POS Sync"
    STORE_MANAGEMENT = "Store Management"
    KIRANA = "Kirana"
    SYSTEM_HEALTH = "System Health"


class CriticalMessageBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=200, description="Short title of the critical issue")
    description: str = Field(..., min_length=5, description="Full explanation of the issue and context")
    priority: MessagePriority = Field(default=MessagePriority.HIGH, description="Severity of the message")
    module: RelatedModule = Field(..., description="Related domain module")
    affected_nodes: List[str] = Field(default_factory=list, description="Affected stores, warehouses, SKUs, or corridors")
    target_roles: List[str] = Field(default_factory=list, description="Roles/personas permitted to view this message")
    action_required: Optional[str] = Field(default=None, description="Recommended operational action")
    admin_only: bool = Field(default=False, description="Whether resolution is restricted exclusively to Admin")


class CriticalMessageRead(CriticalMessageBase):
    id: str = Field(..., description="Unique message identifier, e.g. MSG-2026-001")
    timestamp: str = Field(..., description="ISO-8601 creation timestamp")
    status: MessageStatus = Field(default=MessageStatus.NEW, description="Current workflow status")
    acknowledged_at: Optional[str] = None
    acknowledged_by: Optional[str] = None
    resolved_at: Optional[str] = None
    resolved_by: Optional[str] = None


class CriticalMessageStatusUpdate(BaseModel):
    status: MessageStatus
    note: Optional[str] = None


class CriticalMessagesSummary(BaseModel):
    total: int
    critical_count: int
    high_count: int
    medium_count: int
    new_count: int
    acknowledged_count: int
    resolved_count: int
