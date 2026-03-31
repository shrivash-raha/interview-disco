from sqlalchemy.orm import Session

from managers.llm_manager import LLMManager
from managers.tts_manager import TTSManager
from db.models import Message, User
from managers.conversation_manager import ConversationManager


class TextManager:
    @staticmethod
    async def start_conversation(conversation, user: User, db: Session) -> dict:
        if not ConversationManager.has_context(conversation):
            raise ValueError("Conversation context is required before starting the conversation")
        if ConversationManager.has_messages(conversation.id, db):
            raise ValueError("Conversation has already started")
        ConversationManager.validate_can_send(conversation)

        opening_question = LLMManager.generate_opening_question(conversation)
        tts_path = await TTSManager.convert_text_to_audio(opening_question, user.id, conversation.id)

        assistant_message = Message(
            conversation_id=conversation.id,
            sender="assistant",
            message_type="text",
            audio_path=tts_path,
            text=opening_question,
        )
        db.add(assistant_message)
        db.commit()

        return {"text": opening_question, "audio_path": tts_path}

    @staticmethod
    async def process_text_input(message: str, conversation_id: int, user: User, db: Session) -> dict:
        conversation = ConversationManager.get_conversation(conversation_id, user, db)
        if not ConversationManager.has_context(conversation):
            raise ValueError("Conversation context is required before starting the conversation")
        ConversationManager.validate_can_send(conversation)

        # 1. Save user message
        user_message = Message(
            conversation_id=conversation_id,
            sender="user",
            message_type="text",
            text=message,
        )
        db.add(user_message)
        db.flush()

        # 2. Get LLM response
        recent_messages = ConversationManager.list_recent_messages(conversation_id, 8, db)
        llm_response = LLMManager.send_to_llm(message, conversation, recent_messages)

        # 3. Convert response → audio
        tts_path = await TTSManager.convert_text_to_audio(llm_response, user.id, conversation_id)

        # 4. Save assistant message
        assistant_message = Message(
            conversation_id=conversation_id,
            sender="assistant",
            message_type="text",
            audio_path=tts_path,
            text=llm_response,
        )
        db.add(assistant_message)
        db.commit()

        return {"text": llm_response, "audio_path": tts_path}
