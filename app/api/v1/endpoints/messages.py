from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Header, status

from app.schemas.message import (
    CriticalMessageRead,
    CriticalMessageStatusUpdate,
    CriticalMessagesSummary,
    MessagePriority,
    MessageStatus,
    RelatedModule,
)

router = APIRouter(prefix="/messages", tags=["Critical Messages"])

# Initial authoritative supply-chain critical messages
DEFAULT_MESSAGES: List[dict] = [
    {
        "id": "MSG-2026-001",
        "title": "FEFO Expiry Risk: Amul Milk 1L at Kolhapur Depot",
        "description": "Batch B-KOL-AML-231 at Kolhapur Distribution Center has fallen to 48% remaining shelf-life (Expiry: 2027-01-20). Breaches Store intake policy of 70% minimum shelf life.",
        "priority": MessagePriority.CRITICAL,
        "module": RelatedModule.INVENTORY,
        "affected_nodes": ["WH-KOL", "SKU-AML-01", "Batch B-KOL-AML-231"],
        "target_roles": ["priya", "ADMIN", "sunita", "OPERATOR", "rohit", "PLANNER"],
        "action_required": "Reroute batch to Modern Trade (D-Mart Kolhapur) under liquidation discount before 50% breach.",
        "admin_only": False,
        "timestamp": "2026-10-25T08:15:00Z",
        "status": MessageStatus.NEW,
    },
    {
        "id": "MSG-2026-002",
        "title": "Monsoon Rockslide on Khandala Ghat Corridor (NH-48)",
        "description": "Heavy monsoon rainfall triggered boulder fall in Borghat section. Highway authority reports 6.5h lane blockage between Pune Hub and Kolhapur depots.",
        "priority": MessagePriority.CRITICAL,
        "module": RelatedModule.DELIVERY,
        "affected_nodes": ["Corridor Pune-Kolhapur", "NH-48 Khandala", "Truck MH-12-Q-4091"],
        "target_roles": ["priya", "ADMIN", "rohit", "PLANNER", "sunita", "OPERATOR"],
        "action_required": "Activate Bhor Ghat secondary bypass or trigger dynamic vehicle reassignment to prevent cold-chain thaw.",
        "admin_only": False,
        "timestamp": "2026-10-25T07:45:00Z",
        "status": MessageStatus.NEW,
    },
    {
        "id": "MSG-2026-003",
        "title": "Silent Store POS Device: Mahadev Store (Solapur)",
        "description": "Terminal POS-SOL-004 has failed to transmit telemetry heartbeats for 82 consecutive hours (>72h threshold). Store is flagged as Needs Review.",
        "priority": MessagePriority.CRITICAL,
        "module": RelatedModule.POS_SYNC,
        "affected_nodes": ["STORE-MH-SOL-001", "Terminal POS-SOL-004", "Solapur Cluster"],
        "target_roles": ["priya", "ADMIN", "ganesh", "VIEWER", "rohit", "PLANNER"],
        "action_required": "Auto-cap store replenishment at median historical demand and dispatch field agent for hardware inspection.",
        "admin_only": False,
        "timestamp": "2026-10-25T06:30:00Z",
        "status": MessageStatus.ACKNOWLEDGED,
        "acknowledged_at": "2026-10-25T07:00:00Z",
        "acknowledged_by": "Rohit Deshpande",
    },
    {
        "id": "MSG-2026-004",
        "title": "Demand Surge Spike: Aashirvaad Atta 5kg (+42%)",
        "description": "Festive season demand spike observed in Pune-Satara urban retail cluster. Quantile demand model forecasts potential stockout within 48 hours.",
        "priority": MessagePriority.HIGH,
        "module": RelatedModule.FORECASTING,
        "affected_nodes": ["SKU-ATT-05", "Pune Central Hub", "Satara Stores"],
        "target_roles": ["priya", "ADMIN", "rohit", "PLANNER"],
        "action_required": "Trigger secondary allocation run with 280-case buffer release from Pune buffer warehouse.",
        "admin_only": False,
        "timestamp": "2026-10-25T05:50:00Z",
        "status": MessageStatus.NEW,
    },
    {
        "id": "MSG-2026-005",
        "title": "Outbound Staging Backlog at Pune Hub (W-PUN)",
        "description": "Dock Bay 3 pallet conveyor experiencing 45% throughput degradation. Morning dispatch run for 18 Store locations delayed by ~90 minutes.",
        "priority": MessagePriority.HIGH,
        "module": RelatedModule.WAREHOUSE,
        "affected_nodes": ["WH-PUN", "Dock Bay 3", "Conveyor Line A"],
        "target_roles": ["priya", "ADMIN", "sunita", "OPERATOR"],
        "action_required": "Reassign picking crews from bulk storage to staging bay 2.",
        "admin_only": False,
        "timestamp": "2026-10-25T05:20:00Z",
        "status": MessageStatus.NEW,
    },
    {
        "id": "MSG-2026-006",
        "title": "Offline IndexedDB Event Queue Overflow: Kolhapur Store",
        "description": "Store STORE-MH-KOL-001 has 38 unmerged offline sales events queued locally during regional internet connectivity disruption.",
        "priority": MessagePriority.HIGH,
        "module": RelatedModule.POS_SYNC,
        "affected_nodes": ["STORE-MH-KOL-001", "Ganesh Store", "Device Queue"],
        "target_roles": ["priya", "ADMIN", "ganesh", "VIEWER"],
        "action_required": "Trigger manual background synchronization once cellular 4G uplink stabilizes.",
        "admin_only": False,
        "timestamp": "2026-10-25T04:45:00Z",
        "status": MessageStatus.NEW,
    },
    {
        "id": "MSG-2026-007",
        "title": "Decision Service Solver p95 Latency Advisory",
        "description": "OR-Tools Knapsack allocation solver p95 latency reached 148ms during large statewide scenario seed. System SLA remains within 250ms threshold.",
        "priority": MessagePriority.MEDIUM,
        "module": RelatedModule.SYSTEM_HEALTH,
        "affected_nodes": ["FastAPI Core", "Decision Engine", "Solver Worker"],
        "target_roles": ["priya", "ADMIN"],
        "action_required": "Monitor CPU utilization across solver nodes during next replenishment run.",
        "admin_only": True,
        "timestamp": "2026-10-25T04:00:00Z",
        "status": MessageStatus.NEW,
    },
    {
        "id": "MSG-2026-008",
        "title": "Inter-Depot Stock Rebalance Opportunity: Fortune Sunflower Oil",
        "description": "Satara Regional Warehouse holding 18 days of forward cover while Kolhapur stores face 2.1 days. Inter-depot transit of 150 cases recommended.",
        "priority": MessagePriority.MEDIUM,
        "module": RelatedModule.INVENTORY,
        "affected_nodes": ["WH-SAT", "WH-KOL", "SKU-OIL-01"],
        "target_roles": ["priya", "ADMIN", "rohit", "PLANNER", "sunita", "OPERATOR"],
        "action_required": "Review marginal allocation proposal to balance cross-dock transportation costs.",
        "admin_only": False,
        "timestamp": "2026-10-25T03:30:00Z",
        "status": MessageStatus.NEW,
    },
    {
        "id": "MSG-2026-009",
        "title": "Reverse Freight Return Window: Satara to Pune Hub",
        "description": "Tata Ace EV (MH-14-GH-2211) completed delivery to Satara stores with 80-case return capacity. Potential carrier savings: ₹3,400.",
        "priority": MessagePriority.MEDIUM,
        "module": RelatedModule.DELIVERY,
        "affected_nodes": ["Route Satara-Pune", "Vehicle MH-14-GH-2211", "Driver Sachin Mane"],
        "target_roles": ["priya", "ADMIN", "rohit", "PLANNER", "sunita", "OPERATOR"],
        "action_required": "Assign empty crate return or backhaul replenishment to active driver before 11:30 AM.",
        "admin_only": False,
        "timestamp": "2026-10-25T03:00:00Z",
        "status": MessageStatus.RESOLVED,
        "acknowledged_at": "2026-10-25T03:15:00Z",
        "acknowledged_by": "Rohit Deshpande",
        "resolved_at": "2026-10-25T03:45:00Z",
        "resolved_by": "Priya Sharma",
    },
]

# In-memory persistence store for critical messages
_messages_store: List[dict] = [dict(m) for m in DEFAULT_MESSAGES]


def _filter_by_role(messages: List[dict], user_role: Optional[str]) -> List[dict]:
    """Filters messages based on user persona or role."""
    if not user_role:
        return messages

    norm_role = user_role.lower().strip()
    if norm_role in ("priya", "admin"):
        return messages

    filtered = []
    for msg in messages:
        target_roles = [r.lower() for r in msg.get("target_roles", [])]
        if norm_role in target_roles:
            filtered.append(msg)
        elif norm_role == "rohit" and ("planner" in target_roles or "rohit" in target_roles):
            filtered.append(msg)
        elif norm_role == "sunita" and ("operator" in target_roles or "sunita" in target_roles):
            filtered.append(msg)
        elif norm_role == "ganesh" and ("viewer" in target_roles or "ganesh" in target_roles):
            filtered.append(msg)

    return filtered


@router.get("", response_model=List[CriticalMessageRead], summary="List Critical Messages")
@router.get("/", response_model=List[CriticalMessageRead], include_in_schema=False)
def list_messages(
    priority: Optional[MessagePriority] = Query(None, description="Filter by priority: CRITICAL, HIGH, MEDIUM"),
    module: Optional[RelatedModule] = Query(None, description="Filter by module"),
    status_filter: Optional[MessageStatus] = Query(None, alias="status", description="Filter by status"),
    user_role: Optional[str] = Query(None, description="Persona or role: rohit, sunita, ganesh, priya, or ADMIN"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
):
    """
    Returns critical system messages with role-based visibility filtering.
    Admin sees all system messages; regular users see only messages relevant to their operations.
    """
    effective_role = user_role or x_user_role or "priya"
    results = _filter_by_role(_messages_store, effective_role)

    if priority:
        results = [m for m in results if m.get("priority") == priority]
    if module:
        if module in (RelatedModule.STORE_MANAGEMENT, RelatedModule.POS_SYNC, RelatedModule.KIRANA):
            results = [
                m for m in results
                if m.get("module") in (RelatedModule.STORE_MANAGEMENT, RelatedModule.POS_SYNC, RelatedModule.KIRANA, "Store Management", "POS Sync", "Kirana")
            ]
        else:
            results = [m for m in results if m.get("module") == module]
    if status_filter:
        results = [m for m in results if m.get("status") == status_filter]

    # Return in reverse chronological order
    results = sorted(results, key=lambda m: m.get("timestamp", ""), reverse=True)
    return results


@router.get("/summary", response_model=CriticalMessagesSummary, summary="Critical Messages Summary Statistics")
def get_messages_summary(
    user_role: Optional[str] = Query(None),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
):
    """Provides summary KPI counts for critical messages filtered for the requesting role."""
    effective_role = user_role or x_user_role or "priya"
    accessible = _filter_by_role(_messages_store, effective_role)

    return CriticalMessagesSummary(
        total=len(accessible),
        critical_count=sum(1 for m in accessible if m.get("priority") == MessagePriority.CRITICAL),
        high_count=sum(1 for m in accessible if m.get("priority") == MessagePriority.HIGH),
        medium_count=sum(1 for m in accessible if m.get("priority") == MessagePriority.MEDIUM),
        new_count=sum(1 for m in accessible if m.get("status") == MessageStatus.NEW),
        acknowledged_count=sum(1 for m in accessible if m.get("status") == MessageStatus.ACKNOWLEDGED),
        resolved_count=sum(1 for m in accessible if m.get("status") == MessageStatus.RESOLVED),
    )


@router.post("/{message_id}/acknowledge", response_model=CriticalMessageRead, summary="Acknowledge a Critical Message")
def acknowledge_message(
    message_id: str,
    user_role: Optional[str] = Query(None),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
):
    """Allows Admin and regular Users to acknowledge a critical message."""
    effective_role = user_role or x_user_role or "Operator"
    for msg in _messages_store:
        if msg["id"] == message_id:
            msg["status"] = MessageStatus.ACKNOWLEDGED
            msg["acknowledged_at"] = datetime.now(timezone.utc).isoformat()
            msg["acknowledged_by"] = effective_role.capitalize()
            return msg

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Message {message_id} not found")


@router.post("/{message_id}/resolve", response_model=CriticalMessageRead, summary="Resolve a Critical Message")
def resolve_message(
    message_id: str,
    user_role: Optional[str] = Query(None),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
):
    """
    Marks a critical message as Resolved.
    Restricted to Admin or authorized operational managers.
    """
    effective_role = (user_role or x_user_role or "").lower()
    for msg in _messages_store:
        if msg["id"] == message_id:
            if msg.get("admin_only") and effective_role not in ("priya", "admin"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="This is a system infrastructure issue that can only be resolved by a System Administrator.",
                )
            msg["status"] = MessageStatus.RESOLVED
            msg["resolved_at"] = datetime.now(timezone.utc).isoformat()
            msg["resolved_by"] = effective_role.capitalize() or "Administrator"
            return msg

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Message {message_id} not found")


@router.post("/reset", response_model=List[CriticalMessageRead], summary="Reset Messages to Initial Seed")
def reset_messages():
    """Resets messages in memory to default demo fixtures."""
    global _messages_store
    _messages_store = [dict(m) for m in DEFAULT_MESSAGES]
    return _messages_store
