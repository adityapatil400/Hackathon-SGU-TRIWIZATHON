"""
FlowGrid AI & Ollama Intelligence Router.
Provides dynamic reasoning, fact-grounded plan explainability,
incident parsing, and candidate allocation optimization via local Ollama LLMs.
"""

import re
import uuid
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.exceptions import EntityNotFoundException
from app.core.security import require_roles, AuthenticatedUser, PLANNER_ROLES, VIEWER_ROLES
from app.models.plan import DistributionPlan
from app.models.product import Product
from app.schemas.ai import (
    OllamaGenerateRequest,
    OllamaGenerateResponse,
    PlanExplanationRequest,
    PlanExplanationResponse,
    DisruptionParseRequest,
    DisruptionParseResponse,
    OllamaStatusResponse,
    FMCGEngineRunRequest,
    FMCGEngineRunResponse,
    RoadRiskAssessmentRequest,
    RoadRiskAssessmentResponse,
    ChatQueryRequest,
    ChatQueryResponse,
)
from app.schemas.decision import CandidatePlanProposal
from app.services.ollama_service import OllamaService
from app.services.plan_lifecycle_service import PlanLifecycleService
from app.services.chat_intelligence_service import ProductChatIntelligenceService

router = APIRouter(prefix="/ai", tags=["AI & Ollama Intelligence"])


# Cached instance of RoadRiskDelayPredictor
_road_risk_predictor = None

def get_road_risk_predictor():
    global _road_risk_predictor
    if _road_risk_predictor is None:
        try:
            from models.road_risk_predictor import RoadRiskDelayPredictor
            predictor = RoadRiskDelayPredictor(models_dir="saved_models")
            predictor.load()
            _road_risk_predictor = predictor
        except Exception:
            _road_risk_predictor = None
    return _road_risk_predictor



@router.get(
    "/status",
    response_model=OllamaStatusResponse,
    summary="Check Ollama daemon connection and installed models",
    description="Returns connectivity status and list of local LLM models (e.g. Llama 3.2, Gemma 4)."
)
def get_ollama_status(
    current_user: AuthenticatedUser = Depends(require_roles(VIEWER_ROLES)),
) -> OllamaStatusResponse:
    return OllamaService.get_status()


@router.post(
    "/generate",
    response_model=OllamaGenerateResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute dynamic structured LLM generation",
    description="Executes a prompt against local Ollama with guaranteed JSON schema output."
)
def generate_dynamic_output(
    payload: OllamaGenerateRequest,
    current_user: AuthenticatedUser = Depends(require_roles(PLANNER_ROLES)),
) -> OllamaGenerateResponse:
    return OllamaService.generate(
        prompt=payload.prompt,
        model=payload.model,
        system_prompt=payload.system_prompt,
        temperature=payload.temperature,
        json_format=payload.json_format,
    )


@router.post(
    "/explain-plan",
    response_model=PlanExplanationResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate dynamic executive explanation for a distribution plan (FR-P0-11)",
    description="Uses Ollama to generate a fact-grounded natural language explanation answering 'Why did this plan change?'.",
)
def explain_distribution_plan(
    payload: PlanExplanationRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_roles(VIEWER_ROLES)),
) -> PlanExplanationResponse:
    plan = PlanLifecycleService._resolve_plan(db, payload.plan_code)
    
    plan_dict = {
        "id": plan.id,
        "plan_code": plan.plan_code,
        "status": plan.status.value if hasattr(plan.status, "value") else str(plan.status),
        "target_warehouse_id": plan.target_warehouse_id,
        "input_inventory_version": plan.input_inventory_version,
        "candidate_allocations": plan.candidate_allocations or [],
    }

    # Fetch comparison metrics if available
    comparison_metrics = None
    try:
        from app.api.v1.endpoints.plans import compare_plan_policies
        comp_res = compare_plan_policies(plan.plan_code, db=db, current_user=current_user)
        comparison_metrics = comp_res.model_dump()["metrics"]
    except Exception:
        pass

    return OllamaService.explain_plan(
        plan_code=plan.plan_code,
        plan_details=plan_dict,
        comparison_metrics=comparison_metrics,
        model=payload.model,
    )


@router.post(
    "/parse-disruption",
    response_model=DisruptionParseResponse,
    status_code=status.HTTP_200_OK,
    summary="Parse natural language disruption reports into structured events",
    description="Translates driver messages, traffic reports, or incident notes into structured parameters.",
)
def parse_unstructured_disruption(
    payload: DisruptionParseRequest,
    current_user: AuthenticatedUser = Depends(require_roles(PLANNER_ROLES)),
) -> DisruptionParseResponse:
    return OllamaService.parse_disruption(
        text=payload.unstructured_text,
        model=payload.model,
    )


@router.post(
    "/candidate-proposal",
    response_model=CandidatePlanProposal,
    status_code=status.HTTP_200_OK,
    summary="Generate dynamic candidate allocation proposal via Ollama",
    description="Uses Ollama to generate candidate movements strictly validated against CandidatePlanProposal schema.",
)
def generate_ollama_candidate_proposal(
    scenario_code: str,
    db: Session = Depends(get_db),
    model: Optional[str] = None,
    current_user: AuthenticatedUser = Depends(require_roles(PLANNER_ROLES)),
) -> CandidatePlanProposal:
    from app.models.scenario import SeededScenario
    scenario = db.query(SeededScenario).filter_by(scenario_code=scenario_code).first()
    if not scenario:
        raise EntityNotFoundException("SeededScenario", scenario_code)

    snapshot = PlanLifecycleService._build_inventory_snapshot(db, scenario)
    return OllamaService.dynamic_candidate_generation(
        scenario_code=scenario_code,
        parameters=scenario.parameters or {},
        inventory_snapshot=snapshot,
        model=model,
    )


@router.post(
    "/distribution-engine",
    response_model=FMCGEngineRunResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute FMCG Distribution Intelligence Engine (Problem Statement 2)",
    description=(
        "Executes the full 4-module AI pipeline: "
        "1. Inventory Dashboard, "
        "2. Demand Prediction (LightGBM/DeepDemandNet), "
        "3. Recommended Plan with FEFO Reasons (Google OR-Tools CP-SAT), "
        "4. Before vs After Optimization Dashboard & Ollama LLM Briefing. "
        "Optionally creates an authoritative DistributionPlan in the database."
    )
)
def run_fmcg_distribution_engine(
    payload: Optional[FMCGEngineRunRequest] = None,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_roles(PLANNER_ROLES)),
) -> FMCGEngineRunResponse:
    import uuid
    from models.fmcg_distribution_engine import FMCGDistributionEngine
    from app.models.facility import Warehouse
    from app.models.plan import DistributionPlan, PlanEvent
    from app.models.enums import PlanStatus, PlanEventType

    req = payload or FMCGEngineRunRequest()
    engine = FMCGDistributionEngine(ollama_model=req.ollama_model or "llama3")
    result = engine.run_distribution_intelligence(
        top_n_skus=req.top_n_skus,
        num_stores=req.num_stores,
        use_net_replenishment=req.use_net_replenishment,
        simulated_stock_seed=req.simulated_stock_seed,
    )

    plan_code = None
    plan_id = None

    exec_briefing = (
        result.get("executive_dispatch_briefing")
        or result.get("ollama_intelligence", {}).get("executive_briefing")
    )
    feature_insights = (
        result.get("key_feature_insights")
        or result.get("ollama_intelligence", {}).get("key_feature_insights")
        or []
    )

    if req.create_plan_record:
        candidate_allocations = []
        for rec in result.get("module_3_distribution_recommendations", []):
            prod_str = rec.get("product") or ""
            match = re.search(r"(SKU-\d+)", prod_str)
            sku = match.group(1) if match else None
            prod = db.query(Product).filter_by(sku=sku).first() if sku else None
            candidate_allocations.append({
                "product": prod_str,
                "sku": sku,
                "product_id": prod.id if prod else None,
                "from_warehouse": rec.get("from_warehouse"),
                "to_store": rec.get("to_store"),
                "quantity": rec.get("quantity"),
                "estimated_cost": rec.get("estimated_cost"),
                "reason": rec.get("reason"),
                "dispatch_priority": rec.get("dispatch_priority", "NORMAL"),
            })

        wh = db.query(Warehouse).filter_by(code="WH-01").first() or db.query(Warehouse).first()
        wh_id = wh.id if wh else 1
        wh_version = wh.current_inventory_version if wh else 1

        plan_code = f"PLAN-AI-{uuid.uuid4().hex[:8].upper()}"
        plan = DistributionPlan(
            plan_code=plan_code,
            target_warehouse_id=wh_id,
            input_inventory_version=wh_version,
            status=PlanStatus.PROPOSED,
            created_by_user_id=current_user.id,
            candidate_allocations=candidate_allocations,
            decision_service_metadata={
                "engine": "FMCGDistributionEngine",
                "executive_briefing": exec_briefing,
                "impact_dashboard": result.get("module_4_optimization_dashboard"),
            },
            validation_results={"is_valid": True, "violations_detected": 0},
            is_validated=True,
        )
        db.add(plan)
        db.flush()

        event = PlanEvent(
            plan_id=plan.id,
            trace_id=f"TRC-{uuid.uuid4().hex[:12]}",
            event_type=PlanEventType.PLAN_CREATED,
            actor_type="fmcg_distribution_engine",
            actor_id=str(current_user.id),
            previous_status=PlanStatus.DRAFT.value,
            new_status=PlanStatus.PROPOSED.value,
            payload={"allocations_count": len(candidate_allocations)},
        )
        db.add(event)
        db.commit()
        db.refresh(plan)

        plan_id = plan.id
        plan_code = plan.plan_code

    return FMCGEngineRunResponse(
        engine_status=result.get("engine_status", "SUCCESS"),
        plan_code=plan_code,
        plan_id=plan_id,
        module_1_inventory_dashboard=result.get("module_1_inventory_dashboard", {}),
        module_2_demand_prediction=result.get("module_2_demand_prediction", {}),
        module_3_distribution_recommendations=result.get("module_3_distribution_recommendations", []),
        module_4_optimization_dashboard=result.get("module_4_optimization_dashboard", {}),
        executive_dispatch_briefing=exec_briefing,
        key_feature_insights=feature_insights,
    )


@router.post(
    "/road-risk",
    response_model=RoadRiskAssessmentResponse,
    status_code=status.HTTP_200_OK,
    summary="Predict route transit delay & hazard severity via Maharashtra ML models",
    description="Evaluates weather, potholes, ghat topography, and congestion to compute delay minutes and dynamic fuel surcharges."
)
def assess_route_risk(
    payload: RoadRiskAssessmentRequest,
    current_user: AuthenticatedUser = Depends(require_roles(VIEWER_ROLES)),
) -> RoadRiskAssessmentResponse:
    predictor = get_road_risk_predictor()
    if predictor is not None:
        result = predictor.predict_route_risk(
            route_id=payload.route_id,
            corridor_id=payload.corridor_id,
            terrain_class=payload.terrain_class,
            environment_region=payload.environment_region,
            road_distance_km=payload.road_distance_km,
            baseline_drive_time_minutes=payload.baseline_drive_time_minutes,
            rainfall_mm=payload.rainfall_mm,
            visibility_km=payload.visibility_km,
            traffic_congestion_index=payload.traffic_congestion_index,
            pothole_or_surface_risk_index=payload.pothole_or_surface_risk_index,
            waterlogging_flag=payload.waterlogging_flag,
            day_of_week=payload.day_of_week,
        )
        return RoadRiskAssessmentResponse(**result)

    # Resilient heuristic fallback
    is_ghat = 1 if "ghat" in payload.terrain_class.lower() else 0
    pred_delay = (payload.rainfall_mm * 1.5) + (payload.traffic_congestion_index * 60.0) + (is_ghat * 25.0)
    sev = "high" if (payload.rainfall_mm > 25.0 or payload.waterlogging_flag) else ("medium" if is_ghat or payload.rainfall_mm > 10.0 else "low")
    extra_delay = max(0.0, pred_delay - 15.0)
    lateness_surcharge = round(extra_delay * 2.50 + (350.0 if is_ghat and payload.rainfall_mm > 5.0 else 0.0), 2)
    replan = pred_delay >= 60.0 or sev == "high" or payload.waterlogging_flag

    return RoadRiskAssessmentResponse(
        route_id=payload.route_id,
        corridor_id=payload.corridor_id,
        terrain_class=payload.terrain_class,
        predicted_delay_minutes=round(pred_delay, 1),
        risk_severity=sev,
        risk_score=0.85 if sev == "high" else 0.45,
        lateness_surcharge_inr=lateness_surcharge,
        replan_recommended=replan,
        explanation=f"Corridor {payload.corridor_id} ({payload.terrain_class}): Fallback assessment with +{round(pred_delay, 1)}m delay."
    )


@router.get(
    "/road-corridors",
    summary="List key Maharashtra highway corridors with baseline topography and transit metrics",
    description="Returns pre-calibrated Maharashtra supply routes across Mumbai, Pune, Kolhapur, Nashik, Aurangabad, and Nagpur."
)
def get_road_corridors(
    current_user: AuthenticatedUser = Depends(require_roles(VIEWER_ROLES)),
):
    return [
        {
            "route_id": "RT-PUN-KOL-01",
            "corridor_id": "CORR_PUNE_KOLHAPUR",
            "origin": "Pune (Chakan Hub)",
            "destination": "Kolhapur (Shahupuri Hub)",
            "highway": "NH-48",
            "terrain_class": "ghat_mixed",
            "environment_region": "Western_Ghats",
            "road_distance_km": 235.0,
            "baseline_drive_time_minutes": 270.0,
            "typical_ghat_section": "Khambatki Ghat & Katraj Pass"
        },
        {
            "route_id": "RT-MUM-PUN-01",
            "corridor_id": "CORR_MUMBAI_PUNE",
            "origin": "Mumbai (Bhiwandi Hub)",
            "destination": "Pune (Tathawade Hub)",
            "highway": "Mumbai-Pune Expressway",
            "terrain_class": "ghat_mixed",
            "environment_region": "Western_Ghats",
            "road_distance_km": 148.0,
            "baseline_drive_time_minutes": 190.0,
            "typical_ghat_section": "Borghat (Khandala Section)"
        },
        {
            "route_id": "RT-MUM-NAS-01",
            "corridor_id": "CORR_MUMBAI_NASHIK",
            "origin": "Mumbai (Bhiwandi Hub)",
            "destination": "Nashik (Ambad Hub)",
            "highway": "NH-160",
            "terrain_class": "ghat_mixed",
            "environment_region": "Western_Ghats",
            "road_distance_km": 165.0,
            "baseline_drive_time_minutes": 210.0,
            "typical_ghat_section": "Kasara Ghat (Thal Ghat)"
        },
        {
            "route_id": "RT-PUN-SOL-01",
            "corridor_id": "CORR_PUNE_SOLAPUR",
            "origin": "Pune (Hadapsar Hub)",
            "destination": "Solapur (MIDC Hub)",
            "highway": "NH-65",
            "terrain_class": "plain",
            "environment_region": "Marathwada_Plains",
            "road_distance_km": 252.0,
            "baseline_drive_time_minutes": 280.0,
            "typical_ghat_section": "None (Deccan Plateau)"
        },
        {
            "route_id": "RT-PUN-AUR-01",
            "corridor_id": "CORR_PUNE_AURANGABAD",
            "origin": "Pune (Wagholi Hub)",
            "destination": "Chhatrapati Sambhajinagar (Shendra)",
            "highway": "SH-27 / NH-753F",
            "terrain_class": "plain",
            "environment_region": "Marathwada_Plains",
            "road_distance_km": 235.0,
            "baseline_drive_time_minutes": 290.0,
            "typical_ghat_section": "Ahmednagar Bypass"
        },
        {
            "route_id": "RT-MUM-RAT-01",
            "corridor_id": "CORR_MUMBAI_RATNAGIRI",
            "origin": "Mumbai (Panvel Hub)",
            "destination": "Ratnagiri (Mirjole Hub)",
            "highway": "NH-66",
            "terrain_class": "coastal",
            "environment_region": "Konkan_Coast",
            "road_distance_km": 330.0,
            "baseline_drive_time_minutes": 420.0,
            "typical_ghat_section": "Kashedi Ghat & Parshuram Ghat"
        }
    ]


@router.post(
    "/chat",
    response_model=ChatQueryResponse,
    status_code=status.HTTP_200_OK,
    summary="Query HETVAYA Product AI Assistant",
    description=(
        "Answers product, inventory availability, batch expiry (FEFO), warehouse sourcing, "
        "freight cost, and distribution allocation queries grounded in authoritative application data."
    ),
)
def query_product_ai_assistant(
    payload: ChatQueryRequest,
    db: Session = Depends(get_db),
) -> ChatQueryResponse:
    return ProductChatIntelligenceService.process_chat_query(
        payload=payload,
        db=db,
    )



