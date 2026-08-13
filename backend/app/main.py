from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import events, sessions, patterns, analysis, dashboard, agents, alerts, chat, techniques
from app.config import settings


app = FastAPI(
    title="SessionSentinel API",
    description="AI Agent Behavioral Monitoring System",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    pass


app.include_router(agents.router, prefix="/api/v1")
app.include_router(alerts.router, prefix="/api/v1")
app.include_router(events.router, prefix="/api/v1")
app.include_router(sessions.router, prefix="/api/v1")
app.include_router(patterns.router, prefix="/api/v1")
app.include_router(analysis.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(techniques.router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.app_host, port=settings.app_port)