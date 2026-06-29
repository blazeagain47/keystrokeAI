import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from sqlalchemy.orm import Session

from .database import SessionLocal
from .models import User
from .schemas import RegisterRequest, LoginRequest, UserProfile
from .security import hash_password, verify_password, make_jwt, parse_jwt, COOKIE_NAME


router = APIRouter(prefix="/auth", tags=["auth"])

# APP_ENV="production" is the canonical way to mark this backend as prod.
# NODE_ENV is accepted as a fallback for consistency with the JS ecosystem.
_IS_PROD: bool = os.getenv("APP_ENV", os.getenv("NODE_ENV", "development")) == "production"
_COOKIE_NAME: str = os.getenv("JWT_COOKIE_NAME", COOKIE_NAME)
_COOKIE_TTL: int = int(os.getenv("JWT_COOKIE_TTL_DAYS", "7")) * 24 * 60 * 60


def _set_session_cookie(resp: Response, token: str) -> None:
    resp.set_cookie(
        key=_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=_IS_PROD,
        max_age=_COOKIE_TTL,
        expires=_COOKIE_TTL,
        path="/",
    )


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def to_profile(u: User) -> UserProfile:
    return UserProfile(
        id=u.id, username=u.username, email=u.email,
        xpTotal=u.xp_total, streak=u.streak, createdAt=u.created_at
    )


@router.post("/register", response_model=UserProfile)
def register(req: RegisterRequest, resp: Response, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == req.username).first()
    if existing:
        raise HTTPException(status_code=409, detail="Username already taken")
    u = User(
        username=req.username.strip(),
        email=(req.email or None),
        password_hash=hash_password(req.password),
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    _set_session_cookie(resp, make_jwt(u.id))
    return to_profile(u)


@router.post("/login", response_model=UserProfile)
def login(req: LoginRequest, resp: Response, db: Session = Depends(get_db)):
    u: Optional[User] = db.query(User).filter(User.username == req.username).first()
    if not u or not verify_password(req.password, u.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    _set_session_cookie(resp, make_jwt(u.id))
    return to_profile(u)


@router.post("/logout")
def logout(resp: Response):
    resp.delete_cookie(key=_COOKIE_NAME, samesite="lax", path="/")
    return {"ok": True}


@router.get("/me", response_model=UserProfile)
def me(req: Request, db: Session = Depends(get_db)):
    token = req.cookies.get(_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_id = parse_jwt(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid session")
    u = db.query(User).get(user_id)
    if not u:
        raise HTTPException(status_code=401, detail="User not found")
    return to_profile(u)


