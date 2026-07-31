from __future__ import annotations

from dataclasses import dataclass
from copy import deepcopy
from typing import Any

from fastapi.testclient import TestClient

import main


@dataclass
class FakeResponse:
    status_code: int = 200
    data: dict[str, Any] | None = None
    content: bytes = b""
    text: str = ""

    @property
    def is_success(self) -> bool:
        return 200 <= self.status_code < 300

    def json(self) -> dict[str, Any]:
        return self.data or {}


class FakeClient:
    def __init__(self, responses: list[FakeResponse], calls: list[dict[str, Any]]):
        self.responses, self.calls = responses, calls

    async def __aenter__(self) -> "FakeClient":
        return self

    async def __aexit__(self, *_: object) -> None:
        return None

    async def post(self, url: str, **kwargs: Any) -> FakeResponse:
        self.calls.append(deepcopy({"url": url, **kwargs}))
        return self.responses.pop(0)


def fake_factory(monkeypatch: Any, responses: list[FakeResponse]) -> list[dict[str, Any]]:
    calls: list[dict[str, Any]] = []
    monkeypatch.setattr(main, "create_client", lambda _timeout: FakeClient(responses, calls))
    return calls


def test_llm_success(monkeypatch: Any) -> None:
    monkeypatch.setattr(main, "LLM_BASE", "https://llm.test/v1")
    calls = fake_factory(monkeypatch, [FakeResponse(data={
        "choices": [{"message": {"content": "{\"answer\":\"ok\"}"}}],
        "usage": {"total_tokens": 7},
    })])
    response = TestClient(main.app).post("/api/llm", json={"system": "s", "user": "u"})
    assert response.status_code == 200
    assert response.json()["text"] == '{"answer":"ok"}'
    assert calls[0]["url"].endswith("/chat/completions")


def test_guided_json_retry_uses_fresh_client(monkeypatch: Any) -> None:
    monkeypatch.setattr(main, "LLM_BASE", "https://llm.test/v1")
    calls = fake_factory(monkeypatch, [
        FakeResponse(status_code=422, text="unsupported"),
        FakeResponse(data={"choices": [{"message": {"content": "ok"}}]}),
    ])
    response = TestClient(main.app).post("/api/llm", json={
        "system": "s", "user": "u", "schema": {"type": "object"},
    })
    assert response.status_code == 200
    assert len(calls) == 2
    assert "guided_json" in calls[0]["json"]
    assert "guided_json" not in calls[1]["json"]


def test_llm_error_is_opaque(monkeypatch: Any) -> None:
    monkeypatch.setattr(main, "LLM_BASE", "https://secret.internal/v1")
    fake_factory(monkeypatch, [FakeResponse(status_code=500, text="secret.internal key=abc")])
    response = TestClient(main.app).post("/api/llm", json={"user": "u"})
    assert response.status_code == 502
    assert response.json() == {"ok": False, "error": "llm_upstream_error"}
    assert "secret" not in response.text


def test_stt_preserves_wav_bytes(monkeypatch: Any) -> None:
    sentinel = b"RIFF" + bytes(range(96))
    calls = fake_factory(monkeypatch, [FakeResponse(data={"text": "xin chào"})])
    response = TestClient(main.app).post("/api/stt", content=sentinel, headers={"content-type": "audio/wav"})
    assert response.json() == {"ok": True, "text": "xin chào"}
    assert calls[0]["files"]["audio_file"][1] == sentinel


def test_tts_returns_audio_and_caps_text(monkeypatch: Any) -> None:
    calls = fake_factory(monkeypatch, [FakeResponse(content=b"RIFF-wave")])
    response = TestClient(main.app).post("/api/tts", json={"text": "x" * 950})
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("audio/wav")
    assert len(calls[0]["json"]["text"]) == 900


def test_health_is_independent_and_validation(monkeypatch: Any) -> None:
    monkeypatch.setattr(main, "LLM_BASE", "")
    fake_factory(monkeypatch, [FakeResponse(status_code=503, text="voice down")])
    client = TestClient(main.app)
    assert client.get("/api/llm/health").json()["error"] == "no_config"
    assert client.get("/api/voice/health").json()["ok"] is False
    assert client.post("/api/stt", content=b"short").status_code == 400
    assert client.post("/api/tts", json={"text": ""}).status_code == 400
    assert client.post("/api/llm", content=b"{").status_code == 400
    assert client.get("/api/tts").status_code == 405
