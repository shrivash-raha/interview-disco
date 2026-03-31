from sqlalchemy import inspect, text

from auth import hash_password
from db.database import engine, SessionLocal, Base
from repositories.conversation_repository import ConversationRepository
from repositories.user_repository import UserRepository

DEFAULT_EMAIL = "shri@mail.com"
DEFAULT_PASSWORD = "demo123"


def init_database():
    Base.metadata.create_all(bind=engine)
    _migrate_schema()
    _seed_defaults()


def _migrate_schema():
    inspector = inspect(engine)
    user_columns = {column["name"] for column in inspector.get_columns("users")} if inspector.has_table("users") else set()
    conversation_columns = {column["name"] for column in inspector.get_columns("conversations")} if inspector.has_table("conversations") else set()

    with engine.begin() as connection:
        if "password_hash" not in user_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT ''"))
        if "session_token" not in user_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN session_token VARCHAR(255)"))
        if "job_description_text" not in conversation_columns:
            connection.execute(text("ALTER TABLE conversations ADD COLUMN job_description_text TEXT"))
        if "extra_details" not in conversation_columns:
            connection.execute(text("ALTER TABLE conversations ADD COLUMN extra_details TEXT"))
        if "job_description_file_path" not in conversation_columns:
            connection.execute(text("ALTER TABLE conversations ADD COLUMN job_description_file_path TEXT"))
        if "interaction_mode" not in conversation_columns:
            connection.execute(text("ALTER TABLE conversations ADD COLUMN interaction_mode VARCHAR(16) NOT NULL DEFAULT 'text'"))
        if "interview_status" not in conversation_columns:
            connection.execute(text("ALTER TABLE conversations ADD COLUMN interview_status VARCHAR(32) NOT NULL DEFAULT 'active'"))
        if "is_deleted" not in conversation_columns:
            connection.execute(text("ALTER TABLE conversations ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT 0"))
        if "timer_enabled" not in conversation_columns:
            connection.execute(text("ALTER TABLE conversations ADD COLUMN timer_enabled BOOLEAN NOT NULL DEFAULT 0"))
        if "timer_total_seconds" not in conversation_columns:
            connection.execute(text("ALTER TABLE conversations ADD COLUMN timer_total_seconds INTEGER"))
        if "timer_started_at" not in conversation_columns:
            connection.execute(text("ALTER TABLE conversations ADD COLUMN timer_started_at DATETIME"))
        if "timer_remaining_seconds" not in conversation_columns:
            connection.execute(text("ALTER TABLE conversations ADD COLUMN timer_remaining_seconds INTEGER"))


def _seed_defaults():
    db = SessionLocal()
    try:
        user = UserRepository.get_by_email(DEFAULT_EMAIL, db)
        if not user:
            user = UserRepository.create(
                first_name="Shri",
                last_name="Shri",
                email=DEFAULT_EMAIL,
                password_hash=hash_password(DEFAULT_PASSWORD),
                db=db,
            )
        elif not user.password_hash:
            UserRepository.ensure_password_hash(user, hash_password(DEFAULT_PASSWORD), db)

        conversation = ConversationRepository.first_for_user(user.id, db)
        if not conversation:
            ConversationRepository.create(name="Interview Prep", user_id=user.id, db=db)

        db.commit()
    except Exception as exc:
        db.rollback()
        print(f"Database initialization warning: {exc}")
    finally:
        db.close()
