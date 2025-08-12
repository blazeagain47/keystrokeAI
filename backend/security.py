import os, time, jwt
from passlib.hash import bcrypt
from typing import Optional

JWT_SECRET = os.environ.get("KS_JWT_SECRET", "dev_only_change_me")
JWT_TTL_SECONDS = int(os.environ.get("KS_JWT_TTL_SECONDS", "604800"))  # 7d
COOKIE_NAME = "ks_session"


def hash_password(plain: str) -> str:
    return bcrypt.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.verify(plain, hashed)


def make_jwt(user_id: int) -> str:
    now = int(time.time())
    payload = {"sub": str(user_id), "iat": now, "exp": now + JWT_TTL_SECONDS}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def parse_jwt(token: str) -> Optional[int]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return int(payload.get("sub"))
    except Exception:
        return None

