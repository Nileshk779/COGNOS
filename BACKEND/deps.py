from fastapi import Header, HTTPException

from auth import verify_token


def get_current_user(
    authorization: str = Header(default=None)
):

    if authorization is None:
        raise HTTPException(
            status_code=401,
            detail="Authorization header missing."
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization header."
        )

    token = authorization.split(" ")[1]

    return verify_token(token)