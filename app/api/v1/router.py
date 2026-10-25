from fastapi import APIRouter
from app.api.routes import health
from app.api.v1.endpoints import (
    warehouses,
    stores,
    products,
    inventory,
    orders,
    scenarios,
    auth,
    plans,
    sales,
    forecasts,
    ai,
    agents,
    messages,
)

api_router = APIRouter()

# Core Domain Endpoints
api_router.include_router(auth.router)
api_router.include_router(messages.router)
api_router.include_router(plans.router)
api_router.include_router(plans.allocation_router)
api_router.include_router(plans.comparison_router)
api_router.include_router(sales.router)
api_router.include_router(forecasts.router)
api_router.include_router(ai.router)
api_router.include_router(agents.router)

api_router.include_router(warehouses.router)
api_router.include_router(stores.router)
api_router.include_router(stores.retailer_router)
api_router.include_router(products.router)

api_router.include_router(inventory.router)
api_router.include_router(orders.router)
api_router.include_router(scenarios.router)
api_router.include_router(health.router)
