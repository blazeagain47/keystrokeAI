import os
import time
from collections import defaultdict, deque
from typing import Deque, Dict, Optional

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
        path="/",
    )


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- Minimal brute-force guard -----------------------------------------
# In-memory, per-process sliding-window limiter. This is intentionally
# simple: it's enough to blunt naive credential-stuffing / brute-force
# scripts hitting a single backend process. It is NOT a substitute for
# proper edge/WAF rate limiting (e.g. at Caddy/Cloudflare) if this ever
# needs to scale beyond one process — state here does not survive a
# restart and is not shared across multiple worker processes.
_LOGIN_WINDOW_SECONDS = 5 * 60
_LOGIN_MAX_ATTEMPTS = 10
_REGISTER_WINDOW_SECONDS = 60 * 60
_REGISTER_MAX_ATTEMPTS = 8

_login_attempts: Dict[str, Deque[float]] = defaultdict(deque)
_register_attempts: Dict[str, Deque[float]] = defaultdict(deque)


def _client_ip(req: Request) -> str:
    fwd = req.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return req.client.host if req.client else "unknown"


def _check_rate_limit(bucket: Dict[str, Deque[float]], key: str, window_s: int, max_attempts: int) -> None:
    now = time.time()
    attempts = bucket[key]
    while attempts and now - attempts[0] > window_s:
        attempts.popleft()
    if len(attempts) >= max_attempts:
        raise HTTPException(status_code=429, detail="Too many attempts. Please try again later.")
    attempts.append(now)


def to_profile(u: User) -> UserProfile:
    return UserProfile(
        id=u.id, username=u.username, email=u.email,
        xpTotal=u.xp_total, streak=u.streak, createdAt=u.created_at
    )


@router.post("/register", response_model=UserProfile)
def register(req: RegisterRequest, resp: Response, request: Request, db: Session = Depends(get_db)):
    _check_rate_limit(_register_attempts, _client_ip(request), _REGISTER_WINDOW_SECONDS, _REGISTER_MAX_ATTEMPTS)
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
def login(req: LoginRequest, resp: Response, request: Request, db: Session = Depends(get_db)):
    ip = _client_ip(request)
    _check_rate_limit(_login_attempts, ip, _LOGIN_WINDOW_SECONDS, _LOGIN_MAX_ATTEMPTS)
    _check_rate_limit(_login_attempts, f"{ip}:{req.username.lower()}", _LOGIN_WINDOW_SECONDS, _LOGIN_MAX_ATTEMPTS)
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


