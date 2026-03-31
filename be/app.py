from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

from routes.audio_input import router as audio_router
from routes.auth import router as auth_router
from routes.conversations import router as conversation_router
from routes.text_input import router as text_router
from db.init_db import init_database
from utils.file_utils import ensure_directories

ensure_directories()
init_database()


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="AI Interview Assistant", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/media", StaticFiles(directory="media"), name="media")
app.mount("/audio_recordings", StaticFiles(directory="audio_recordings"), name="audio_recordings")
app.mount("/tts_outputs", StaticFiles(directory="tts_outputs"), name="tts_outputs")

app.include_router(auth_router)
app.include_router(conversation_router)
app.include_router(audio_router)
app.include_router(text_router)


@app.get("/health")
def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=False)
