from fastapi import APIRouter, HTTPException, Depends
from typing import List, Tuple
from app.auth.format_role import get_user_id_and_role
from app.services import categories_service


from app.schemas.categories import (
  CategoryCreate, 
  CategoryRead, 
  CategoryUpdate
)

router = APIRouter(
  prefix="/api/categories"
)


# GET all
@router.get("/", response_model=List[CategoryRead])
async def list_categories():
  rows = await categories_service.get_categories()
  return rows


# POST (admin only)
@router.post("/", response_model=CategoryRead)
async def create_category(payload: CategoryCreate, user_data: Tuple[int, str] = Depends(get_user_id_and_role)):

  CURRENT_USER_ID, role = user_data

  if role != "admin":
    raise HTTPException(status_code=403, detail="Admin only")

  row = await categories_service.create_category(
    payload,
    CURRENT_USER_ID,
    role
  )

  if not row:
    raise HTTPException(status_code=400, detail="Category not created")

  return row


# PUT (admin only)
@router.put("/{category_id}", response_model=CategoryRead)
async def update_category(category_id: int, payload: CategoryUpdate, user_data: Tuple[int, str] = Depends(get_user_id_and_role)):

  CURRENT_USER_ID, role = user_data

  row = await categories_service.update_category(
    category_id,
    payload,
    CURRENT_USER_ID,
    role
  )

  if not row:
    raise HTTPException(status_code=404, detail="Category not found or not allowed to edit")

  return row


# DELETE (admin only)
@router.delete("/{category_id}")
async def delete_category(category_id: int, user_data: Tuple[int, str] = Depends(get_user_id_and_role)):
                          
  CURRENT_USER_ID, role = user_data

  deleted = await categories_service.delete_category(
    category_id,
    CURRENT_USER_ID,
    role
  )

  if not deleted:
    raise HTTPException(status_code=404, detail="Category not found or not allowed to delete")

  return {"status": "deleted"}
