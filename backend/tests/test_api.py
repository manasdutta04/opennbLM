from fastapi.testclient import TestClient

from backend.main import app


def test_health_endpoint() -> None:
    response = TestClient(app).get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_unknown_route_is_not_found() -> None:
    assert TestClient(app).get("/api/v1/missing").status_code == 404
