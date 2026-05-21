from fastapi import APIRouter, Depends, HTTPException, Request
from app.schemas.users import UserCreate, UserRead, UserLogin
from .login import verify_user
from .register import create_user
from .security import create_access_token, get_current_user
from app.services.users_service import get_user_by_id, get_password_expiry
from datetime import datetime, timezone
from app.core.limiter import limiter

""" 
── LAN DEPLOYMENT ONLY ──────────────────────────────────────────────────────
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env"))

REGISTER_ALLOWED_IP = os.getenv("REGISTER_ALLOWED_IP", "127.0.0.1")


@router.post("/register", response_model=UserRead)
async def register_user(user: UserCreate, request: Request):
  client_ip = request.client.host if request.client else None
  if client_ip != REGISTER_ALLOWED_IP:
    raise HTTPException(status_code=403, detail="Registration not allowed from this network.")
  return await create_user(user)

"""

router = APIRouter(prefix="/api/auth")


@router.post("/register", response_model=UserRead)
@limiter.limit("5/minute")
async def register_user(request: Request, user: UserCreate):
  return await create_user(user)


@router.post("/login")
@limiter.limit("10/minute")
async def login_user(payload: UserLogin, request: Request):
  ip = request.client.host if request.client else None
  db_user = await verify_user(payload.email, payload.password, ip)
  if not db_user:
    raise HTTPException(status_code=401, detail="Invalid email or password.")

  expires_at    = await get_password_expiry(db_user["id"])
  now           = datetime.now(timezone.utc)
  password_expired = (
    expires_at is not None and expires_at < now
  )

  access_token = create_access_token({
    "user_id":          db_user["id"],
    "role_id":          db_user["role_id"],
    "is_active":        db_user["is_active"],
    "password_expired": password_expired,
  })

  return {
    "access_token":     access_token,
    "token_type":       "bearer",
    "password_expired": password_expired,
    "user":             db_user,
  }


@router.get("/me", response_model=UserRead)
async def get_me(current_user=Depends(get_current_user)):
  user = await get_user_by_id(current_user["id"])
  if not user:
    raise HTTPException(status_code=404, detail="User not found")
  return user