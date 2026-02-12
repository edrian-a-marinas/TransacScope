from fastapi import APIRouter, Depends, HTTPException
from app.schemas.users import UserCreate, UserRead, UserLogin
from app.services.users_service import create_user, verify_user
from .security import create_access_token, get_current_user

router = APIRouter(prefix="/api/auth")

@router.post("/register", response_model=UserRead)
async def register_user(user: UserCreate):
  new_user = await create_user(user)
  return new_user

@router.post("/login")
async def login_user(payload: UserLogin):
  db_user = await verify_user(payload.email, payload.password)
  if not db_user:
    raise HTTPException(status_code=401, detail="Invalid credentials or inactive account")

  access_token = create_access_token({
    "user_id": db_user["id"],
    "role_id": db_user["role_id"]
  })

  return {
    "access_token": access_token,
    "token_type": "bearer"
  }

@router.post("/logout")
async def logout_user(current_user: dict = Depends(get_current_user)):
  return {"detail": "Logged out"}
