from datetime import datetime, timezone

from db.models import Conversation, Message, User
from repositories.conversation_repository import ConversationRepository
from repositories.message_repository import MessageRepository


class ConversationManager:
    DEFAULT_TIMER_SECONDS = 30 * 60
    MAX_TIMER_SECONDS = 3 * 60 * 60
    STATUS_ACTIVE = "active"
    STATUS_PAUSED = "paused"
    STATUS_STOPPED = "stopped"
    VALID_INTERACTION_MODES = {
        Conversation.MODE_TEXT,
        Conversation.MODE_AUDIO,
        Conversation.MODE_VIDEO,
    }

    @staticmethod
    def list_conversations(user: User) -> list[Conversation]:
        return ConversationRepository.list_by_user(user.id)

    @staticmethod
    def _normalize_name(name: str) -> str:
        return " ".join(name.strip().split()).lower()

    @staticmethod
    def _ensure_unique_name(name: str, user: User, exclude_conversation_id: int | None = None) -> None:
        normalized = ConversationManager._normalize_name(name)
        conversations = ConversationRepository.list_by_user(user.id)
        for conversation in conversations:
            if exclude_conversation_id is not None and conversation.id == exclude_conversation_id:
                continue
            if ConversationManager._normalize_name(conversation.name) == normalized:
                raise ValueError("A practice interview with this name already exists")

    @staticmethod
    def create_conversation(name: str, user: User) -> Conversation:
        ConversationManager._ensure_unique_name(name, user)
        return ConversationRepository.create(name=name, user_id=user.id)

    @staticmethod
    def delete_conversation(conversation_id: int, user: User) -> None:
        conversation = ConversationManager.get_conversation(conversation_id, user)
        ConversationRepository.soft_delete(conversation)

    @staticmethod
    def get_conversation(conversation_id: int, user: User) -> Conversation:
        conversation = ConversationRepository.get_by_id_and_user(conversation_id, user.id)
        if not conversation:
            raise ValueError("Conversation not found")
        return conversation

    @staticmethod
    def list_messages(conversation_id: int, user: User) -> list[Message]:
        ConversationManager.get_conversation(conversation_id, user)
        return MessageRepository.list_by_conversation(conversation_id)

    @staticmethod
    def list_recent_messages(conversation_id: int, limit: int) -> list[Message]:
        return MessageRepository.list_recent_by_conversation(conversation_id, limit)

    @staticmethod
    def has_messages(conversation_id: int) -> bool:
        return MessageRepository.exists_for_conversation(conversation_id)

    @staticmethod
    def has_context(conversation: Conversation) -> bool:
        return bool((conversation.job_description_text or "").strip() or (conversation.extra_details or "").strip())

    @staticmethod
    def is_timer_expired(conversation: Conversation) -> bool:
        if conversation.interview_status == ConversationManager.STATUS_STOPPED:
            return False
        if not conversation.timer_enabled:
            return False
        if conversation.interview_status == ConversationManager.STATUS_PAUSED:
            return (conversation.timer_remaining_seconds or 0) <= 0
        if not conversation.timer_total_seconds or not conversation.timer_started_at:
            return False
        started_at = conversation.timer_started_at
        if started_at.tzinfo is None:
            started_at = started_at.replace(tzinfo=timezone.utc)
        elapsed_seconds = int((datetime.now(timezone.utc) - started_at).total_seconds())
        return elapsed_seconds >= conversation.timer_total_seconds

    @staticmethod
    def get_remaining_seconds(conversation: Conversation) -> int | None:
        if not conversation.timer_enabled:
            return None
        if conversation.interview_status == ConversationManager.STATUS_PAUSED:
            return conversation.timer_remaining_seconds
        if not conversation.timer_started_at or not conversation.timer_total_seconds:
            return conversation.timer_remaining_seconds or conversation.timer_total_seconds
        started_at = conversation.timer_started_at
        if started_at.tzinfo is None:
            started_at = started_at.replace(tzinfo=timezone.utc)
        elapsed_seconds = int((datetime.now(timezone.utc) - started_at).total_seconds())
        return max(0, conversation.timer_total_seconds - elapsed_seconds)

    @staticmethod
    def validate_can_send(conversation: Conversation) -> None:
        if conversation.interview_status == ConversationManager.STATUS_PAUSED:
            raise ValueError("The practice interview is paused. Resume it before sending more responses.")
        if conversation.interview_status == ConversationManager.STATUS_STOPPED:
            raise ValueError("This practice interview has been stopped. No more responses can be sent.")
        if ConversationManager.is_timer_expired(conversation):
            raise ValueError("The practice interview timer has ended. Extend or continue before sending more responses.")

    @staticmethod
    def validate_input_mode(conversation: Conversation, input_type: str) -> None:
        mode = conversation.interaction_mode or Conversation.MODE_TEXT
        if mode == Conversation.MODE_AUDIO and input_type == "text":
            raise ValueError("This practice interview is in audio mode. Text input is not available.")
        if mode == Conversation.MODE_VIDEO:
            raise ValueError("Video mode is not available yet.")

    @staticmethod
    def update_context(
        conversation_id: int,
        user: User,
        *,
        name: str | None = None,
        job_description_text: str | None = None,
        extra_details: str | None = None,
        job_description_file_path: str | None = None,
        interaction_mode: str | None = None,
        timer_enabled: bool | None = None,
        timer_total_seconds: int | None = None,
    ) -> Conversation:
        conversation = ConversationManager.get_conversation(conversation_id, user)
        if ConversationManager.has_messages(conversation_id):
            raise ValueError("Conversation context cannot be edited after the conversation has started")
        update_kwargs = {}
        if name is not None:
            ConversationManager._ensure_unique_name(name, user, exclude_conversation_id=conversation_id)
            update_kwargs["name"] = name
        if job_description_text is not None:
            update_kwargs["job_description_text"] = job_description_text
        if extra_details is not None:
            update_kwargs["extra_details"] = extra_details
        if job_description_file_path is not None:
            update_kwargs["job_description_file_path"] = job_description_file_path
        if interaction_mode is not None:
            if interaction_mode not in ConversationManager.VALID_INTERACTION_MODES:
                raise ValueError("Invalid interaction mode")
            update_kwargs["interaction_mode"] = interaction_mode
        if timer_total_seconds is not None and timer_total_seconds > ConversationManager.MAX_TIMER_SECONDS:
            raise ValueError("Timer duration cannot exceed 180 minutes")
        if timer_enabled is not None:
            if not timer_enabled:
                update_kwargs["timer_enabled"] = False
                update_kwargs["timer_total_seconds"] = None
                update_kwargs["timer_started_at"] = None
                update_kwargs["timer_remaining_seconds"] = None
            else:
                resolved_total_seconds = timer_total_seconds or conversation.timer_total_seconds or ConversationManager.DEFAULT_TIMER_SECONDS
                if resolved_total_seconds > ConversationManager.MAX_TIMER_SECONDS:
                    raise ValueError("Timer duration cannot exceed 180 minutes")
                update_kwargs["timer_enabled"] = True
                update_kwargs["timer_total_seconds"] = resolved_total_seconds
                update_kwargs["timer_remaining_seconds"] = resolved_total_seconds
                update_kwargs["timer_started_at"] = datetime.now(timezone.utc)
                update_kwargs["interview_status"] = ConversationManager.STATUS_ACTIVE
        elif timer_total_seconds is not None and conversation.timer_enabled:
            if timer_total_seconds > ConversationManager.MAX_TIMER_SECONDS:
                raise ValueError("Timer duration cannot exceed 180 minutes")
            update_kwargs["timer_total_seconds"] = timer_total_seconds
            update_kwargs["timer_remaining_seconds"] = timer_total_seconds
            update_kwargs["timer_started_at"] = datetime.now(timezone.utc)
        return ConversationRepository.update(conversation, **update_kwargs)

    @staticmethod
    def pause_interview(conversation_id: int, user: User) -> Conversation:
        conversation = ConversationManager.get_conversation(conversation_id, user)
        if conversation.interview_status == ConversationManager.STATUS_STOPPED:
            raise ValueError("A stopped practice interview cannot be paused")
        return ConversationRepository.update(
            conversation,
            timer_remaining_seconds=ConversationManager.get_remaining_seconds(conversation),
            timer_started_at=None,
            interview_status=ConversationManager.STATUS_PAUSED,
        )

    @staticmethod
    def resume_interview(
        conversation_id: int,
        user: User,
        *,
        extension_minutes: int | None = None,
        continue_indefinitely: bool = False,
    ) -> Conversation:
        conversation = ConversationManager.get_conversation(conversation_id, user)
        if conversation.interview_status == ConversationManager.STATUS_STOPPED:
            raise ValueError("A stopped practice interview cannot be resumed")

        if continue_indefinitely:
            return ConversationRepository.update(
                conversation,
                timer_enabled=False,
                timer_total_seconds=None,
                timer_remaining_seconds=None,
                timer_started_at=None,
                interview_status=ConversationManager.STATUS_ACTIVE,
            )
        else:
            base_remaining = ConversationManager.get_remaining_seconds(conversation) or conversation.timer_remaining_seconds or conversation.timer_total_seconds or ConversationManager.DEFAULT_TIMER_SECONDS
            extension_seconds = (extension_minutes or 0) * 60
            return ConversationRepository.update(
                conversation,
                timer_enabled=True,
                timer_total_seconds=base_remaining + extension_seconds,
                timer_remaining_seconds=base_remaining + extension_seconds,
                timer_started_at=datetime.now(timezone.utc),
                interview_status=ConversationManager.STATUS_ACTIVE,
            )

    @staticmethod
    def stop_interview(conversation_id: int, user: User) -> Conversation:
        conversation = ConversationManager.get_conversation(conversation_id, user)
        return ConversationRepository.update(
            conversation,
            timer_remaining_seconds=ConversationManager.get_remaining_seconds(conversation),
            timer_started_at=None,
            interview_status=ConversationManager.STATUS_STOPPED,
        )
