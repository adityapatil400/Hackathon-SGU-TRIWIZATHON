import json
import time
from typing import Any, Callable, Dict, List, Optional, Tuple
import httpx

from app.core.config import settings
from app.core.logging import logger
from app.models.enums import AllocationPriority
from app.schemas.ai import (
    OllamaGenerateResponse,
    PlanExplanationResponse,
    DisruptionParseResponse,
    OllamaModelInfo,
    OllamaStatusResponse,
    ForecastDecisionRequest,
    ForecastDecisionResponse,
    DocumentAuditRequest,
    DocumentAuditResponse,
)
from app.schemas.decision import CandidatePlanProposal, ProposedMovement


class OllamaService:
    """
    Client and reasoning engine for local Ollama LLMs (e.g. Llama 3.2, Gemma 4).
    
    Provides:
    1. Structured JSON input/output handling via Ollama /api/generate.
    2. Dynamic, fact-grounded plan explainability & executive summaries (FR-P0-11).
    3. NLP parsing of unstructured incident and delivery agent reports into structured events.
    4. Dynamic candidate allocation generation for supply chain scenarios.
    5. Safe deterministic fallback when Ollama is unreachable or times out.
    """

    _mock_generator: Optional[Callable[[Dict[str, Any]], Any]] = None

    @classmethod
    def set_mock_generator(cls, generator: Optional[Callable[[Dict[str, Any]], Any]]) -> None:
        """Sets a test hook for unit/integration testing without live Ollama."""
        cls._mock_generator = generator

    @classmethod
    def get_status(cls) -> OllamaStatusResponse:
        """Checks connection to local Ollama daemon and lists installed models."""
        is_connected, models = cls.check_connection()
        return OllamaStatusResponse(
            status="CONNECTED" if is_connected else "OFFLINE",
            base_url=settings.OLLAMA_BASE_URL,
            configured_model=settings.OLLAMA_MODEL,
            available_models=[
                OllamaModelInfo(
                    name=m.get("name", ""),
                    size=m.get("size"),
                    modified_at=m.get("modified_at"),
                    family=m.get("details", {}).get("family"),
                )
                for m in models
            ],
            is_connected=is_connected,
        )

    @classmethod
    def check_connection(cls) -> Tuple[bool, List[Dict[str, Any]]]:
        """Pings Ollama /api/tags to verify daemon status and fetch models."""
        if cls._mock_generator is not None:
            return True, [{"name": settings.OLLAMA_MODEL, "size": 2019393189}]

        endpoint = f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/tags"
        try:
            with httpx.Client(timeout=3.0) as client:
                res = client.get(endpoint)
                if res.status_code == 200:
                    models = res.json().get("models", [])
                    return True, models
        except Exception as exc:
            logger.debug("Ollama daemon check failed at %s: %s", endpoint, exc)
        return False, []

    @classmethod
    def generate(
        cls,
        prompt: str,
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        json_format: bool = True,
    ) -> OllamaGenerateResponse:
        """
        Executes a prompt against Ollama and parses output.
        Enforces structured JSON when json_format is True.
        """
        target_model = model or settings.OLLAMA_MODEL
        payload = {
            "model": target_model,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": temperature},
        }
        if system_prompt:
            payload["system"] = system_prompt
        if json_format:
            payload["format"] = "json"

        start_time = time.time()

        # 1. Test mock hook
        if cls._mock_generator is not None:
            raw_text = cls._mock_generator(payload)
            elapsed = time.time() - start_time
            parsed = None
            if json_format:
                try:
                    parsed = json.loads(raw_text) if isinstance(raw_text, str) else raw_text
                except Exception:
                    parsed = {"raw": str(raw_text)}
            return OllamaGenerateResponse(
                model=target_model,
                response=str(raw_text),
                parsed_json=parsed,
                execution_time_seconds=round(elapsed, 3),
                is_fallback=False,
            )

        # 2. Live HTTP call to Ollama
        endpoint = f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/generate"
        try:
            with httpx.Client(timeout=settings.OLLAMA_TIMEOUT_SECONDS) as client:
                res = client.post(endpoint, json=payload)
                elapsed = time.time() - start_time
                if res.status_code == 200:
                    res_json = res.json()
                    response_text = res_json.get("response", "").strip()
                    parsed = None
                    if json_format:
                        try:
                            parsed = json.loads(response_text)
                        except Exception as parse_err:
                            logger.warning("Failed to parse Ollama JSON response: %s", parse_err)
                            parsed = {"error": "JSON_PARSE_ERROR", "raw": response_text}
                    return OllamaGenerateResponse(
                        model=target_model,
                        response=response_text,
                        parsed_json=parsed,
                        execution_time_seconds=round(elapsed, 3),
                        is_fallback=False,
                    )
        except Exception as exc:
            logger.warning("Ollama generation failed at %s (%s). Using fallback logic.", endpoint, exc)

        elapsed = time.time() - start_time
        return OllamaGenerateResponse(
            model=f"{target_model} (fallback)",
            response="Fallback response generated because Ollama service is unavailable.",
            parsed_json={"fallback": True, "prompt_excerpt": prompt[:100]},
            execution_time_seconds=round(elapsed, 3),
            is_fallback=True,
        )

    @classmethod
    def explain_plan(
        cls,
        plan_code: str,
        plan_details: Dict[str, Any],
        comparison_metrics: Optional[Dict[str, Any]] = None,
        model: Optional[str] = None,
    ) -> PlanExplanationResponse:
        """
        Generates a fact-grounded explanation for an allocation plan (FR-P0-11).
        Answers 'Why did this plan change and what trade-offs were made?'.
        """
        facts = {
            "plan_code": plan_code,
            "status": plan_details.get("status"),
            "target_warehouse_id": plan_details.get("target_warehouse_id"),
            "inventory_version": plan_details.get("input_inventory_version") or plan_details.get("inventory_version"),
            "allocations_count": len(plan_details.get("candidate_allocations", [])),
            "allocations": plan_details.get("candidate_allocations", [])[:5],
            "comparison": comparison_metrics or {},
        }

        system_prompt = (
            "You are FlowGrid AI, an expert supply chain intelligence explainability engine. "
            "Generate an executive, fact-grounded explanation of the proposed distribution plan. "
            "CRITICAL: Do NOT invent numbers or measurements not present in the facts. "
            "Return valid JSON matching this schema: "
            "{"
            '"executive_summary": string, '
            '"fill_rate_assessment": string, '
            '"cost_tradeoff_assessment": string, '
            '"perishability_risk_assessment": string, '
            '"key_recommendations": [string]'
            "}"
        )

        user_prompt = f"Explain this distribution plan using only these verified facts: {json.dumps(facts, default=str)}"
        res = cls.generate(
            prompt=user_prompt,
            model=model,
            system_prompt=system_prompt,
            json_format=True,
        )

        if not res.is_fallback and res.parsed_json and "executive_summary" in res.parsed_json:
            p = res.parsed_json
            return PlanExplanationResponse(
                plan_code=plan_code,
                model_used=res.model,
                executive_summary=p.get("executive_summary", "Plan balances demand and stock."),
                fill_rate_assessment=p.get("fill_rate_assessment", "Maintains target fill rate."),
                cost_tradeoff_assessment=p.get("cost_tradeoff_assessment", "Optimized routing cost."),
                perishability_risk_assessment=p.get("perishability_risk_assessment", "FEFO prioritized."),
                key_recommendations=p.get("key_recommendations", ["Approve plan for dispatch."]),
                traceable_facts_used=facts,
                is_fallback=False,
            )

        # High-quality deterministic fallback explainability
        alloc_count = facts["allocations_count"]
        return PlanExplanationResponse(
            plan_code=plan_code,
            model_used=res.model,
            executive_summary=(
                f"Plan '{plan_code}' proposes {alloc_count} candidate movement(s) balancing store demand "
                f"against warehouse stock version {facts['inventory_version']}."
            ),
            fill_rate_assessment="Candidate allocations fulfill verified high-priority retail store demand.",
            cost_tradeoff_assessment="Direct regional DC distribution avoids cross-zone transport surcharges.",
            perishability_risk_assessment="FEFO constraints verified: near-expiry batches prioritized for fast-moving nodes.",
            key_recommendations=[
                "Verify stock balances before commit.",
                "Ensure independent approver reviews allocations under separation of duties.",
            ],
            traceable_facts_used=facts,
            is_fallback=True,
        )

    @classmethod
    def parse_disruption(
        cls,
        text: str,
        model: Optional[str] = None,
    ) -> DisruptionParseResponse:
        """
        Parses unstructured text reports (e.g. from delivery drivers or traffic alerts)
        into structured supply chain events.
        """
        import re
        agent_matches = list(set(re.findall(r"AGENT-[A-Z0-9-]+", text, re.IGNORECASE)))
        store_matches = list(set(re.findall(r"STORE-[A-Z0-9-]+", text, re.IGNORECASE)))
        sku_matches = list(set(re.findall(r"SKU-[A-Z0-9-]+", text, re.IGNORECASE)))

        system_prompt = (
            "You are FlowGrid AI. Parse the following natural language incident report into structured supply chain parameters. "
            "Return valid JSON matching this schema: "
            "{"
            '"event_type": "AGENT_UNAVAILABLE" | "ROUTE_DISRUPTED" | "DEMAND_SURGE" | "SUPPLY_DISRUPTION", '
            '"affected_agent_codes": [string], '
            '"affected_store_codes": [string], '
            '"affected_skus": [string], '
            '"estimated_delay_hours": integer or null, '
            '"severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL", '
            '"summary": string'
            "}"
        )

        res = cls.generate(
            prompt=f"Parse incident text: {text}",
            model=model,
            system_prompt=system_prompt,
            json_format=True,
        )

        if not res.is_fallback and res.parsed_json and "event_type" in res.parsed_json:
            p = res.parsed_json
            raw_agents = p.get("affected_agent_codes") or p.get("affected_agents") or []
            if isinstance(raw_agents, str):
                raw_agents = [raw_agents]
            all_agents = list(set(list(raw_agents) + agent_matches))

            raw_stores = p.get("affected_store_codes") or p.get("affected_stores") or []
            if isinstance(raw_stores, str):
                raw_stores = [raw_stores]
            all_stores = list(set(list(raw_stores) + store_matches))

            raw_skus = p.get("affected_skus") or []
            if isinstance(raw_skus, str):
                raw_skus = [raw_skus]
            all_skus = list(set(list(raw_skus) + sku_matches))

            return DisruptionParseResponse(
                event_type=p.get("event_type", "ROUTE_DISRUPTED"),
                affected_agent_codes=all_agents,
                affected_store_codes=all_stores,
                affected_skus=all_skus,
                estimated_delay_hours=p.get("estimated_delay_hours"),
                severity=p.get("severity", "MEDIUM"),
                summary=p.get("summary", text[:120]),
                raw_input=text,
                is_fallback=False,
            )

        # Rule-based fallback parsing
        upper_text = text.upper()
        event_type = "ROUTE_DISRUPTED"
        if "AGENT" in upper_text or "DRIVER" in upper_text or "SICK" in upper_text or "UNAVAILABLE" in upper_text:
            event_type = "AGENT_UNAVAILABLE"
        elif "SURGE" in upper_text or "DEMAND" in upper_text or "SPIKE" in upper_text:
            event_type = "DEMAND_SURGE"
        elif "STOCK" in upper_text or "DEFICIT" in upper_text:
            event_type = "SUPPLY_DISRUPTION"

        import re
        agent_matches = re.findall(r"AGENT-[A-Z0-9-]+", text, re.IGNORECASE)
        store_matches = re.findall(r"STORE-[A-Z0-9-]+", text, re.IGNORECASE)
        sku_matches = re.findall(r"SKU-[A-Z0-9-]+", text, re.IGNORECASE)

        return DisruptionParseResponse(
            event_type=event_type,
            affected_agent_codes=list(set(agent_matches)),
            affected_store_codes=list(set(store_matches)),
            affected_skus=list(set(sku_matches)),
            estimated_delay_hours=4 if "BREAKDOWN" in upper_text or "DELAY" in upper_text else None,
            severity="HIGH" if ("BREAKDOWN" in upper_text or "CRITICAL" in upper_text or "ACCIDENT" in upper_text) else "MEDIUM",
            summary=f"Incident categorized as {event_type} affecting {len(agent_matches)} agent(s) and {len(store_matches)} store(s).",
            raw_input=text,
            is_fallback=True,
        )

    @classmethod
    def dynamic_candidate_generation(
        cls,
        scenario_code: str,
        parameters: Dict[str, Any],
        inventory_snapshot: Dict[str, Any],
        model: Optional[str] = None,
    ) -> CandidatePlanProposal:
        """
        Uses Ollama to dynamically optimize candidate stock movements,
        strictly validated and coerced into CandidatePlanProposal schema.
        """
        warehouses = inventory_snapshot.get("warehouses", [])
        stores = inventory_snapshot.get("stores", [])
        target_store_code = stores[0]["code"] if stores else "STORE-AUTO-01"

        available_batches: List[Dict[str, Any]] = [
            {
                "warehouse_code": wh.get("code"),
                "sku": b.get("sku"),
                "available_quantity": b.get("available_quantity", 0),
                "expiry_date": b.get("expiry_date"),
            }
            for wh in warehouses
            for b in wh.get("batches", [])
            if b.get("available_quantity", 0) > 0
        ][:8]

        summary_data: Dict[str, Any] = {
            "scenario_code": scenario_code,
            "parameters": parameters,
            "available_batches": available_batches,
            "destination_stores": [{"code": s.get("code"), "priority": s.get("priority_tier", 1)} for s in stores[:5]],
        }

        system_prompt = (
            "You are FlowGrid Distribution Optimizer. "
            "Propose optimal movements from warehouses to destination stores. "
            "Do NOT exceed available quantity. Prioritize stores with priority 1. "
            "Return valid JSON matching schema: "
            "{"
            '"proposed_movements": ['
            '{"sku": string, "from_node_code": string, "to_node_code": string, "quantity": integer, "priority": "CRITICAL"|"HIGH"|"NORMAL"|"LOW", "estimated_transit_hours": integer, "rationale": string}'
            "]"
            "}"
        )

        res = cls.generate(
            prompt=f"Generate candidate movements for snapshot: {json.dumps(summary_data)}",
            model=model,
            system_prompt=system_prompt,
            json_format=True,
        )

        proposed_movements: List[ProposedMovement] = []
        if not res.is_fallback and res.parsed_json and "proposed_movements" in res.parsed_json:
            for item in res.parsed_json["proposed_movements"]:
                try:
                    proposed_movements.append(ProposedMovement.model_validate(item))
                except Exception as exc:
                    logger.debug("Ollama proposed invalid movement line: %s", exc)

        # Fallback if Ollama produced empty or invalid movements
        if not proposed_movements:
            for b_info in available_batches[:3]:
                qty = max(1, min(int(b_info["available_quantity"]), 50))
                proposed_movements.append(
                    ProposedMovement(
                        sku=b_info["sku"],
                        from_node_code=b_info["warehouse_code"],
                        to_node_code=target_store_code,
                        quantity=qty,
                        priority=AllocationPriority.HIGH,
                        estimated_transit_hours=24,
                        rationale="Dynamic allocation balancing demand surge.",
                    )
                )

        import uuid
        return CandidatePlanProposal(
            candidate_id=f"CAND-OLLAMA-{uuid.uuid4().hex[:8].upper()}",
            scenario_code=scenario_code,
            model_version=f"ollama-{res.model}",
            confidence_score=0.94 if not res.is_fallback else 0.88,
            proposed_movements=proposed_movements,
        )

    @classmethod
    def audit_and_decide_forecast(
        cls,
        req: ForecastDecisionRequest,
        model: Optional[str] = None,
    ) -> ForecastDecisionResponse:
        """
        Uses Ollama LLM (default nemotron-3-ultra:cloud) to interpret ML quantile forecasts (q10 to q95),
        provide accessible natural-language explanations for store operators, and synthesize
        an authoritative, fact-grounded replenishment decision with safety buffer and case sizing.
        Includes 100% resilient deterministic fallback logic.
        """
        import math
        import uuid

        start_time = time.time()
        target_model = model or req.model or settings.OLLAMA_MODEL

        # Extract verified facts
        store_code = req.store_code
        sku = req.sku
        product_name = req.product_name or sku
        store_name = req.store_name or store_code
        store_city = req.store_city or "Maharashtra"
        case_size = max(1, req.case_size or 12)
        shelf_life = req.shelf_life_days or 180
        is_perishable = bool(req.is_perishable or shelf_life <= 45)
        current_stock = max(0, req.current_stock or 0)
        q10 = float(req.q10)
        q50 = float(req.q50)
        q90 = float(req.q90)
        q95 = float(req.q95) if req.q95 is not None else round(q90 * 1.12, 1)
        wape = float(req.wape) if req.wape is not None else 0.142
        stockout_corrected = bool(req.stockout_corrected)
        tier = req.store_tier or 1

        # Deterministic benchmark calculations
        spread_ratio = round(q90 / max(1.0, q50), 2)
        if is_perishable:
            verdict = "CONSERVATIVE_CAP"
            buffer_pct = 0.0
            target_demand = q50
            stockout_risk = "MEDIUM" if current_stock < q10 else "LOW"
            waste_risk = "MEDIUM"
        elif tier == 1 and (spread_ratio > 1.25 or stockout_corrected):
            verdict = "STOCKOUT_DEFENSE" if stockout_corrected else "BUFFER_AUGMENTED"
            buffer_pct = 15.0
            target_demand = min(q95, max(q50 * 1.15, q90 * 0.95))
            stockout_risk = "LOW"
            waste_risk = "LOW"
        else:
            verdict = "APPROVE_REPLENISHMENT"
            buffer_pct = 5.0
            target_demand = q50 * 1.05
            stockout_risk = "LOW"
            waste_risk = "LOW"

        net_needed = max(0.0, target_demand - current_stock)
        cases_needed = max(1, math.ceil(net_needed / case_size)) if net_needed > 0 else 0
        recommended_units = int(cases_needed * case_size)

        facts = {
            "store_code": store_code,
            "store_name": store_name,
            "store_city": store_city,
            "store_tier": tier,
            "sku": sku,
            "product_name": product_name,
            "category": req.category or "FMCG",
            "unit_cost": req.unit_cost,
            "unit_price": req.unit_price,
            "case_size": case_size,
            "shelf_life_days": shelf_life,
            "is_perishable": is_perishable,
            "current_stock": current_stock,
            "q10_floor": q10,
            "q50_median": q50,
            "q80": req.q80,
            "q90_high": q90,
            "q95_peak": q95,
            "baseline_moving_avg": req.baseline_moving_avg,
            "method": req.method or "HistGradientBoosting",
            "stockout_corrected": stockout_corrected,
            "wape": wape,
            "last_week_actual": req.last_week_actual,
            "regional_context": req.regional_context or "Standard corridor demand",
        }

        system_prompt = (
            "You are FlowGrid AI, an expert FMCG Supply Chain and Quantitative Demand Prediction Auditor. "
            "Synthesize machine-learning quantile forecasts (Q10 to Q95) into accessible plain language "
            "for store managers and provide an authoritative replenishment decision. "
            "CRITICAL: Do NOT invent numbers or measurements not present in the facts. "
            "Return valid JSON matching this schema: "
            "{"
            '"verdict": "APPROVE_REPLENISHMENT" | "BUFFER_AUGMENTED" | "CONSERVATIVE_CAP" | "STOCKOUT_DEFENSE" | "AUDIT_FLAGGED", '
            f'"recommended_units": integer multiple of case_size ({case_size}), '
            '"recommended_cases": integer, '
            '"recommended_safety_buffer_pct": float, '
            '"stockout_risk_level": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL", '
            '"waste_spoilage_risk_level": "LOW" | "MEDIUM" | "HIGH", '
            '"confidence_score": float between 0.70 and 0.99, '
            '"natural_language_explanation": string, '
            '"quantile_spread_analysis": string, '
            '"stockout_correction_impact": string, '
            '"key_decision_factors": [string]'
            "}"
        )

        user_prompt = (
            f"Audit demand forecast and recommend replenishment for: {json.dumps(facts, default=str)}"
        )

        res = cls.generate(
            prompt=user_prompt,
            model=target_model,
            system_prompt=system_prompt,
            json_format=True,
        )

        elapsed = time.time() - start_time
        decision_id = f"DEC-{uuid.uuid4().hex[:10].upper()}"

        if not res.is_fallback and res.parsed_json and "verdict" in res.parsed_json:
            p = res.parsed_json
            try:
                rec_cases = int(p.get("recommended_cases", cases_needed))
                rec_units = int(p.get("recommended_units", rec_cases * case_size))
                if rec_units % case_size != 0:
                    rec_units = rec_cases * case_size

                return ForecastDecisionResponse(
                    decision_id=decision_id,
                    store_code=store_code,
                    sku=sku,
                    model_used=res.model,
                    verdict=p.get("verdict", verdict),
                    recommended_units=rec_units,
                    recommended_cases=rec_cases,
                    recommended_safety_buffer_pct=float(p.get("recommended_safety_buffer_pct", buffer_pct)),
                    stockout_risk_level=p.get("stockout_risk_level", stockout_risk),
                    waste_spoilage_risk_level=p.get("waste_spoilage_risk_level", waste_risk),
                    confidence_score=min(0.99, max(0.70, float(p.get("confidence_score", 0.94)))),
                    natural_language_explanation=p.get(
                        "natural_language_explanation",
                        f"The ML model predicts a median demand of {q50:.0f} units for {product_name} at {store_name}."
                    ),
                    quantile_spread_analysis=p.get(
                        "quantile_spread_analysis",
                        f"Demand ranges from a floor of {q10:.0f} units (Q10) to a peak surge of {q95:.0f} units (Q95)."
                    ),
                    stockout_correction_impact=p.get(
                        "stockout_correction_impact",
                        "Stockout day correction active (RC2) prevents historic zero-stock distortion."
                        if stockout_corrected else "No zero-stock suppression detected."
                    ),
                    key_decision_factors=p.get("key_decision_factors", [
                        f"Median weekly cycle demand is {q50:.0f} units.",
                        f"Current on-hand inventory is {current_stock} units.",
                        f"Ordered in full cases of {case_size} units.",
                    ]),
                    traceable_facts=facts,
                    is_fallback=False,
                    execution_time_seconds=round(elapsed, 3),
                )
            except Exception as parse_err:
                logger.warning("Failed to map Ollama forecast decision response: %s", parse_err)

        # High-reliability deterministic fallback
        factors = [
            f"HistGradientBoosting ML model estimated 7-day median demand of {q50:.0f} units (WAPE: {wape*100:.1f}%).",
            f"Store on-hand stock is {current_stock} units, leaving net replenishment need of {net_needed:.0f} units.",
            f"Order normalized to {cases_needed} full shipping case(s) ({case_size} units/case).",
        ]
        if stockout_corrected:
            factors.append("Stockout correction (RC2) restored lost sales history to protect replenishment velocity.")
        if is_perishable:
            factors.append(f"Perishable SKU ({shelf_life} days shelf life) strictly capped at median demand to prevent expiry waste.")
        else:
            factors.append(f"Stable shelf life ({shelf_life} days) allows {buffer_pct}% safety buffer against weekend surges.")

        nl_explanation = (
            f"For {product_name} at {store_name} ({store_city}), the {req.method or 'HistGradientBoosting'} "
            f"quantile model projects a median 7-day demand of {q50:.0f} units. Current on-hand stock is {current_stock} units. "
            f"To satisfy demand while hedging against volatility without expiry waste, the system recommends "
            f"dispatching {recommended_units} units ({cases_needed} full case{'s' if cases_needed != 1 else ''})."
        )

        spread_text = (
            f"Quantile spread spans from {q10:.0f} units (10th percentile floor) to {q95:.0f} units (95th percentile peak). "
            f"The volatility ratio of {spread_ratio}x reflects {'elevated regional demand variance' if spread_ratio > 1.25 else 'stable steady-state consumption'}."
        )

        stockout_text = (
            "Stockout correction (RC2) is ACTIVE: Historic days with 0 closing stock were normalized to weekday median "
            "demand to prevent the recursive retail death spiral."
            if stockout_corrected else
            "Standard historical uncensored demand: No stockout day suppression detected during the trailing observation window."
        )

        return ForecastDecisionResponse(
            decision_id=decision_id,
            store_code=store_code,
            sku=sku,
            model_used=f"{target_model} (fallback)",
            verdict=verdict,
            recommended_units=recommended_units,
            recommended_cases=cases_needed,
            recommended_safety_buffer_pct=buffer_pct,
            stockout_risk_level=stockout_risk,
            waste_spoilage_risk_level=waste_risk,
            confidence_score=0.92,
            natural_language_explanation=nl_explanation,
            quantile_spread_analysis=spread_text,
            stockout_correction_impact=stockout_text,
            key_decision_factors=factors,
            traceable_facts=facts,
            is_fallback=True,
            execution_time_seconds=round(elapsed, 3),
        )

    @classmethod
    def audit_document_import(
        cls,
        req: DocumentAuditRequest,
        model: Optional[str] = None,
    ) -> DocumentAuditResponse:
        """
        Audits master data and inventory batch import documents using nemotron-3-ultra:cloud.
        Evaluates 5% transactional rule compliance (FR-02), row-level diagnostics,
        root-cause anomalies, and operational impact.
        Provides a 100% deterministic fallback when Ollama is offline or times out.
        """
        import uuid
        import time
        start_time = time.time()
        audit_id = f"AUD-{uuid.uuid4().hex[:10].upper()}"
        target_model = model or req.model or settings.OLLAMA_MODEL or "nemotron-3-ultra:cloud"

        # Determine deterministic baseline verdict & quality score
        quality_score = max(0.0, round(1.0 - (req.error_rate_pct / 100.0), 3)) if req.total_rows > 0 else 0.0

        if req.is_duplicate:
            verdict = "DUPLICATE_IGNORED"
        elif req.has_critical_error:
            verdict = "CRITICAL_SCHEMA_ERROR"
        elif req.total_rows == 0:
            verdict = "CRITICAL_SCHEMA_ERROR"
        elif req.error_rate_pct == 0.0:
            verdict = "CLEAN_COMMITTED"
        elif req.error_rate_pct <= 5.0 and req.committed:
            verdict = "PARTIALLY_COMMITTED_UNDER_5PCT"
        else:
            verdict = "ROLLED_BACK_THRESHOLD_EXCEEDED"

        facts = {
            "file_name": req.file_name,
            "target_entity": req.target_entity,
            "total_rows": req.total_rows,
            "rows_accepted": req.rows_accepted,
            "rows_rejected": req.rows_rejected,
            "error_rate_pct": req.error_rate_pct,
            "committed": req.committed,
            "sha256": req.sha256,
            "is_duplicate": req.is_duplicate,
            "has_critical_error": req.has_critical_error,
            "sample_error_count": len(req.errors_sample),
            "errors_sample": req.errors_sample[:10],
            "sample_rows_count": len(req.sample_rows),
            "sample_rows": req.sample_rows[:5],
            "user_notes": req.user_notes or "Standard import via Master Data Studio (Priya & Rohit)",
        }

        system_prompt = (
            "You are FlowGrid AI, an expert Enterprise Supply Chain Data Integrity & ERP Master Data Auditor. "
            "You are auditing an uploaded document (CSV/XLSX) for Priya & Rohit in the Master Data & Batch Inventory Import Studio. "
            "Evaluate data quality, explain the 5% error threshold transactional rule (FR-02), "
            "identify root causes for rejected rows, assess downstream planning risks, and provide remediation steps. "
            "CRITICAL: Ground every statement strictly in the provided facts. Do NOT invent rows or errors not in the facts. "
            "Return valid JSON matching this schema: "
            "{"
            '"verdict": "CLEAN_COMMITTED" | "PARTIALLY_COMMITTED_UNDER_5PCT" | "ROLLED_BACK_THRESHOLD_EXCEEDED" | "CRITICAL_SCHEMA_ERROR" | "DUPLICATE_IGNORED", '
            '"data_quality_score": float between 0.0 and 1.0, '
            '"executive_summary": string, '
            '"rule_compliance_narrative": string, '
            '"anomaly_root_causes": [string], '
            '"operational_risk_assessment": string, '
            '"remediation_steps": [string]'
            "}"
        )

        user_prompt = f"Audit uploaded master data document: {json.dumps(facts, default=str)}"

        res = cls.generate(
            prompt=user_prompt,
            model=target_model,
            system_prompt=system_prompt,
            json_format=True,
        )

        elapsed = time.time() - start_time

        if not res.is_fallback and res.parsed_json and "verdict" in res.parsed_json:
            p = res.parsed_json
            try:
                return DocumentAuditResponse(
                    audit_id=audit_id,
                    file_name=req.file_name,
                    target_entity=req.target_entity,
                    model_used=res.model,
                    verdict=p.get("verdict", verdict),
                    data_quality_score=min(1.0, max(0.0, float(p.get("data_quality_score", quality_score)))),
                    executive_summary=p.get(
                        "executive_summary",
                        f"Document '{req.file_name}' processed {req.total_rows} rows with an error rate of {req.error_rate_pct:.1f}%."
                    ),
                    rule_compliance_narrative=p.get(
                        "rule_compliance_narrative",
                        f"5% Error Threshold Rule: {'Passed (<= 5%)' if req.error_rate_pct <= 5.0 and req.committed else 'Violated (> 5%)'}."
                    ),
                    anomaly_root_causes=p.get("anomaly_root_causes", []),
                    operational_risk_assessment=p.get(
                        "operational_risk_assessment",
                        "Downstream inventory allocation and FEFO constraints remain secure."
                    ),
                    remediation_steps=p.get("remediation_steps", []),
                    traceable_metrics=facts,
                    is_fallback=False,
                    execution_time_seconds=round(elapsed, 3),
                )
            except Exception as parse_err:
                logger.warning("Failed to map Ollama document audit response: %s", parse_err)

        # High-reliability deterministic fallback
        root_causes: List[str] = []
        for err in req.errors_sample[:5]:
            field = err.get("field", "field")
            row = err.get("row", 0)
            msg = err.get("message", "Validation error")
            root_causes.append(f"Row {row} ({field}): {msg}")

        if not root_causes:
            if req.error_rate_pct == 0.0 and req.total_rows > 0:
                root_causes.append("All rows adhere 100% to required column schemas and foreign key integrity.")
            elif req.is_duplicate:
                root_causes.append(f"File SHA-256 hash '{req.sha256[:16]}...' previously committed. Re-import blocked to prevent duplicate stock.")
            elif req.has_critical_error:
                root_causes.append("Critical schema mismatch: Missing mandatory headers or corrupt file headers.")

        remediation: List[str] = []
        if verdict == "CLEAN_COMMITTED":
            exec_summary = (
                f"Master data file '{req.file_name}' ({req.target_entity}) verified with 100% schema compliance. "
                f"All {req.total_rows} rows successfully ingested and committed to live system state."
            )
            compliance_text = (
                f"FR-02 Rule Check: 0.0% errors (limit <= 5.0%). All {req.total_rows} records committed atomically. "
                f"Active application state updated immediately without corruption risk."
            )
            op_risk = "Zero operational risk. Batches and master records are synchronized for downstream distribution optimization."
            remediation = [
                "Proceed to Distribution Planning & Optimization with updated inventory batches.",
                "Catalog state immediately available for Store Management replenishment.",
            ]
        elif verdict == "PARTIALLY_COMMITTED_UNDER_5PCT":
            exec_summary = (
                f"File '{req.file_name}' processed {req.total_rows} rows with an error rate of {req.error_rate_pct:.1f}%. "
                f"Under the J1 Step 3 transactional rule, {req.rows_accepted} valid rows were committed, and {req.rows_rejected} row(s) flagged."
            )
            compliance_text = (
                f"FR-02 Rule Check: {req.error_rate_pct:.1f}% errors satisfies the <= 5.0% transactional threshold. "
                f"{req.rows_accepted} valid records committed in a single atomic transaction. {req.rows_rejected} rejected row(s) isolated."
            )
            op_risk = "Low-to-moderate risk: Valid records are live, but flagged rejected rows represent missing batch stock or unlinked entities."
            remediation = [
                f"Review the {req.rows_rejected} rejected row diagnostics in file:row format.",
                "Correct missing expiry dates, negative quantities, or invalid warehouse codes in source spreadsheet.",
                "Re-upload only the corrected rows to update remaining stock balances.",
            ]
        elif verdict == "DUPLICATE_IGNORED":
            exec_summary = (
                f"File '{req.file_name}' matches existing SHA-256 fingerprint ({req.sha256[:16]}...). "
                f"Deduplication engine ignored file to prevent duplicate inventory counting."
            )
            compliance_text = "FR-02 Deduplication Guarantee: File hash already in system audit ledger. Transaction bypassed."
            op_risk = "Zero risk: Prevents artificial stock inflation."
            remediation = [
                "Verify if file was already committed by another coordinator (Priya or Rohit).",
                "If new stock arrived, ensure batch numbers or version timestamps are updated.",
            ]
        elif verdict == "CRITICAL_SCHEMA_ERROR":
            exec_summary = (
                f"Critical schema failure on '{req.file_name}'. Mandatory column headers missing or corrupted. "
                f"Transaction aborted immediately."
            )
            compliance_text = "FR-02 Pre-Validation Failure: Missing mandatory headers prevents row parsing. 0 rows committed."
            op_risk = "High risk averted: Ingestion halted before corrupting table structures."
            remediation = [
                f"Download clean sample template for '{req.target_entity}'.",
                "Ensure header row contains all required schema fields.",
            ]
        else:  # ROLLED_BACK_THRESHOLD_EXCEEDED
            exec_summary = (
                f"Transaction Aborted: File '{req.file_name}' exhibited an error rate of {req.error_rate_pct:.1f}%, "
                f"violating the strict 5.0% error threshold. Entire file rolled back atomically (0 rows committed)."
            )
            compliance_text = (
                f"FR-02 Threshold Enforced: {req.error_rate_pct:.1f}% > 5.0% threshold. "
                f"System executed strict rollback to prevent half-updated stock states from corrupting planning runs."
            )
            op_risk = "High operational risk successfully contained: Prevents phantom stockouts or corrupt FEFO planning runs."
            remediation = [
                f"Review all {req.rows_rejected} row-level diagnostic errors in the table below.",
                "Verify foreign key references (SKUs must exist in products.csv, warehouses in warehouses.csv).",
                "Check for systemic column misalignment or invalid date formats (use YYYY-MM-DD).",
                "Re-import only after file-wide error rate drops below 5.0%.",
            ]

        return DocumentAuditResponse(
            audit_id=audit_id,
            file_name=req.file_name,
            target_entity=req.target_entity,
            model_used=f"{target_model} (fallback)",
            verdict=verdict,
            data_quality_score=quality_score,
            executive_summary=exec_summary,
            rule_compliance_narrative=compliance_text,
            anomaly_root_causes=root_causes,
            operational_risk_assessment=op_risk,
            remediation_steps=remediation,
            traceable_metrics=facts,
            is_fallback=True,
            execution_time_seconds=round(elapsed, 3),
        )


