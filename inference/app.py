"""
FastAPI YOLO (Ultralytics v8) inference service for fridge item detection.
Run from the `inference/` directory: uvicorn app:app --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

import io
import logging
import os
import traceback
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from ultralytics import YOLO

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("inference")

BASE_DIR = Path(__file__).resolve().parent


def resolve_model_path() -> str:
    """Resolve MODEL_PATH against the inference package directory if relative."""
    raw = os.getenv("MODEL_PATH", "models/best.pt")
    p = Path(raw)
    if p.is_absolute():
        return str(p)
    return str(BASE_DIR / p)


def load_cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
    if raw.strip() == "*":
        return ["*"]
    return [o.strip() for o in raw.split(",") if o.strip()]


CORS_ALLOW = load_cors_origins()
# Starlette: credentials cannot be used with allow_origins=["*"]
CORS_CREDS = CORS_ALLOW != ["*"]

app = FastAPI(
    title="Fridge YOLO Inference",
    version="1.0.0",
    description="Local YOLOv8 detection for the Next.js fitness assistant",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOW,
    allow_credentials=CORS_CREDS,
    allow_methods=["*"],
    allow_headers=["*"],
)

model: YOLO | None = None
_model_error: str | None = None


@app.on_event("startup")
def startup_load_model() -> None:
    global model, _model_error
    path = resolve_model_path()
    logger.info("Resolving model path: %s", path)
    if not os.path.isfile(path):
        _model_error = f"Model file not found: {path}"
        logger.error(_model_error)
        return
    try:
        model = YOLO(path)
        logger.info("YOLO model loaded successfully from %s", path)
    except Exception as e:
        _model_error = str(e)
        logger.exception("Failed to load YOLO model: %s", e)


@app.get("/health")
def health() -> dict:
    """Liveness: service is up. Readiness: model is loaded when no error."""
    ok = model is not None
    return {
        "status": "ok" if ok else "degraded",
        "model_loaded": ok,
        "error": _model_error,
    }


@app.post("/detect")
async def detect(
    image: UploadFile = File(..., description="Image to run detection on"),
    conf: str = Form("0.25"),
) -> dict:
    """
    Run YOLO on an uploaded image.

    Returns:
        { "detected_items": [str, ...], "confidence": [float, ...] }
    """
    if model is None:
        detail = _model_error or "Model is not loaded"
        logger.error("Detect called but model unavailable: %s", detail)
        raise HTTPException(status_code=503, detail=detail)

    try:
        conf_f = float(conf)
    except (TypeError, ValueError):
        conf_f = 0.25

    try:
        raw = await image.read()
        if not raw:
            raise HTTPException(status_code=400, detail="Empty image file")

        pil = Image.open(io.BytesIO(raw)).convert("RGB")
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("Invalid image: %s", e)
        raise HTTPException(status_code=400, detail=f"Invalid image: {e!s}") from e

    try:
        results = model.predict(
            source=pil,
            conf=conf_f,
            save=False,
            verbose=False,
        )
    except Exception as e:
        logger.error("Inference failed: %s\n%s", e, traceback.format_exc())
        raise HTTPException(
            status_code=500, detail=f"Inference failed: {e!s}"
        ) from e

    r = results[0]
    names_map = r.names or {}
    detected_items: list[str] = []
    confidence: list[float] = []

    if r.boxes is not None and len(r.boxes) > 0:
        for box in r.boxes:
            cls_id = int(box.cls[0].item())
            conf_val = float(box.conf[0].item())
            label = names_map.get(cls_id, str(cls_id))
            detected_items.append(label)
            confidence.append(conf_val)

    logger.info(
        "Detection: %d objects — %s",
        len(detected_items),
        detected_items,
    )
    return {"detected_items": detected_items, "confidence": confidence}
