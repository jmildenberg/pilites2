from fastapi.testclient import TestClient


class TestListChannels:
    def test_returns_channels(self, client: TestClient) -> None:
        resp = client.get("/channels")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["id"] == "ch-1"

    def test_empty_returns_list(self, client: TestClient) -> None:
        client.app.state.storage.save_channels([])
        resp = client.get("/channels")
        assert resp.status_code == 200
        assert resp.json() == []


class TestUpsertChannel:
    def test_create_new_channel(self, client: TestClient) -> None:
        payload = {
            "id": "ch-2",
            "name": "Balcony",
            "gpioPin": 19,
            "ledCount": 200,
            "ledType": "ws281x",
            "colorOrder": "GRB",
        }
        resp = client.post("/channels", json=payload)
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
        channels = client.get("/channels").json()
        ids = {c["id"] for c in channels}
        assert "ch-2" in ids

    def test_upsert_replaces_existing(self, client: TestClient) -> None:
        payload = {
            "id": "ch-1",
            "name": "Updated",
            "gpioPin": 18,
            "ledCount": 50,
            "ledType": "ws281x",
            "colorOrder": "RGB",
        }
        resp = client.post("/channels", json=payload)
        assert resp.status_code == 200
        channels = client.get("/channels").json()
        ch1 = next(c for c in channels if c["id"] == "ch-1")
        assert ch1["name"] == "Updated"
        assert ch1["ledCount"] == 50

    def test_invalid_gpio_returns_422(self, client: TestClient) -> None:
        payload = {
            "id": "ch-x",
            "name": "Bad",
            "gpioPin": 99,
            "ledCount": 10,
            "ledType": "ws281x",
            "colorOrder": "RGB",
        }
        resp = client.post("/channels", json=payload)
        assert resp.status_code == 422

    def test_invalid_color_order_returns_422(self, client: TestClient) -> None:
        payload = {
            "id": "ch-x",
            "name": "Bad",
            "gpioPin": 18,
            "ledCount": 10,
            "ledType": "ws281x",
            "colorOrder": "BGR",
        }
        resp = client.post("/channels", json=payload)
        assert resp.status_code == 422


class TestHardwareTest:
    def test_test_white_ok(self, client: TestClient) -> None:
        resp = client.post("/channels/ch-1/test/white")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True

    def test_test_off_ok(self, client: TestClient) -> None:
        resp = client.post("/channels/ch-1/test/off")
        assert resp.status_code == 200

    def test_test_white_unknown_channel_returns_404(self, client: TestClient) -> None:
        resp = client.post("/channels/ghost/test/white")
        assert resp.status_code == 404

    def test_test_off_unknown_channel_returns_404(self, client: TestClient) -> None:
        resp = client.post("/channels/ghost/test/off")
        assert resp.status_code == 404
