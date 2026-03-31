from typing import Annotated
from datetime import timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import get_current_user
from db.database import get_db
from db.models import User
from managers.conversation_manager import ConversationManager
from managers.text_manager import TextManager
from services.job_description_service import extract_job_description_text, extract_job_description_text_from_upload, save_job_description_file

router = APIRouter(prefix="/conversations", tags=["Conversations"])


class CreateConversationRequest(BaseModel):
    name: str


def _serialize_conversation(conversation):
    timer_started_at = conversation.timer_started_at
    if timer_started_at and timer_started_at.tzinfo is None:
        timer_started_at = timer_started_at.replace(tzinfo=timezone.utc)
    created_at = conversation.created_at
    if created_at and created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    return {
        "id": conversation.id,
        "name": conversation.name,
        "description": conversation.description,
        "job_description_text": conversation.job_description_text,
        "extra_details": conversation.extra_details,
        "job_description_file_path": conversation.job_description_file_path,
        "interview_status": conversation.interview_status,
        "timer_enabled": conversation.timer_enabled,
        "timer_total_seconds": conversation.timer_total_seconds,
        "timer_remaining_seconds": ConversationManager.get_remaining_seconds(conversation),
        "timer_started_at": timer_started_at.isoformat() if timer_started_at else None,
        "context_locked": len(conversation.messages) > 0,
        "created_at": created_at.isoformat() if created_at else None,
    }


def _serialize_message(message):
    return {
        "id": message.id,
        "conversation_id": message.conversation_id,
        "sender": message.sender,
        "type": message.message_type,
        "text": message.text,
        "audio_path": message.audio_path,
        "created_at": message.created_at.isoformat() if message.created_at else None,
    }


@router.get("")
def list_conversations(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conversations = ConversationManager.list_conversations(current_user, db)
    return [_serialize_conversation(conversation) for conversation in conversations]


@router.post("")
def create_conversation(
    request: CreateConversationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    name = request.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Conversation name cannot be empty")

    try:
        conversation = ConversationManager.create_conversation(name, current_user, db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _serialize_conversation(conversation)


@router.post("/job-description/extract")
def extract_job_description(
    current_user: User = Depends(get_current_user),
    file: UploadFile = File(...),
):
    del current_user
    try:
        extracted_text = extract_job_description_text_from_upload(file)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if not extracted_text:
        raise HTTPException(status_code=400, detail="Could not extract text from the uploaded file")
    return {"text": extracted_text}


@router.delete("/{conversation_id}")
def delete_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        ConversationManager.delete_conversation(conversation_id, current_user, db)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"success": True}


@router.get("/{conversation_id}/messages")
def list_messages(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        messages = ConversationManager.list_messages(conversation_id, current_user, db)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return [_serialize_message(message) for message in messages]


@router.put("/{conversation_id}/context")
async def update_conversation_context(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    name: Annotated[str | None, Form()] = None,
    job_description_text: Annotated[str | None, Form()] = None,
    extra_details: Annotated[str | None, Form()] = None,
    timer_enabled: Annotated[bool | None, Form()] = None,
    timer_total_minutes: Annotated[int | None, Form()] = None,
    file: UploadFile | None = File(default=None),
):
    try:
        conversation = ConversationManager.get_conversation(conversation_id, current_user, db)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    update_kwargs = {}
    if name is not None:
        trimmed_name = name.strip()
        if not trimmed_name:
            raise HTTPException(status_code=400, detail="Conversation name cannot be empty")
        update_kwargs["name"] = trimmed_name
    if extra_details is not None:
        update_kwargs["extra_details"] = extra_details.strip() or None
    if timer_total_minutes is not None:
        if timer_total_minutes <= 0:
            raise HTTPException(status_code=400, detail="Timer duration must be greater than zero minutes")
        update_kwargs["timer_total_seconds"] = timer_total_minutes * 60
    if timer_enabled is not None:
        update_kwargs["timer_enabled"] = timer_enabled
        if timer_enabled and "timer_total_seconds" not in update_kwargs and conversation.timer_total_seconds is None:
            update_kwargs["timer_total_seconds"] = ConversationManager.DEFAULT_TIMER_SECONDS

    stripped_job_description_text = job_description_text.strip() if job_description_text is not None else None
    if file is not None and file.filename and stripped_job_description_text:
        raise HTTPException(status_code=400, detail="Provide either a job description file or pasted job description text, not both")

    if file is not None and file.filename:
        try:
            extracted_text = extract_job_description_text_from_upload(file)
            file_path, _ = save_job_description_file(file, current_user.id, conversation.id)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except RuntimeError as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc

        if not extracted_text:
            raise HTTPException(status_code=400, detail="Could not extract text from the uploaded file")

        update_kwargs["job_description_text"] = extracted_text
        update_kwargs["job_description_file_path"] = file_path
    elif job_description_text is not None:
        update_kwargs["job_description_text"] = stripped_job_description_text or None
        if not update_kwargs["job_description_text"]:
            update_kwargs["job_description_file_path"] = None

    try:
        updated_conversation = ConversationManager.update_context(
            conversation.id,
            current_user,
            db,
            **update_kwargs,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if ConversationManager.has_context(updated_conversation) and not ConversationManager.has_messages(updated_conversation.id, db):
        try:
            await TextManager.start_conversation(updated_conversation, current_user, db)
            updated_conversation = ConversationManager.get_conversation(updated_conversation.id, current_user, db)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except RuntimeError as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc
    return _serialize_conversation(updated_conversation)

class ResumeInterviewRequest(BaseModel):
    extension_minutes: int | None = None
    continue_indefinitely: bool = False


@router.post("/{conversation_id}/pause")
def pause_interview(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        conversation = ConversationManager.pause_interview(conversation_id, current_user, db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _serialize_conversation(conversation)


@router.post("/{conversation_id}/resume")
def resume_interview(
    conversation_id: int,
    request: ResumeInterviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if request.extension_minutes is not None and request.extension_minutes <= 0:
        raise HTTPException(status_code=400, detail="Extension minutes must be greater than zero")
    try:
        conversation = ConversationManager.resume_interview(
            conversation_id,
            current_user,
            db,
            extension_minutes=request.extension_minutes,
            continue_indefinitely=request.continue_indefinitely,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _serialize_conversation(conversation)


@router.post("/{conversation_id}/stop")
def stop_interview(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        conversation = ConversationManager.stop_interview(conversation_id, current_user, db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _serialize_conversation(conversation)
