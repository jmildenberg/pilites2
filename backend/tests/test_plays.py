import pytest
from fastapi.testclient import TestClient


class TestListPlays:
    def test_returns_summaries(self, client: TestClient) -> None:
        resp = client.get("/plays")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["id"] == "play-1"
        assert "name" in data[0]
        assert "regions" not in data[0]


class TestGetPlay:
    def test_returns_full_play(self, client: TestClient) -> None:
        resp = client.get("/plays/play-1")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == "play-1"
        assert "regions" in data
        assert "cues" in data

    def test_not_found_returns_404(self, client: TestClient) -> None:
        resp = client.get("/plays/ghost")
        assert resp.status_code == 404


class TestCreatePlay:
    def test_create_new_play(self, client: TestClient) -> None:
        payload = {
            "id": "play-2",
            "name": "Act 2",
            "regions": [],
            "cues": [],
        }
        resp = client.post("/plays", json=payload)
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
        assert client.get("/plays/play-2").status_code == 200

    def test_overlapping_cue_regions_returns_400(self, client: TestClient) -> None:
        payload = {
            "id": "play-x",
            "name": "Bad Play",
            "regions": [
                {
                    "id": "r-a",
                    "name": "A",
                    "channelId": "ch-1",
                    "ranges": [{"start": 0, "end": 49}],
                },
                {
                    "id": "r-b",
                    "name": "B",
                    "channelId": "ch-1",
                    "ranges": [{"start": 30, "end": 79}],
                },
            ],
            "cues": [
                {
                    "id": "cue-x",
                    "name": "Conflict",
                    "effectsByRegion": {
                        "r-a": {"id": "e-1", "type": "static_color", "params": {}},
                        "r-b": {"id": "e-2", "type": "static_color", "params": {}},
                    },
                }
            ],
        }
        resp = client.post("/plays", json=payload)
        assert resp.status_code == 400

    def test_unknown_channel_id_returns_400(self, client: TestClient) -> None:
        payload = {
            "id": "play-x",
            "name": "Bad",
            "regions": [
                {
                    "id": "r-1",
                    "name": "R",
                    "channelId": "nonexistent",
                    "ranges": [{"start": 0, "end": 9}],
                }
            ],
            "cues": [],
        }
        resp = client.post("/plays", json=payload)
        assert resp.status_code == 400

    def test_non_overlapping_regions_in_same_cue_ok(self, client: TestClient) -> None:
        payload = {
            "id": "play-ok",
            "name": "Good",
            "regions": [
                {
                    "id": "r-a",
                    "name": "A",
                    "channelId": "ch-1",
                    "ranges": [{"start": 0, "end": 49}],
                },
                {
                    "id": "r-b",
                    "name": "B",
                    "channelId": "ch-1",
                    "ranges": [{"start": 50, "end": 99}],
                },
            ],
            "cues": [
                {
                    "id": "cue-1",
                    "name": "Good Cue",
                    "effectsByRegion": {
                        "r-a": {"id": "e-1", "type": "static_color", "params": {}},
                        "r-b": {"id": "e-2", "type": "static_color", "params": {}},
                    },
                }
            ],
        }
        resp = client.post("/plays", json=payload)
        assert resp.status_code == 200


class TestUpdatePlay:
    def test_update_play(self, client: TestClient) -> None:
        play = client.get("/plays/play-1").json()
        play["name"] = "Renamed"
        resp = client.put("/plays/play-1", json=play)
        assert resp.status_code == 200
        assert client.get("/plays/play-1").json()["name"] == "Renamed"

    def test_update_nonexistent_returns_404(self, client: TestClient) -> None:
        payload = {"id": "ghost", "name": "Ghost", "regions": [], "cues": []}
        resp = client.put("/plays/ghost", json=payload)
        assert resp.status_code == 404


class TestDeletePlay:
    def test_delete_play(self, client: TestClient) -> None:
        resp = client.delete("/plays/play-1")
        assert resp.status_code == 200
        assert client.get("/plays/play-1").status_code == 404

    def test_delete_nonexistent_returns_404(self, client: TestClient) -> None:
        resp = client.delete("/plays/ghost")
        assert resp.status_code == 404


class TestRegionTest:
    def test_region_test_ok(self, client: TestClient) -> None:
        resp = client.post("/plays/play-1/regions/r-1/test")
        assert resp.status_code == 200

    def test_region_test_unknown_play(self, client: TestClient) -> None:
        resp = client.post("/plays/ghost/regions/r-1/test")
        assert resp.status_code == 404

    def test_region_test_unknown_region(self, client: TestClient) -> None:
        resp = client.post("/plays/play-1/regions/ghost/test")
        assert resp.status_code == 404
