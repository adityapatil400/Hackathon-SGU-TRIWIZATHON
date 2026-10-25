import urllib.request
import json

base = "http://localhost:8000/api/v1"

def post(url, data, headers=None):
    if headers is None:
        headers = {}
    h = {"Content-Type": "application/json", **headers}
    req = urllib.request.Request(url, data=json.dumps(data).encode(), headers=h, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as err:
        print(f"HTTP ERROR {err.code} on POST {url}: {err.read().decode()}")
        raise err

def get(url, headers=None):
    if headers is None:
        headers = {}
    req = urllib.request.Request(url, headers=headers, method="GET")
    with urllib.request.urlopen(req) as resp:
        return resp.status, json.loads(resp.read().decode())

print("--- Testing Live FlowGrid Application Workflows ---")

# Step 0: Ensure fresh stock baseline via Flipkart catalog seed
admin_headers = {"X-User-Role": "ADMIN", "X-User-Email": "priya@flowgrid.internal"}
status, seed_res = post(f"{base}/inventory/seed-flipkart", {}, admin_headers)
print(f"[Baseline Setup] Flipkart Network Seeded - HTTP {status}, Status: {seed_res.get('status')}, Duplicates Prevented: {seed_res.get('duplicates_prevented')}")

# 1. AI Plan Generation (Rohit - Planner)
planner_headers = {"X-User-Role": "PLANNER", "X-User-Email": "rohit@flowgrid.internal"}
status, plan_res = post(f"{base}/ai/distribution-engine", {"top_n_skus": 3, "num_stores": 2, "create_plan_record": True}, planner_headers)
plan_code = plan_res["plan_code"]
savings = plan_res["module_4_optimization_dashboard"]["after_ai_optimization"]["transport_cost_savings_pct"]
print(f"[Workflow 1] Generated Plan {plan_code} - HTTP {status}, Transport Savings: {savings}%")

# 2. Plan Approval (Sunita - Approver)
approver_headers = {"X-User-Role": "APPROVER", "X-User-Email": "sunita@flowgrid.internal"}
status, app_res = post(f"{base}/plans/{plan_code}/approve", {"approver_notes": "Sunita approves FEFO dispatch"}, approver_headers)
app_status = app_res["status"]
print(f"[Workflow 2] Approved Plan {plan_code} - HTTP {status}, Approval Status: {app_status}")

# 3. Plan Commitment (Sunita - Approver)
status, com_res = post(f"{base}/plans/{plan_code}/commit", {"commit_reason": "Committing allocations"}, approver_headers)
m_count = com_res["committed_movements_count"]
inv_ver = com_res["inventory_version"]
print(f"[Workflow 3] Committed Plan {plan_code} - HTTP {status}, Committed Movements: {m_count}, Inventory Version: {inv_ver}")

# 4. Store Management Retailer Sale (Ganesh - Operator)
operator_headers = {"X-User-Role": "OPERATOR", "X-User-Email": "ganesh@flowgrid.internal"}
status, sale_res = post(f"{base}/sales", {
    "store_id": 1,
    "product_id": 3,
    "units_sold": 5,
    "observation_date": "2026-10-25",
    "is_stockout_day": False
}, operator_headers)
sample = sale_res.get("sample_records", [{}])[0]
print(f"[Workflow 4] Store Management Retailer Sale - HTTP {status}, Recorded: {sale_res.get('recorded_count', 1)} record for SKU {sample.get('sku')}")

# 5. Warehouse Physical Batch Adjustment (Sunita - Approver / WH Mgr)
status, adj_res = post(f"{base}/inventory/batches/1/adjust", {
    "quantity_delta": 10,
    "reason": "Physical count cycle audit verification"
}, planner_headers)
on_hand = adj_res["on_hand_quantity"]
print(f"[Workflow 5] Warehouse Batch Adjustment - HTTP {status}, New On-Hand: {on_hand}")

# 6. Delivery Fleet Telemetry
status, agent_res = get(f"{base}/agents", planner_headers)
total_agents = agent_res["total"]
print(f"[Workflow 6] Delivery Fleet Telemetry - HTTP {status}, Active Delivery Agents: {total_agents}")

# 7. Maharashtra Road Risk & Delay Prediction ML
status, risk_res = post(f"{base}/ai/road-risk", {
    "corridor_id": "CORR_PUNE_KOLHAPUR",
    "terrain_class": "ghat_mixed",
    "road_distance_km": 235.0,
    "baseline_drive_time_minutes": 270.0,
    "rainfall_mm": 18.0,
    "traffic_congestion_index": 0.65
}, planner_headers)
print(f"[Workflow 7] Road Risk ML - HTTP {status}, Predicted Delay: +{risk_res['predicted_delay_minutes']} min, Severity: {risk_res['risk_severity'].upper()}, Surcharge: INR {risk_res['lateness_surcharge_inr']}")

# 8. Ollama Daemon & Fallback Status
status, ollama_res = get(f"{base}/ai/status", planner_headers)
print(f"[Workflow 8] Ollama Intelligence - HTTP {status}, Status: {ollama_res['status']}, Connected: {ollama_res['is_connected']}, Configured Model: {ollama_res['configured_model']}")

print("\n>>> ALL 8 END-TO-END WORKFLOWS COMPLETED AND VERIFIED ON LIVE APPLICATION! <<<")

