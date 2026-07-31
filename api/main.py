"""Thin same-origin proxy for VLearn LLM, STT and TTS services."""
from __future__ import annotations

import json
import logging
import os
import re
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response

log = logging.getLogger("vlearn.api")
ROOT = Path(__file__).resolve().parents[1]


def _load_env() -> dict[str, str]:
    values: dict[str, str] = {}
    for path in (ROOT / ".env", Path(__file__).with_name(".env")):
        if not path.exists():
            continue
        for line in path.read_text("utf-8").splitlines():
            match = re.match(r"^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$", line, re.I)
            if not match:
                continue
            value = match.group(2).strip()
            if value[:1] in {"'", '"'}:
                value = value.strip("'\"")
            else:
                value = re.sub(r"\s+#.*$", "", value).strip()
            values[match.group(1)] = value
        break
    values.update({k: v for k, v in os.environ.items() if k.startswith(("LLM_", "VOICE_"))})
    return values


ENV = _load_env()
RAW_LLM_URL = ENV.get("LLM_API_URL", "")
LLM_BASE = re.sub(r"/chat/completions/?$", "", RAW_LLM_URL).rstrip("/")
LLM_KEY = ENV.get("LLM_API_KEY", "")
LLM_MODEL = ENV.get("LLM_MODEL", "gemma-4")
VOICE_BASE = ENV.get("VOICE_API_URL", "https://aitools.ptit.edu.vn/holobox").rstrip("/")


def _seconds(name: str, fallback: float) -> float:
    try:
        value = float(ENV.get(name, fallback))
        return value if value > 0 else fallback
    except (TypeError, ValueError):
        return fallback


LLM_TIMEOUT = _seconds("LLM_TIMEOUT", 15.0)
VOICE_TIMEOUT = _seconds("VOICE_TIMEOUT", 30.0)
app = FastAPI(title="VLearn proxy", docs_url=None, redoc_url=None)


def create_client(timeout: float) -> httpx.AsyncClient:
    return httpx.AsyncClient(timeout=timeout)


def opaque(error: str, status: int = 502) -> JSONResponse:
    return JSONResponse({"ok": False, "error": error}, status_code=status)


async def read_limited(request: Request, cap: int) -> bytes | None:
    body = bytearray()
    async for chunk in request.stream():
        body.extend(chunk)
        if len(body) > cap:
            return None
    return bytes(body)


async def call_llm(body: dict[str, Any]) -> tuple[dict[str, Any], int]:
    if not LLM_BASE:
        return {"ok": False, "error": "no_config"}, 502
    payload: dict[str, Any] = {
        "model": LLM_MODEL,
        "messages": [
            {"role": "system", "content": str(body.get("system", ""))},
            {"role": "user", "content": str(body.get("user", ""))},
        ],
        "temperature": body.get("temperature", 0.3),
        "max_tokens": min(int(body.get("max_tokens", 700)), 1500),
    }
    if body.get("schema") is not None:
        payload["guided_json"] = body["schema"]
    headers = {"content-type": "application/json"}
    if LLM_KEY:
        headers["authorization"] = f"Bearer {LLM_KEY}"

    try:
        async with create_client(LLM_TIMEOUT) as client:
            response = await client.post(f"{LLM_BASE}/chat/completions", headers=headers, json=payload)
        if response.status_code in (400, 422) and "guided_json" in payload:
            payload.pop("guided_json")
            async with create_client(LLM_TIMEOUT) as retry_client:
                retry = await retry_client.post(
                    f"{LLM_BASE}/chat/completions", headers=headers, json=payload
                )
            if retry.is_success:
                data = retry.json()
                return {
                    "ok": True,
                    "text": data.get("choices", [{}])[0].get("message", {}).get("content", ""),
                    "usage": data.get("usage"),
                }, 200
            response = retry
        if not response.is_success:
            log.error("[llm] upstream %s: %s", response.status_code, response.text[:300])
            return {"ok": False, "error": "llm_upstream_error"}, 502
        data = response.json()
        return {
            "ok": True,
            "text": data.get("choices", [{}])[0].get("message", {}).get("content", ""),
            "usage": data.get("usage"),
        }, 200
    except httpx.TimeoutException:
        log.exception("[llm] timeout")
        return {"ok": False, "error": "llm_timeout"}, 502
    except Exception:
        log.exception("[llm] unreachable")
        return {"ok": False, "error": "llm_unreachable"}, 502


async def call_tts(text: str) -> tuple[bytes | None, str | None]:
    try:
        async with create_client(VOICE_TIMEOUT) as client:
            response = await client.post(f"{VOICE_BASE}/synthesize", json={"text": text})
        if not response.is_success:
            log.error("[tts] upstream %s: %s", response.status_code, response.text[:300])
            return None, "tts_upstream_error"
        return response.content, None
    except httpx.TimeoutException:
        return None, "tts_timeout"
    except Exception:
        log.exception("[tts] unreachable")
        return None, "tts_unreachable"


@app.get("/api/llm/health")
async def llm_health() -> JSONResponse:
    if not LLM_BASE:
        return JSONResponse({"ok": False, "error": "no_config", "model": LLM_MODEL})
    result, _ = await call_llm({"system": "ping", "user": "ping", "max_tokens": 1})
    return JSONResponse(
        {"ok": result.get("ok", False), "model": LLM_MODEL, **(
            {} if result.get("ok") else {"error": result.get("error")}
        )}
    )


@app.post("/api/llm")
async def llm(request: Request) -> JSONResponse:
    raw = await read_limited(request, 2_000_000)
    if raw is None:
        return opaque("body_too_large", 413)
    try:
        body = json.loads(raw or b"{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        return opaque("bad_json", 400)
    result, status = await call_llm(body)
    return JSONResponse(result, status_code=status)


@app.get("/api/voice/health")
async def voice_health() -> JSONResponse:
    wav, error = await call_tts("ok")
    return JSONResponse({"ok": wav is not None, **({} if wav is not None else {"error": error})})


@app.post("/api/stt")
async def stt(request: Request) -> JSONResponse:
    wav = await read_limited(request, 10_000_000)
    if wav is None:
        return opaque("body_too_large", 413)
    if len(wav) < 100:
        return opaque("empty_audio", 400)
    try:
        async with create_client(VOICE_TIMEOUT) as client:
            response = await client.post(
                f"{VOICE_BASE}/transcribe",
                files={"audio_file": ("speech.wav", wav, "audio/wav")},
            )
        if not response.is_success:
            log.error("[stt] upstream %s: %s", response.status_code, response.text[:300])
            return opaque("stt_upstream_error")
        data = response.json()
        text = str(data.get("text", data.get("transcription", data.get("result", "")))).strip()
        return JSONResponse({"ok": True, "text": text})
    except httpx.TimeoutException:
        return opaque("stt_timeout")
    except Exception:
        log.exception("[stt] unreachable")
        return opaque("stt_unreachable")


@app.post("/api/tts")
async def tts(request: Request) -> Response:
    raw = await read_limited(request, 2_000_000)
    if raw is None:
        return opaque("body_too_large", 413)
    try:
        body = json.loads(raw or b"{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        return opaque("bad_json", 400)
    text = str(body.get("text", "")).strip()[:900]
    if not text:
        return opaque("empty_text", 400)
    wav, error = await call_tts(text)
    if wav is None:
        return opaque(error or "tts_upstream_error")
    return Response(wav, media_type="audio/wav", headers={"cache-control": "no-store"})
