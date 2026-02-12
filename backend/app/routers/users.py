from fastapi import APIRouter, Depends, HTTPException
from typing import List, Tuple

from app.auth.format_role import get_user_id_and_role
from app.services import users_service
from app.schemas.users import UserBase, UserRead, UserRoleUpdate, UserAdminRequest

SUPER_ADMIN_ID = 1

router = APIRouter(prefix="/api/users")


@router.get("/", response_model=List[UserRead])
async def list_users(user_data: Tuple[int, str] = Depends(get_user_id_and_role)):
  user_id, role = user_data
  if role != "admin" and user_id != SUPER_ADMIN_ID:
    raise HTTPException(status_code=403, detail="Admin only")
  return await users_service.get_all_users("admin")


@router.post("/request-admin")
async def request_admin_promotion(payload: UserAdminRequest, user_data: Tuple[int, str] = Depends(get_user_id_and_role)):
  user_id, role = user_data
  if role != "standard":
    raise HTTPException(status_code=400, detail="Only standard users can request admin")
  if not payload.request_admin:
    raise HTTPException(status_code=400, detail="Must request admin to proceed")
  await users_service.request_admin(user_id)
  return {"detail": "Request sent to admin"}


@router.put("/{target_user_id}/role", response_model=UserRead)
async def update_role(target_user_id: int, payload: UserRoleUpdate, user_data: Tuple[int, str] = Depends(get_user_id_and_role)):
  user_id, role = user_data
  current_user_role = "admin" if role == "admin" else "standard"
  updated_user = await users_service.update_user_role(
    target_user_id, payload.role_id, user_id, current_user_role
  )
  if not updated_user:
    raise HTTPException(status_code=403, detail="Cannot update role or user not found")
  return updated_user


@router.delete("/{target_user_id}/soft")
async def soft_delete(target_user_id: int, user_data: Tuple[int, str] = Depends(get_user_id_and_role)):
  user_id, role = user_data
  if role != "admin" and user_id != SUPER_ADMIN_ID:
    raise HTTPException(status_code=403, detail="Admin only")

  success = await users_service.soft_delete_user(
    target_user_id,
    user_id,
    role
  )

  if not success:
    raise HTTPException(status_code=404, detail="User not found")

  return {"detail": "User soft-deleted"}



@router.delete("/me")
async def hard_delete(user_data: Tuple[int, str] = Depends(get_user_id_and_role)):
  user_id, role = user_data
  success = await users_service.hard_delete_user(user_id, user_id)
  if not success:
    raise HTTPException(status_code=403, detail="Cannot delete other users")
  return {"detail": "Account permanently deleted"}


@router.patch("/me", response_model=UserRead)
async def update_self(payload: UserBase, user_data: Tuple[int, str] = Depends(get_user_id_and_role)):
  user_id, role = user_data
  updated_user = await users_service.update_self_info(user_id, payload)
  return updated_user
