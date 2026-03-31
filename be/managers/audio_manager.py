import shutil
from fastapi import UploadFile
from sqlalchemy.orm import Session

from utils.file_utils import generate_audio_recording_path
from managers.stt_manager import STTManager
from managers.llm_manager import LLMManager
from managers.tts_manager import TTSManager
from db.models import Message, User
from managers.conversation_manager import ConversationManager


class AudioManager:
    @staticmethod
    def save_audio_file(file: UploadFile, user_id: int, conversation_id: int) -> str:
        extension = file.filename.split(".")[-1] if file.filename and "." in file.filename else "webm"
        file_path = generate_audio_recording_path(user_id, conversation_id, extension)
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        return file_path

    @staticmethod
    async def process_audio_input(file: UploadFile, conversation_id: int, user: User, db: Session) -> dict:
        conversation = ConversationManager.get_conversation(conversation_id, user, db)
        if not ConversationManager.has_context(conversation):
            raise ValueError("Conversation context is required before starting the conversation")
        ConversationManager.validate_can_send(conversation)

        # 1. Save audio
        audio_path = AudioManager.save_audio_file(file, user.id, conversation_id)

        # 2. Transcribe audio → text
        user_text = STTManager.convert_audio_to_text(audio_path)

        # 3. Save user message
        user_message = Message(
            conversation_id=conversation_id,
            sender="user",
            message_type="audio",
            audio_path=audio_path,
            text=user_text,
        )
        db.add(user_message)
        db.flush()

        # 4. Get LLM response
        recent_messages = ConversationManager.list_recent_messages(conversation_id, 8, db)
        llm_response = LLMManager.send_to_llm(user_text, conversation, recent_messages)

        # 5. Convert response → audio
        tts_path = await TTSManager.convert_text_to_audio(llm_response, user.id, conversation_id)

        # 6. Save assistant message
        assistant_message = Message(
            conversation_id=conversation_id,
            sender="assistant",
            message_type="audio",
            audio_path=tts_path,
            text=llm_response,
        )
        db.add(assistant_message)
        db.commit()

        return {"text": llm_response, "audio_path": tts_path, "user_text": user_text}
