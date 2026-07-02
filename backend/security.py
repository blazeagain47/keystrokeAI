import os, sys, time, jwt
from passlib.hash import bcrypt as bcrypt_hash
from typing import Optional

_IS_PROD = os.getenv("APP_ENV", os.getenv("NODE_ENV", "development")) == "production"
_DEV_DEFAULT_SECRET = "dev_only_change_me"

JWT_SECRET = os.environ.get("KS_JWT_SECRET")
if not JWT_SECRET:
    if _IS_PROD:
        # A guessable/shared JWT secret lets anyone forge a session cookie for
        # any user id — this must never silently fall back in production.
        print(
            "[bk] FATAL: KS_JWT_SECRET is not set in production. Refusing to "
            "start with a default/guessable signing secret.",
            file=sys.stderr,
        )
        raise RuntimeError("KS_JWT_SECRET must be set in production")
    print(
        "[bk] WARNING: KS_JWT_SECRET not set — using an insecure default for "
        "LOCAL DEVELOPMENT ONLY.",
        file=sys.stderr,
    )
    JWT_SECRET = _DEV_DEFAULT_SECRET

JWT_TTL_SECONDS = int(os.environ.get("KS_JWT_TTL_SECONDS", "604800"))  # 7d
COOKIE_NAME = "ks_session"


MAX_BCRYPT_BYTES = 72

def _bcrypt_bytes(s: str) -> bytes:
    # truncate to 72 bytes for bcrypt; bcrypt operates on bytes
    return s.encode("utf-8")[:MAX_BCRYPT_BYTES]

def verify_password(plain: str, hashed: str) -> bool:
    """
    Verify a plaintext password against a bcrypt hash.
    If bcrypt raises 'password cannot be longer than 72 bytes',
    retry with the UTF-8 bytes truncated to 72.
    """
    try:
        return bcrypt_hash.verify(plain, hashed)
    except ValueError as e:
        if "longer than 72" in str(e):
            return bcrypt_hash.verify(_bcrypt_bytes(plain), hashed)
        raise

def hash_password(plain: str) -> str:
    """
    Hash a plaintext password with bcrypt.
    If bcrypt raises 'password cannot be longer than 72 bytes',
    hash the UTF-8 bytes truncated to 72.
    """
    try:
        return bcrypt_hash.hash(plain)
    except ValueError as e:
        if "longer than 72" in str(e):
            return bcrypt_hash.hash(_bcrypt_bytes(plain))
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

