import os
import uuid

from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from authlib.integrations.starlette_client import OAuth
from starlette.middleware.sessions import SessionMiddleware

from database import Base, engine, SessionLocal
from models import User
from auth import (
    hash_password,
    verify_password,
    create_token,
)
from deps import get_current_user
from routers import goals as goals_router
from routers import home as home_router
from routers import marketplace as marketplace_router
from routers import teachers as teachers_router
from routers import pods as pods_router
from routers import growth as growth_router
from routers import opportunities as opportunities_router
from routers import quests as quests_router
from routers import notifications as notifications_router
from routers import calendar as calendar_router
from routers import messages as messages_router
from routers import interview as interview_router
from routers import onboarding_interview as onboarding_interview_router

load_dotenv()

# ---------------------------------------------------------
# FastAPI
# ---------------------------------------------------------

app = FastAPI(
    title="COGNOS API",
    version="1.0.0"
)

Base.metadata.create_all(bind=engine)

app.include_router(goals_router.router)
app.include_router(marketplace_router.router)
app.include_router(home_router.router)
app.include_router(teachers_router.router)
app.include_router(pods_router.router)
app.include_router(growth_router.router)
app.include_router(opportunities_router.router)
app.include_router(quests_router.router)
app.include_router(notifications_router.router)
app.include_router(calendar_router.router)
app.include_router(messages_router.router)
app.include_router(interview_router.router)
app.include_router(onboarding_interview_router.router)

# ---------------------------------------------------------
# Middleware
# ---------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SECRET_KEY_HASH")
)

# ---------------------------------------------------------
# OAuth
# ---------------------------------------------------------

oauth = OAuth()

oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={
        "scope": "openid email profile"
    }
)

# ---------------------------------------------------------
# Root
# ---------------------------------------------------------

@app.get("/")
def root():
    return {
        "project": "COGNOS",
        "status": "running"
    }

# ---------------------------------------------------------
# Register
# ---------------------------------------------------------

@app.post("/register")
def register(data: dict):

    db = SessionLocal()

    existing = db.query(User).filter(
        User.email == data["email"]
    ).first()

    if existing:
        db.close()
        raise HTTPException(
            status_code=400,
            detail="Email already registered."
        )

    user = User(
        id=str(uuid.uuid4()),
        name=data["name"],
        email=data["email"],
        password=hash_password(data["password"]),
        provider="EMAIL"
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_token(user)

    db.close()

    return {
        "token": token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email
        }
    }

# ---------------------------------------------------------
# Login
# ---------------------------------------------------------

@app.post("/login")
def login(data: dict):

    db = SessionLocal()

    user = db.query(User).filter(
        User.email == data["email"]
    ).first()

    if not user:
        db.close()
        raise HTTPException(
            status_code=404,
            detail="User not found."
        )

    if user.provider == "GOOGLE":
        db.close()
        raise HTTPException(
            status_code=400,
            detail="Please login using Google."
        )

    if not verify_password(
        data["password"],
        user.password
    ):
        db.close()
        raise HTTPException(
            status_code=401,
            detail="Invalid password."
        )

    token = create_token(user)

    db.close()

    return {
        "token": token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email
        }
    }

# ---------------------------------------------------------
# Google Login
# ---------------------------------------------------------

@app.get("/login/google")
async def google_login(request: Request):

    return await oauth.google.authorize_redirect(
        request,
        "http://localhost:8000/auth/callback",
        prompt="consent"
    )

# ---------------------------------------------------------
# Google Callback
# ---------------------------------------------------------

@app.get("/auth/callback")
async def google_callback(request: Request):

    token = await oauth.google.authorize_access_token(request)

    info = token["userinfo"]

    db = SessionLocal()

    user = db.query(User).filter(
        User.email == info["email"]
    ).first()

    if not user:

        user = User(
            id=str(uuid.uuid4()),
            name=info["name"],
            email=info["email"],
            password=None,
            provider="GOOGLE",
            pfp=info.get("picture")
        )

        db.add(user)

    else:

        user.name = info["name"]
        user.pfp = info.get("picture")

    db.commit()
    db.refresh(user)

    jwt_token = create_token(user)

    db.close()

    return RedirectResponse(
        f"http://localhost:5173/dashboard?token={jwt_token}"
    )

# ---------------------------------------------------------
# Current User
# ---------------------------------------------------------

@app.get("/me")
def me(user=Depends(get_current_user)):
    return user

# ---------------------------------------------------------
# Logout
# ---------------------------------------------------------

@app.post("/logout")
def logout():
    return {
        "message": "Logout handled on frontend by deleting JWT."
    }

@app.get("/onboarded")
def onboarded(user=Depends(get_current_user)):

    db = SessionLocal()
    u = db.query(User).filter(
        User.id == user["id"]
    ).first()
    db.close()
    return {
        "onboarded": u.onboarded
    }


@app.post("/onboarding/complete")
def complete(user=Depends(get_current_user)):

    db = SessionLocal()
    u = db.query(User).filter(
        User.id == user["id"]
    ).first()
    u.onboarded = True
    db.commit()
    db.close()
    return {
        "success": True
    }

