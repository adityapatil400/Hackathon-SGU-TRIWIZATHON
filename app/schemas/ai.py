from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class OllamaGenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1, description="Prompt sent to the local Ollama LLM")
    model: Optional[str] = Field(default=None, description="Optional override of model name (e.g. llama3.2:latest or gemma4:12b)")
    system_prompt: Optional[str] = Field(default=None, description="System instruction prompt")
    temperature: float = Field(default=0.2, ge=0.0, le=1.0)
    json_format: bool = Field(default=True, description="Enforce structured JSON output format")


class OllamaGenerateResponse(BaseModel):
    model: str
    response: str
    parsed_json: Optional[Dict[str, Any]] = None
    execution_time_seconds: float
    is_fallback: bool = False


class PlanExplanationRequest(BaseModel):
    plan_code: str = Field(..., max_length=64, examples=["PLAN-SCENARIO-DIWALI-2026"])
    model: Optional[str] = Field(default=None, description="Ollama model to use")
    focus_areas: List[str] = Field(
        default_factory=lambda: ["fill_rate", "transport_cost", "expiry_risk"],
        description="Dimensions to analyze in explainability response"
    )


class PlanExplanationResponse(BaseModel):
    plan_code: str
    model_used: str
    executive_summary: str
    fill_rate_assessment: str
    cost_tradeoff_assessment: str
    perishability_risk_assessment: str
    key_recommendations: List[str]
    traceable_facts_used: Dict[str, Any]
    is_fallback: bool = False


class DisruptionParseRequest(BaseModel):
    unstructured_text: str = Field(
        ...,
        min_length=5,
        examples=["Driver Suresh (AGENT-MUM-01) reports breakdown on Expressway, delaying 150 units of SKU-PHONE-X to Pune retail store"],
        description="Natural language incident report from delivery agent, dispatcher, or traffic alert"
    )
    model: Optional[str] = None


class DisruptionParseResponse(BaseModel):
    event_type: str = Field(description="Identified event type (e.g. AGENT_UNAVAILABLE, ROUTE_DISRUPTED, DEMAND_SURGE)")
    affected_agent_codes: List[str] = Field(default_factory=list)
    affected_store_codes: List[str] = Field(default_factory=list)
    affected_skus: List[str] = Field(default_factory=list)
    estimated_delay_hours: Optional[int] = None
    severity: str = Field(default="MEDIUM", description="Assessed operational severity: LOW, MEDIUM, HIGH, CRITICAL")
    summary: str
    raw_input: str
    is_fallback: bool = False


class OllamaModelInfo(BaseModel):
    name: str
    size: Optional[int] = None
    modified_at: Optional[str] = None
    family: Optional[str] = None


class OllamaStatusResponse(BaseModel):
    status: str
    base_url: str
    configured_model: str
    available_models: List[OllamaModelInfo]
    is_connected: bool


class FMCGEngineRunRequest(BaseModel):
    top_n_skus: int = Field(default=25, ge=1, le=100, description="Number of top SKUs to optimize")
    num_stores: int = Field(default=15, ge=1, le=30, description="Number of retail stores to fulfill")
    use_net_replenishment: bool = Field(default=True, description="Enable dynamic net replenishment and safety stock")
    simulated_stock_seed: int = Field(default=42, description="Random seed for on-hand store stock simulation")
    create_plan_record: bool = Field(default=True, description="Automatically persist candidate plan in authoritative database")
    ollama_model: Optional[str] = Field(default=None, description="Optional local Ollama model override (e.g. llama3, mistral, llama3.2)")


class FMCGEngineRunResponse(BaseModel):
    engine_status: str
    plan_code: Optional[str] = None
    plan_id: Optional[int] = None
    module_1_inventory_dashboard: Dict[str, Any]
    module_2_demand_prediction: Dict[str, Any]
    module_3_distribution_recommendations: List[Dict[str, Any]]
    module_4_optimization_dashboard: Dict[str, Any]
    executive_dispatch_briefing: Optional[str] = None
    key_feature_insights: Optional[List[Dict[str, Any]]] = None


class RoadRiskAssessmentRequest(BaseModel):
    route_id: str = Field(default="RT-PUN-KOL-01", description="Route ID")
    corridor_id: str = Field(default="CORR_PUNE_KOLHAPUR", description="Representative highway corridor ID")
    terrain_class: str = Field(default="ghat_mixed", description="Terrain classification (plain, ghat_mixed, coastal)")
    environment_region: str = Field(default="Western_Ghats", description="Environment region")
    road_distance_km: float = Field(default=235.0, ge=1.0, description="Corridor distance in kilometers")
    baseline_drive_time_minutes: float = Field(default=270.0, ge=1.0, description="Baseline drive time in minutes")
    rainfall_mm: float = Field(default=12.5, ge=0.0, description="Rainfall scenario in mm")
    visibility_km: float = Field(default=6.0, ge=0.0, description="Visibility in km")
    traffic_congestion_index: float = Field(default=0.45, ge=0.0, le=1.0, description="Congestion index [0.0 - 1.0]")
    pothole_or_surface_risk_index: float = Field(default=0.35, ge=0.0, le=1.0, description="Pothole/surface risk index [0.0 - 1.0]")
    waterlogging_flag: bool = Field(default=False, description="Waterlogging flag")
    day_of_week: int = Field(default=2, ge=0, le=6, description="Day of week (0=Mon, 6=Sun)")


class RoadRiskAssessmentResponse(BaseModel):
    route_id: str
    corridor_id: str
    terrain_class: str
    predicted_delay_minutes: float
    risk_severity: str
    risk_score: float
    lateness_surcharge_inr: float
    replan_recommended: bool
    explanation: str


class ForecastDecisionRequest(BaseModel):
    store_code: str = Field(..., description="Store / Kirana identifier (e.g. RET-GAN)")
    store_name: Optional[str] = Field(default=None, description="Store commercial name")
    store_city: Optional[str] = Field(default="Kolhapur", description="Store geographical city/region")
    store_tier: Optional[int] = Field(default=1, ge=1, le=5, description="Priority tier (1=highest, 5=lowest)")
    sku: str = Field(..., description="FMCG SKU code (e.g. SKU-ATT-05)")
    product_name: Optional[str] = Field(default=None, description="Product commercial name")
    category: Optional[str] = Field(default="Staples & Grains", description="Product category")
    unit_cost: Optional[float] = Field(default=195.0, ge=0.0)
    unit_price: Optional[float] = Field(default=240.0, ge=0.0)
    case_size: Optional[int] = Field(default=12, ge=1, description="Units per shipping case")
    shelf_life_days: Optional[int] = Field(default=180, ge=1)
    is_perishable: Optional[bool] = Field(default=False)
    q10: float = Field(..., ge=0.0, description="10th percentile demand floor")
    q50: float = Field(..., ge=0.0, description="50th percentile median demand")
    q80: Optional[float] = Field(default=None, ge=0.0)
    q90: float = Field(..., ge=0.0, description="90th percentile high demand")
    q95: Optional[float] = Field(default=None, ge=0.0, description="95th percentile surge demand")
    baseline_moving_avg: Optional[float] = Field(default=None, ge=0.0)
    method: Optional[str] = Field(default="HistGradientBoosting", description="ML technique used")
    stockout_corrected: Optional[bool] = Field(default=False, description="Whether stockout day was corrected (RC2)")
    wape: Optional[float] = Field(default=0.142, description="Series WAPE error")
    bias: Optional[float] = Field(default=0.0, description="Forecast bias")
    last_week_actual: Optional[float] = Field(default=None, description="Actual demand from prior cycle")
    current_stock: Optional[int] = Field(default=0, ge=0, description="Store on-hand stock")
    regional_context: Optional[str] = Field(default=None, description="Optional festival, weather, or transit notes")
    model: Optional[str] = Field(default=None, description="LLM override (e.g. nemotron-3-ultra:cloud)")


class ForecastDecisionResponse(BaseModel):
    decision_id: str
    store_code: str
    sku: str
    model_used: str
    verdict: str  # "APPROVE_REPLENISHMENT", "BUFFER_AUGMENTED", "CONSERVATIVE_CAP", "STOCKOUT_DEFENSE", "AUDIT_FLAGGED"
    recommended_units: int
    recommended_cases: int
    recommended_safety_buffer_pct: float
    stockout_risk_level: str  # "LOW", "MEDIUM", "HIGH", "CRITICAL"
    waste_spoilage_risk_level: str  # "LOW", "MEDIUM", "HIGH"
    confidence_score: float
    natural_language_explanation: str
    quantile_spread_analysis: str
    stockout_correction_impact: str
    key_decision_factors: List[str]
    traceable_facts: Dict[str, Any]
    is_fallback: bool = False
    execution_time_seconds: float


class BatchForecastDecisionRequest(BaseModel):
    items: List[ForecastDecisionRequest] = Field(..., min_length=1, max_length=50)
    model: Optional[str] = None


class BatchForecastDecisionResponse(BaseModel):
    total_evaluated: int
    model_used: str
    decisions: List[ForecastDecisionResponse]
    execution_time_seconds: float





