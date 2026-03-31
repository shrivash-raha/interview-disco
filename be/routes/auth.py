from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import create_session_token, get_current_user, verify_password
from db.models import User
from repositories.user_repository import UserRepository

router = APIRouter(prefix="/auth", tags=["Auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
def login(request: LoginRequest):
    user = UserRepository.get_by_email(request.email)
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user = UserRepository.save_session_token(user, create_session_token())

    return {
        "token": user.session_token,
        "user": {
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
        },
    }


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    UserRepository.save_session_token(current_user, None)
    return {"success": True}


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "email": current_user.email,
    }
