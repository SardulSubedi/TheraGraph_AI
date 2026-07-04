import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import chat, feedback, formulate, graph, ingest, patients, therapy
from app.services.cognee_engine import connect

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await connect()
    except Exception as exc:
        logger.warning("Cognee connect failed at startup (app will still boot): %s", exc)
    yield


app = FastAPI(title="TheraGraph AI", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

app.include_router(patients.router)
app.include_router(ingest.router)
app.include_router(graph.router)
app.include_router(formulate.router)
app.include_router(therapy.router)
app.include_router(feedback.router)
app.include_router(chat.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
