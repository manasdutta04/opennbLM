"""Health and readiness endpoints."""

from fastapi import APIRouter, Depends

from backend.core.config import Settings, get_settings
from backend.schemas.health import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health(settings: Settings = Depends(get_settings)) -> HealthResponse:
    return HealthResponse(status="ok", service=settings.app_name, version=settings.app_version)
