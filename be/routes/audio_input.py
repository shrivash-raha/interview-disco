from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form

from auth import get_current_user
from db.models import User
from managers.audio_manager import AudioManager

router = APIRouter(tags=["Audio"])


@router.post("/audio-input")
async def audio_input(
    conversation_id: int = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    try:
        result = await AudioManager.process_audio_input(file, conversation_id, current_user)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audio processing failed: {e}")
