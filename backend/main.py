from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import engine, Base
from routers import auth, users, ingest, dashboard, devices, aggregation, agent, kakao


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="PNF PRICE-IQ", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(ingest.router, prefix="/api/v1/ingest", tags=["ingest"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["dashboard"])
app.include_router(devices.router, prefix="/api/v1/devices", tags=["devices"])
app.include_router(aggregation.router, prefix="/api/v1/aggregation", tags=["aggregation"])
app.include_router(agent.router, prefix="/api/v1/agent", tags=["agent"])
app.include_router(kakao.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
