from config import get_config
from managers.llm_manager import LLMManager
from managers.tts_manager import TTSManager
from db.models import Message, User
from managers.conversation_manager import ConversationManager
from repositories.message_repository import MessageRepository


class TextManager:
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
    async def start_conversation(conversation, user: User) -> dict:
        if not ConversationManager.has_context(conversation):
            raise ValueError("Conversation context is required before starting the conversation")
        if ConversationManager.has_messages(conversation.id):
            raise ValueError("Conversation has already started")
        ConversationManager.validate_can_send(conversation)

        opening_question = LLMManager.generate_opening_question(conversation, user)
        tts_path = await TTSManager.convert_text_to_audio(opening_question, user.id, conversation.id)

        MessageRepository.create(
            conversation_id=conversation.id,
            sender="assistant",
            message_type="text",
            audio_path=tts_path,
            text=opening_question,
            commit=True,
        )

        return {"text": opening_question, "audio_path": tts_path}

    @staticmethod
    async def process_text_input(message: str, conversation_id: int, user: User) -> dict:
        conversation = ConversationManager.get_conversation(conversation_id, user)
        if not ConversationManager.has_context(conversation):
            raise ValueError("Conversation context is required before starting the conversation")
        ConversationManager.validate_can_send(conversation)
        ConversationManager.validate_input_mode(conversation, "text")

        # 1. Save user message
        MessageRepository.create(
            conversation_id=conversation_id,
            sender="user",
            message_type="text",
            text=message,
            commit=True,
        )

        # 2. Get LLM response using the configured transcript history strategy
        history = TextManager._get_llm_history(conversation_id, user)
        llm_response = LLMManager.send_to_llm(message, conversation, user, history)

        # 3. Convert response -> audio
        tts_path = await TTSManager.convert_text_to_audio(llm_response, user.id, conversation_id)

        # 4. Save assistant message
        MessageRepository.create(
            conversation_id=conversation_id,
            sender="assistant",
            message_type="text",
            audio_path=tts_path,
            text=llm_response,
            commit=True,
        )

        return {"text": llm_response, "audio_path": tts_path}
