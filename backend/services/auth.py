"""
Auth service — bcrypt password hashing + JWT token generation/verification.
In-memory user store (swap for DB in production).
"""

import os
import time
import uuid
import hmac
import hashlib
import base64
import json
from typing import Optional

# ── Password hashing (bcrypt if available, sha256 fallback) ──────────────────

def _hash_password(password: str) -> str:
    try:
        import bcrypt
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    except ImportError:
        salt = os.urandom(32)
        key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 310_000)
        return base64.b64encode(salt + key).decode()

def _verify_password(password: str, hashed: str) -> bool:
    try:
        import bcrypt
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except ImportError:
        raw = base64.b64decode(hashed.encode())
        salt, stored_key = raw[:32], raw[32:]
        key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 310_000)
        return hmac.compare_digest(key, stored_key)


# ── JWT (HS256, stdlib only) ──────────────────────────────────────────────────

SECRET = os.getenv("JWT_SECRET", "recruitiq-dev-secret-change-in-prod")
EXPIRY = 60 * 60 * 24 * 7  # 7 days


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def _b64url_decode(s: str) -> bytes:
    pad = 4 - len(s) % 4
    return base64.urlsafe_b64decode(s + "=" * (pad % 4))


def create_token(user_id: str, email: str) -> str:
    header = _b64url(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload = _b64url(json.dumps({
        "sub": user_id,
        "email": email,
        "iat": int(time.time()),
        "exp": int(time.time()) + EXPIRY,
    }).encode())
    sig_input = f"{header}.{payload}".encode()
    sig = _b64url(hmac.new(SECRET.encode(), sig_input, hashlib.sha256).digest())
    return f"{header}.{payload}.{sig}"


def decode_token(token: str) -> Optional[dict]:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header, payload, sig = parts
        expected_sig = _b64url(
            hmac.new(SECRET.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest()
        )
        if not hmac.compare_digest(sig, expected_sig):
            return None
        data = json.loads(_b64url_decode(payload))
        if data.get("exp", 0) < time.time():
            return None
        return data
    except Exception:
        return None


# ── In-memory user store ──────────────────────────────────────────────────────

# email -> { id, email, name, hashed_password, created_at }
_users: dict[str, dict] = {}


def create_user(email: str, password: str, name: str) -> dict:
    if email in _users:
        raise ValueError("Email already registered.")
    if len(password) < 6:
        raise ValueError("Password must be at least 6 characters.")
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": email.lower().strip(),
        "name": name.strip(),
        "hashed_password": _hash_password(password),
        "created_at": int(time.time()),
    }
    _users[email.lower().strip()] = user
    return _safe(user)


def authenticate_user(email: str, password: str) -> dict:
    user = _users.get(email.lower().strip())
    if not user or not _verify_password(password, user["hashed_password"]):
        raise ValueError("Invalid email or password.")
    return _safe(user)


def get_user_by_id(user_id: str) -> Optional[dict]:
    for user in _users.values():
        if user["id"] == user_id:
            return _safe(user)
    return None


def _safe(user: dict) -> dict:
    """Return user dict without password."""
    return {k: v for k, v in user.items() if k != "hashed_password"}