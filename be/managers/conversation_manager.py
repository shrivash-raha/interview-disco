from datetime import datetime, timezone

from sqlalchemy.orm import Session

from db.models import Conversation, Message, User


class ConversationManager:
    DEFAULT_TIMER_SECONDS = 30 * 60
    STATUS_ACTIVE = "active"
    STATUS_PAUSED = "paused"
    STATUS_STOPPED = "stopped"

    @staticmethod
    def list_conversations(user: User, db: Session) -> list[Conversation]:
        return (
            db.query(Conversation)
            .filter(Conversation.user_id == user.id)
            .order_by(Conversation.created_at.desc(), Conversation.id.desc())
            .all()
        )

    @staticmethod
    def _normalize_name(name: str) -> str:
        return " ".join(name.strip().split()).lower()

    @staticmethod
    def _ensure_unique_name(name: str, user: User, db: Session, exclude_conversation_id: int | None = None) -> None:
        normalized = ConversationManager._normalize_name(name)
        conversations = db.query(Conversation).filter(Conversation.user_id == user.id).all()
        for conversation in conversations:
            if exclude_conversation_id is not None and conversation.id == exclude_conversation_id:
                continue
            if ConversationManager._normalize_name(conversation.name) == normalized:
                raise ValueError("A practice interview with this name already exists")

    @staticmethod
    def create_conversation(name: str, user: User, db: Session) -> Conversation:
        ConversationManager._ensure_unique_name(name, user, db)
        conversation = Conversation(
            name=name,
            description=None,
            job_description_text=None,
            extra_details=None,
            job_description_file_path=None,
            interview_status=ConversationManager.STATUS_ACTIVE,
            timer_enabled=True,
            timer_total_seconds=ConversationManager.DEFAULT_TIMER_SECONDS,
            timer_started_at=None,
            timer_remaining_seconds=ConversationManager.DEFAULT_TIMER_SECONDS,
            user_id=user.id,
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        return conversation

    @staticmethod
    def delete_conversation(conversation_id: int, user: User, db: Session) -> None:
        conversation = ConversationManager.get_conversation(conversation_id, user, db)
        db.delete(conversation)
        db.commit()

    @staticmethod
    def get_conversation(conversation_id: int, user: User, db: Session) -> Conversation:
        conversation = (
            db.query(Conversation)
            .filter(Conversation.id == conversation_id, Conversation.user_id == user.id)
            .first()
        )
        if not conversation:
            raise ValueError("Conversation not found")
        return conversation

    @staticmethod
    def list_messages(conversation_id: int, user: User, db: Session) -> list[Message]:
        ConversationManager.get_conversation(conversation_id, user, db)
        return (
            db.query(Message)
            .filter(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc(), Message.id.asc())
            .all()
        )

    @staticmethod
    def list_recent_messages(conversation_id: int, limit: int, db: Session) -> list[Message]:
        return (
            db.query(Message)
            .filter(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.desc(), Message.id.desc())
            .limit(limit)
            .all()[::-1]
        )

    @staticmethod
    def has_messages(conversation_id: int, db: Session) -> bool:
        return db.query(Message.id).filter(Message.conversation_id == conversation_id).first() is not None

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
    def update_context(
        conversation_id: int,
        user: User,
        db: Session,
        *,
        name: str | None = None,
        job_description_text: str | None = None,
        extra_details: str | None = None,
        job_description_file_path: str | None = None,
        timer_enabled: bool | None = None,
        timer_total_seconds: int | None = None,
    ) -> Conversation:
        conversation = ConversationManager.get_conversation(conversation_id, user, db)
        if ConversationManager.has_messages(conversation_id, db):
            raise ValueError("Conversation context cannot be edited after the conversation has started")
        if name is not None:
            ConversationManager._ensure_unique_name(name, user, db, exclude_conversation_id=conversation_id)
            conversation.name = name
        if job_description_text is not None:
            conversation.job_description_text = job_description_text
        if extra_details is not None:
            conversation.extra_details = extra_details
        if job_description_file_path is not None:
            conversation.job_description_file_path = job_description_file_path
        if timer_enabled is not None:
            conversation.timer_enabled = timer_enabled
            if not timer_enabled:
                conversation.timer_total_seconds = None
                conversation.timer_started_at = None
                conversation.timer_remaining_seconds = None
            else:
                conversation.timer_total_seconds = timer_total_seconds or conversation.timer_total_seconds or ConversationManager.DEFAULT_TIMER_SECONDS
                conversation.timer_remaining_seconds = conversation.timer_total_seconds
                conversation.timer_started_at = datetime.now(timezone.utc)
                conversation.interview_status = ConversationManager.STATUS_ACTIVE
        elif timer_total_seconds is not None and conversation.timer_enabled:
            conversation.timer_total_seconds = timer_total_seconds
            conversation.timer_remaining_seconds = timer_total_seconds
            conversation.timer_started_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(conversation)
        return conversation

    @staticmethod
    def pause_interview(conversation_id: int, user: User, db: Session) -> Conversation:
        conversation = ConversationManager.get_conversation(conversation_id, user, db)
        if conversation.interview_status == ConversationManager.STATUS_STOPPED:
            raise ValueError("A stopped practice interview cannot be paused")
        conversation.timer_remaining_seconds = ConversationManager.get_remaining_seconds(conversation)
        conversation.timer_started_at = None
        conversation.interview_status = ConversationManager.STATUS_PAUSED
        db.commit()
        db.refresh(conversation)
        return conversation

    @staticmethod
    def resume_interview(
        conversation_id: int,
        user: User,
        db: Session,
        *,
        extension_minutes: int | None = None,
        continue_indefinitely: bool = False,
    ) -> Conversation:
        conversation = ConversationManager.get_conversation(conversation_id, user, db)
        if conversation.interview_status == ConversationManager.STATUS_STOPPED:
            raise ValueError("A stopped practice interview cannot be resumed")

        if continue_indefinitely:
            conversation.timer_enabled = False
            conversation.timer_total_seconds = None
            conversation.timer_remaining_seconds = None
            conversation.timer_started_at = None
        else:
            base_remaining = ConversationManager.get_remaining_seconds(conversation) or conversation.timer_remaining_seconds or conversation.timer_total_seconds or ConversationManager.DEFAULT_TIMER_SECONDS
            extension_seconds = (extension_minutes or 0) * 60
            conversation.timer_enabled = True
            conversation.timer_total_seconds = base_remaining + extension_seconds
            conversation.timer_remaining_seconds = conversation.timer_total_seconds
            conversation.timer_started_at = datetime.now(timezone.utc)

        conversation.interview_status = ConversationManager.STATUS_ACTIVE
        db.commit()
        db.refresh(conversation)
        return conversation

    @staticmethod
    def stop_interview(conversation_id: int, user: User, db: Session) -> Conversation:
        conversation = ConversationManager.get_conversation(conversation_id, user, db)
        conversation.timer_remaining_seconds = ConversationManager.get_remaining_seconds(conversation)
        conversation.timer_started_at = None
        conversation.interview_status = ConversationManager.STATUS_STOPPED
        db.commit()
        db.refresh(conversation)
        return conversation
