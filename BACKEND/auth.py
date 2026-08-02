import os
from datetime import datetime, timedelta

import jwt
import bcrypt
from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY_HASH")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7


# --------------------------------------------------
# Password Hashing
# --------------------------------------------------

def hash_password(password: str) -> str:
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        password.encode("utf-8"),
        hashed_password.encode("utf-8")
    )


# --------------------------------------------------
# JWT Token
# --------------------------------------------------

def create_token(user):

    payload = {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "provider": user.provider,
        "exp": datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


# --------------------------------------------------
# Verify JWT
# --------------------------------------------------

def verify_token(token: str):

    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        return payload

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Token has expired."
        )

    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="Invalid token."
        )


# --------------------------------------------------
# Optional Helper
# --------------------------------------------------

def decode_token(token: str):
    """
    Returns JWT payload without raising FastAPI errors.
    Useful for future internal services.
    """

    try:
        return jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )
    except:
        return None