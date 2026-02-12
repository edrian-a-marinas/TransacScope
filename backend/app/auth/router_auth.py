from fastapi import APIRouter, Depends, HTTPException
from app.schemas.users import UserCreate, UserRead, UserLogin
from app.services.users_service import create_user, get_user_by_email
from .security import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth")

@router.post("/register", response_model=UserRead)
async def register_user(user: UserCreate):
  hashed_password = hash_password(user.password)
  new_user = await create_user(user, hashed_password)
  return new_user

@router.post("/login")
async def login_user(payload: UserLogin):
  db_user = await get_user_by_email(payload.email)
  if not db_user or not verify_password(payload.password, db_user["password_hash"]):
    raise HTTPException(status_code=401, detail="Invalid credentials")
  access_token = create_access_token({
    "user_id": db_user["id"],
    "role_id": db_user["role_id"]
  })
  return {"access_token": access_token, "token_type": "bearer"}

@router.post("/logout")
async def logout_user(current_user: dict = Depends(get_current_user)):
  # For now, just a dummy endpoint; token blacklist can be implemented later
  return {"detail": "Logged out"}
