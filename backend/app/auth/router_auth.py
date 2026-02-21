from fastapi import APIRouter, Depends, HTTPException
from app.schemas.users import UserCreate, UserRead, UserLogin
from .login import verify_user
from .register import create_user
from .security import create_access_token, get_current_user
from app.services.users_service import get_user_by_id  

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

    # Return the full user info along with token
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": db_user  # <-- include user object
    }

@router.get("/me", response_model=UserRead)
async def get_me(current_user=Depends(get_current_user)):
    user = await get_user_by_id(current_user["id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user