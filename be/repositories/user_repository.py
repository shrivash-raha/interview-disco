from contextlib import contextmanager

from sqlalchemy.orm import Session

from db.database import SessionLocal
from db.models import User


class UserRepository:
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
    def get_by_email(email: str, db: Session | None = None) -> User | None:
        with UserRepository._session(db) as session:
            return session.query(User).filter(User.email == email.lower()).first()

    @staticmethod
    def get_by_session_token(token: str, db: Session | None = None) -> User | None:
        with UserRepository._session(db) as session:
            return session.query(User).filter(User.session_token == token).first()

    @staticmethod
    def create(*, first_name: str, last_name: str, email: str, password_hash: str, db: Session | None = None) -> User:
        with UserRepository._session(db) as session:
            user = User(
                first_name=first_name,
                last_name=last_name,
                email=email.lower(),
                password_hash=password_hash,
            )
            session.add(user)
            session.flush()
            return user

    @staticmethod
    def save_session_token(user: User, token: str | None, db: Session | None = None) -> User:
        with UserRepository._session(db) as session:
            managed_user = session.merge(user)
            managed_user.session_token = token
            session.commit()
            session.refresh(managed_user)
            return managed_user

    @staticmethod
    def ensure_password_hash(user: User, password_hash: str, db: Session | None = None) -> User:
        with UserRepository._session(db) as session:
            managed_user = session.merge(user)
            managed_user.password_hash = password_hash
            session.flush()
            return managed_user
