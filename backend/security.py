import os, time, jwt
from passlib.hash import bcrypt as bcrypt_hash
from typing import Optional

JWT_SECRET = os.environ.get("KS_JWT_SECRET", "dev_only_change_me")
JWT_TTL_SECONDS = int(os.environ.get("KS_JWT_TTL_SECONDS", "604800"))  # 7d
COOKIE_NAME = "ks_session"


MAX_BCRYPT_BYTES = 72

def _bcrypt_bytes(p: str) -> bytes:
    return p.encode("utf-8")[:MAX_BCRYPT_BYTES]

def hash_password(plain: str) -> str:
    try:
        return bcrypt_hash.hash(plain)
    except ValueError as e:
        if "longer than 72" in str(e):
            return bcrypt_hash.hash(_bcrypt_bytes(plain))
        raise


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt_hash.verify(plain, hashed)
    except ValueError as e:
        if "longer than 72" in str(e):
            return bcrypt_hash.verify(_bcrypt_bytes(plain), hashed)
        raise


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

