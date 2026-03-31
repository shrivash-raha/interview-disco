import shutil
from fastapi import UploadFile

from config import get_config
from utils.file_utils import generate_audio_recording_path
from managers.stt_manager import STTManager
from managers.llm_manager import LLMManager
from managers.tts_manager import TTSManager
from db.models import Message, User
from managers.conversation_manager import ConversationManager
from repositories.message_repository import MessageRepository


class AudioManager:
    @staticmethod
    def _get_llm_history(conversation_id: int, user: User) -> list[Message]:
        config = get_config()
        if config.llm.history_strategy == "recent":
            return ConversationManager.list_recent_messages(
                conversation_id,
                config.llm.recent_history_limit,
            )
        return ConversationManager.list_messages(conversation_id, user)

    @staticmethod
    def save_audio_file(file: UploadFile, user_id: int, conversation_id: int) -> str:
        extension = file.filename.split(".")[-1] if file.filename and "." in file.filename else "webm"
        file_path = generate_audio_recording_path(user_id, conversation_id, extension)
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        return file_path

    @staticmethod
    async def process_audio_input(file: UploadFile, conversation_id: int, user: User) -> dict:
        conversation = ConversationManager.get_conversation(conversation_id, user)
        if not ConversationManager.has_context(conversation):
            raise ValueError("Conversation context is required before starting the conversation")
        ConversationManager.validate_can_send(conversation)
        ConversationManager.validate_input_mode(conversation, "audio")

        # 1. Save audio
        audio_path = AudioManager.save_audio_file(file, user.id, conversation_id)

        # 2. Transcribe audio -> text
        user_text = STTManager.convert_audio_to_text(audio_path)

        # 3. Save user message
        MessageRepository.create(
            conversation_id=conversation_id,
            sender="user",
            message_type="audio",
            audio_path=audio_path,
            text=user_text,
            commit=True,
        )

        # 4. Get LLM response using the configured transcript history strategy
        history = AudioManager._get_llm_history(conversation_id, user)
        llm_response = LLMManager.send_to_llm(user_text, conversation, user, history)

        # 5. Convert response -> audio
        tts_path = await TTSManager.convert_text_to_audio(llm_response, user.id, conversation_id)

        # 6. Save assistant message
        MessageRepository.create(
            conversation_id=conversation_id,
            sender="assistant",
            message_type="audio",
            audio_path=tts_path,
            text=llm_response,
            commit=True,
        )

        return {"text": llm_response, "audio_path": tts_path, "user_text": user_text}
