from fastapi import APIRouter, Depends, HTTPException, Request
from typing import List, Tuple
from app.core.limiter import limiter

from app.auth.format_role import get_user_id_and_role
from app.services import users_service
from app.schemas.users import UserBase, UserRead, UserRoleUpdate, PasswordChange, PasswordExpiryResponse

SUPER_ADMIN_ID = 1

router = APIRouter(prefix="/api/users")


@router.get("/", response_model=List[UserRead])
async def list_users(user_data: Tuple[int, str] = Depends(get_user_id_and_role)):
  CURRENT_USER_ID, role = user_data
  if role != "admin":
    raise HTTPException(status_code=403, detail="Admin only")
  return await users_service.get_all_users()

@router.get("/me/password-expiry", response_model=PasswordExpiryResponse)
async def get_my_password_expiry(
  user_data: Tuple[int, str] = Depends(get_user_id_and_role),
):
  user_id, _ = user_data
  expires_at = await users_service.get_password_expiry(user_id)
  return PasswordExpiryResponse(expires_at=expires_at)

@router.patch("/me/password")
@limiter.limit("5/minute")
async def change_my_password(
  request: Request,
  payload: PasswordChange,
  user_data: Tuple[int, str] = Depends(get_user_id_and_role),
):
  user_id, _ = user_data
  result = await users_service.change_password(user_id, payload.current_password, payload.new_password)
  if result is None:
    raise HTTPException(status_code=404, detail="User not found.")
  if result is False:
    raise HTTPException(status_code=401, detail="Current password is incorrect.")
  if result == "reused":
    raise HTTPException(status_code=409, detail="This password was used within the last 7 days and cannot be reused.")
  return {"detail": "Password changed successfully."}

# /me routes must come before /{target_user_id} to avoid route shadowing
# try
@router.patch("/me", response_model=UserRead)
@limiter.limit("20/minute")
async def update_self(request: Request, payload: UserBase, user_data: Tuple[int, str] = Depends(get_user_id_and_role)):
  user_id, role = user_data
  return await users_service.update_self_info(user_id, payload)


@router.delete("/me")
@limiter.limit("20/minute")
async def hard_delete(request: Request, user_data: Tuple[int, str] = Depends(get_user_id_and_role)):
  user_id, role = user_data
  success = await users_service.hard_delete_user(user_id, user_id)
  if not success:
    raise HTTPException(status_code=403, detail="Cannot delete other users")
  return {"detail": "Account permanently deleted"}


@router.put("/{target_user_id}/role", response_model=UserRead)
@limiter.limit("20/minute")
async def update_role(request: Request, target_user_id: int, payload: UserRoleUpdate, user_data: Tuple[int, str] = Depends(get_user_id_and_role)):
    user_id, role = user_data
    if user_id != SUPER_ADMIN_ID:
        raise HTTPException(status_code=403, detail="Only super admin can update roles")
    updated_user = await users_service.update_user_role(target_user_id, payload.role_id, user_id, role)
    if not updated_user:
        raise HTTPException(status_code=403, detail="Cannot update role or user not found")
    return updated_user


@router.put("/{target_user_id}/restore")
@limiter.limit("20/minute")
async def restore_user(request: Request, target_user_id: int, user_data: Tuple[int, str] = Depends(get_user_id_and_role)):
  user_id, role = user_data
  if role != "admin" and user_id != SUPER_ADMIN_ID:
    raise HTTPException(status_code=403, detail="Admin only")
  success = await users_service.restore_user(target_user_id, user_id, role)
  if not success:
    raise HTTPException(status_code=404, detail="User not found or cannot be restored")
  return {"detail": "User restored successfully"}


@router.delete("/{target_user_id}/soft")
@limiter.limit("10/minute")
async def soft_delete(request: Request, target_user_id: int, user_data: Tuple[int, str] = Depends(get_user_id_and_role)):
  user_id, role = user_data
  if role != "admin" and user_id != SUPER_ADMIN_ID:
    raise HTTPException(status_code=403, detail="Admin only")
  success = await users_service.soft_delete_user(target_user_id, user_id, role)
  if not success:
    raise HTTPException(status_code=404, detail="User not found")
  return {"detail": "User soft-deleted"}