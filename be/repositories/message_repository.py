from contextlib import contextmanager

from sqlalchemy.orm import Session

from db.database import SessionLocal
from db.models import Message


class MessageRepository:
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
    def list_by_conversation(conversation_id: int, db: Session | None = None) -> list[Message]:
        with MessageRepository._session(db) as session:
            return (
                session.query(Message)
                .filter(Message.conversation_id == conversation_id)
                .order_by(Message.created_at.asc(), Message.id.asc())
                .all()
            )

    @staticmethod
    def list_recent_by_conversation(conversation_id: int, limit: int, db: Session | None = None) -> list[Message]:
        with MessageRepository._session(db) as session:
            return (
                session.query(Message)
                .filter(Message.conversation_id == conversation_id)
                .order_by(Message.created_at.desc(), Message.id.desc())
                .limit(limit)
                .all()[::-1]
            )

    @staticmethod
    def exists_for_conversation(conversation_id: int, db: Session | None = None) -> bool:
        with MessageRepository._session(db) as session:
            return session.query(Message.id).filter(Message.conversation_id == conversation_id).first() is not None

    @staticmethod
    def create(
        *,
        conversation_id: int,
        sender: str,
        message_type: str,
        text: str | None = None,
        audio_path: str | None = None,
        db: Session | None = None,
        commit: bool = True,
    ) -> Message:
        with MessageRepository._session(db) as session:
            message = Message(
                conversation_id=conversation_id,
                sender=sender,
                message_type=message_type,
                text=text,
                audio_path=audio_path,
            )
            session.add(message)
            if commit:
                session.commit()
                session.refresh(message)
            else:
                session.flush()
            return message

    @staticmethod
    def commit(db: Session | None = None) -> None:
        with MessageRepository._session(db) as session:
            session.commit()
