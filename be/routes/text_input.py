from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import get_current_user
from db.database import get_db
from db.models import User
from managers.text_manager import TextManager

router = APIRouter(tags=["Text"])


class TextInputRequest(BaseModel):
    message: str
    conversation_id: int


@router.post("/text-input")
async def text_input(
    request: TextInputRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        if not request.message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        result = await TextManager.process_text_input(
            request.message,
            request.conversation_id,
            current_user,
            db,
        )
        return result
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text processing failed: {e}")
