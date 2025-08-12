from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from sqlalchemy.orm import Session

from .database import SessionLocal
from .models import User
from .schemas import RegisterRequest, LoginRequest, UserProfile
from .security import hash_password, verify_password, make_jwt, parse_jwt, COOKIE_NAME


router = APIRouter(prefix="/auth", tags=["auth"])


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
    token = make_jwt(u.id)
    resp.set_cookie(
        key=COOKIE_NAME, value=token, httponly=True, samesite="lax",
        secure=False  # set True behind HTTPS
    )
    return to_profile(u)


@router.post("/login", response_model=UserProfile)
def login(req: LoginRequest, resp: Response, db: Session = Depends(get_db)):
    u: Optional[User] = db.query(User).filter(User.username == req.username).first()
    if not u or not verify_password(req.password, u.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = make_jwt(u.id)
    resp.set_cookie(
        key=COOKIE_NAME, value=token, httponly=True, samesite="lax",
        secure=False
    )
    return to_profile(u)


@router.post("/logout")
def logout(resp: Response):
    resp.delete_cookie(COOKIE_NAME, samesite="lax")
    return {"ok": True}


@router.get("/me", response_model=UserProfile)
def me(req: Request, db: Session = Depends(get_db)):
    token = req.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_id = parse_jwt(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid session")
    u = db.query(User).get(user_id)
    if not u:
        raise HTTPException(status_code=401, detail="User not found")
    return to_profile(u)


