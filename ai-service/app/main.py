from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.routes import match as match_routes
from app.services.matcher import is_model_loaded, warm_embedder


def _allowed_origins() -> list[str]:
    origins: list[str] = []
    for env_key in ("BACKEND_URL", "FRONTEND_URL"):
        value = os.getenv(env_key)
        if value:
            origins.append(value.rstrip("/"))
    extra = os.getenv("AI_EXTRA_ORIGINS")
    if extra:
        origins.extend(o.strip().rstrip("/") for o in extra.split(",") if o.strip())
    return origins or ["*"]


app = FastAPI(
    title="Smart AI Internship Matching Service",
    version=__version__,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    # If embeddings are enabled, try to warm the model so /health reports it.
    warm_embedder()


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "version": __version__,
        "model_loaded": is_model_loaded(),
    }


app.include_router(match_routes.router)
