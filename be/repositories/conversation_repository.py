from datetime import datetime
from contextlib import contextmanager

from sqlalchemy.orm import Session

from db.database import SessionLocal
from db.models import Conversation

_UNSET = object()


class ConversationRepository:
    @staticmethod
    @contextmanager
    def _session(db: Session | None = None):
        if db is not None:
            yield db
            return
        session = SessionLocal()
        try:
            yield session
        finally:
            session.close()

    @staticmethod
    def list_by_user(user_id: int, db: Session | None = None) -> list[Conversation]:
        with ConversationRepository._session(db) as session:
            return (
                session.query(Conversation)
                .filter(Conversation.user_id == user_id, Conversation.is_deleted.is_(False))
                .order_by(Conversation.created_at.desc(), Conversation.id.desc())
                .all()
            )

    @staticmethod
    def get_by_id_and_user(conversation_id: int, user_id: int, db: Session | None = None) -> Conversation | None:
        with ConversationRepository._session(db) as session:
            return (
                session.query(Conversation)
                .filter(
                    Conversation.id == conversation_id,
                    Conversation.user_id == user_id,
                    Conversation.is_deleted.is_(False),
                )
                .first()
            )

    @staticmethod
    def create(*, name: str, user_id: int, db: Session | None = None) -> Conversation:
        with ConversationRepository._session(db) as session:
            conversation = Conversation(
                name=name,
                description=None,
                job_description_text=None,
                extra_details=None,
                job_description_file_path=None,
                interview_status="active",
                is_deleted=False,
                timer_enabled=False,
                timer_total_seconds=None,
                timer_started_at=None,
                timer_remaining_seconds=None,
                user_id=user_id,
            )
            session.add(conversation)
            session.commit()
            session.refresh(conversation)
            return conversation

    @staticmethod
    def soft_delete(conversation: Conversation, db: Session | None = None) -> Conversation:
        with ConversationRepository._session(db) as session:
            managed_conversation = session.merge(conversation)
            managed_conversation.is_deleted = True
            session.commit()
            session.refresh(managed_conversation)
            return managed_conversation

    @staticmethod
    def save(conversation: Conversation, db: Session | None = None) -> Conversation:
        with ConversationRepository._session(db) as session:
            managed_conversation = session.merge(conversation)
            session.commit()
            session.refresh(managed_conversation)
            return managed_conversation

    @staticmethod
    def update(
        conversation: Conversation,
        *,
        name: str | object = _UNSET,
        job_description_text: str | None | object = _UNSET,
        extra_details: str | None | object = _UNSET,
        job_description_file_path: str | None | object = _UNSET,
        interaction_mode: str | object = _UNSET,
        timer_enabled: bool | object = _UNSET,
        timer_total_seconds: int | None | object = _UNSET,
        timer_started_at: datetime | None | object = _UNSET,
        timer_remaining_seconds: int | None | object = _UNSET,
        interview_status: str | object = _UNSET,
        db: Session | None = None,
    ) -> Conversation:
        with ConversationRepository._session(db) as session:
            managed_conversation = session.merge(conversation)
            if name is not _UNSET:
                managed_conversation.name = name
            if job_description_text is not _UNSET:
                managed_conversation.job_description_text = job_description_text
            if extra_details is not _UNSET:
                managed_conversation.extra_details = extra_details
            if job_description_file_path is not _UNSET:
                managed_conversation.job_description_file_path = job_description_file_path
            if interaction_mode is not _UNSET:
                managed_conversation.interaction_mode = interaction_mode
            if timer_enabled is not _UNSET:
                managed_conversation.timer_enabled = timer_enabled
            if timer_total_seconds is not _UNSET:
                managed_conversation.timer_total_seconds = timer_total_seconds
            if timer_started_at is not _UNSET:
                managed_conversation.timer_started_at = timer_started_at
            if timer_remaining_seconds is not _UNSET:
                managed_conversation.timer_remaining_seconds = timer_remaining_seconds
            if interview_status is not _UNSET:
                managed_conversation.interview_status = interview_status
            session.commit()
            session.refresh(managed_conversation)
            return managed_conversation

    @staticmethod
    def first_for_user(user_id: int, db: Session | None = None) -> Conversation | None:
        with ConversationRepository._session(db) as session:
            return (
                session.query(Conversation)
                .filter(Conversation.user_id == user_id, Conversation.is_deleted.is_(False))
                .order_by(Conversation.id.asc())
                .first()
            )
