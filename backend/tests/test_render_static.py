from fastapi.testclient import TestClient

from app import main


def test_dist_index_is_served_for_single_host_deployments(tmp_path, monkeypatch) -> None:
    dist_dir = tmp_path / "dist"
    dist_dir.mkdir()
    (dist_dir / "index.html").write_text("<html><body>render ready</body></html>", encoding="utf-8")

    monkeypatch.setattr(main, "project_root", tmp_path)
    monkeypatch.setattr(main, "dist_dir", dist_dir)

    client = TestClient(main.app)
    response = client.get("/")

    assert response.status_code == 200
    assert "render ready" in response.text
