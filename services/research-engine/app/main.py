"""
FastAPI Service cho OpenSpectrum-VN — Open Science Research & Speech Engine.
"""

from __future__ import annotations

import os
from typing import Literal

from fastapi import FastAPI, File, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.deidentify import export_fair_sced_package, scrub_vietnamese_pii
from app.ioa_fidelity import (
    compute_binary_ioa_and_kappa,
    compute_count_ioa,
    compute_procedural_fidelity,
)
from app.sced_stats import analyze_sced_ab, compute_bc_smd
from app.speech_vi import (
    get_speech_capabilities,
    synthesize_piper_vietnamese,
    transcribe_vietnamese_audio,
)

app = FastAPI(
    title="OpenSpectrum-VN Research Engine",
    description="Engine Thống kê Thực nghiệm Trường hợp Đơn (SCED), Độ đồng thuận IOA, Khử định danh FAIR & Giọng nói Tiếng Việt Mở",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SCEDAnalyzeRequest(BaseModel):
    baseline: list[float] = Field(..., min_length=2, description="Chuỗi điểm dữ liệu Pha Cơ sở (A)")
    intervention: list[float] = Field(..., min_length=2, description="Chuỗi điểm dữ liệu Pha Can thiệp (B)")
    direction: Literal["increase", "decrease"] = "increase"
    baseline_trend_threshold: float = Field(default=0.20, ge=0.05, le=0.80)


class BCSMDCase(BaseModel):
    baseline: list[float] = Field(..., min_length=2)
    intervention: list[float] = Field(..., min_length=2)


class BCSMDRequest(BaseModel):
    cases: list[BCSMDCase] = Field(..., min_length=3)
    direction: Literal["increase", "decrease"] = "increase"


class BinaryIOARequest(BaseModel):
    observer_1: list[int] = Field(..., min_length=2)
    observer_2: list[int] = Field(..., min_length=2)
    fidelity_steps: list[bool] | None = None


class CountIOARequest(BaseModel):
    observer_1: list[int] = Field(..., min_length=1)
    observer_2: list[int] = Field(..., min_length=1)


class FAIRExportRecord(BaseModel):
    child_id: str
    child_name: str | None = None
    session_number: int
    phase: str
    session_date: str | None = None
    age_months: int | None = None
    outcome_value: float
    procedural_fidelity_pct: float | None = None
    notes: str = ""
    research_consent_granted: bool = False


class FAIRExportRequest(BaseModel):
    study_id: str
    study_title: str
    target_behavior: str
    improvement_direction: Literal["increase", "decrease"] = "increase"
    records: list[FAIRExportRecord]


class ScrubPIIRequest(BaseModel):
    text: str
    child_name: str | None = None


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)
    length_scale: float = Field(default=1.18, ge=0.8, le=1.6)


@app.get("/")
def root() -> dict:
    return {
        "message": "OpenSpectrum-VN — Research Engine đang hoạt động bình thường.",
        "docs_swagger": "/docs",
        "docs_redoc": "/redoc",
        "health_url": "/health",
        "web_app_ui": "http://localhost:5173",
        "api_gateway": "http://localhost:4000/api/health",
    }


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "service": "openspectrum-vn-research-engine",
        "speech": get_speech_capabilities(),
    }


@app.post("/sced/analyze")
def sced_analyze(req: SCEDAnalyzeRequest) -> dict:
    try:
        return analyze_sced_ab(
            baseline=req.baseline,
            intervention=req.intervention,
            direction=req.direction,
            baseline_trend_threshold=req.baseline_trend_threshold,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/sced/bc-smd")
def sced_bc_smd(req: BCSMDRequest) -> dict:
    try:
        return compute_bc_smd(
            cases=[c.model_dump() for c in req.cases],
            direction=req.direction,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/ioa/binary")
def ioa_binary(req: BinaryIOARequest) -> dict:
    try:
        result = compute_binary_ioa_and_kappa(req.observer_1, req.observer_2)
        if req.fidelity_steps is not None and len(req.fidelity_steps) > 0:
            result["procedural_fidelity"] = compute_procedural_fidelity(req.fidelity_steps)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/ioa/count")
def ioa_count(req: CountIOARequest) -> dict:
    try:
        return compute_count_ioa(req.observer_1, req.observer_2)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/privacy/scrub")
def privacy_scrub(req: ScrubPIIRequest) -> dict:
    return {"sanitized_text": scrub_vietnamese_pii(req.text, req.child_name)}


@app.post("/fair/export")
def fair_export(req: FAIRExportRequest) -> dict:
    salt = os.getenv("DEIDENTIFICATION_SALT", "openspectrum-vn-open-science-default-salt")
    return export_fair_sced_package(
        study_id=req.study_id,
        study_title=req.study_title,
        target_behavior=req.target_behavior,
        improvement_direction=req.improvement_direction,
        records=[r.model_dump() for r in req.records],
        salt=salt,
    )


@app.post("/speech/asr")
async def speech_asr(file: UploadFile = File(...)) -> dict:
    data = await file.read()
    return transcribe_vietnamese_audio(data, filename=file.filename or "audio.webm")


@app.post("/speech/tts")
def speech_tts(req: TTSRequest):
    wav = synthesize_piper_vietnamese(req.text, length_scale=req.length_scale)
    if wav is None:
        return {
            "ok": False,
            "fallback": "browser-speech-synthesis-vi-VN",
            "recommended_voice_params": {"lang": "vi-VN", "rate": 0.85, "pitch": 1.0},
        }
    return Response(content=wav, media_type="audio/wav")
