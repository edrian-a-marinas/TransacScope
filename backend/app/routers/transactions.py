from fastapi import APIRouter, HTTPException
from typing import List

from app.schemas.transactions import (
  TransactionCreate,
  TransactionUpdate,
  TransactionRead
)
from app.services import transactions_service

router = APIRouter(
  prefix="/transactions",
  tags=["transactions"]
)

FAKE_USER_ID = 1  # Temporary placeholder; replace with authenticated user ID from JWT/session later
# In the future, add auth dependency here (e.g., current_user: User = Depends(get_current_user))
# to protect the endpoint and filter transactions by user/role permissions.
# admins can see all transaction of literally all, 
# Standard only see all their own transactions history
"""
example: @router.get("/", response_model=List[TransactionRead])
async def list_transactions(
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] == "admin":
        # admin sees everything
        rows = await transactions_service.get_all_transactions()
    else:
        # normal user sees only their own
        rows = await transactions_service.get_transactions_by_user(
            current_user["id"]
        )

    return rows
"""
@router.get("/", response_model=List[TransactionRead])
async def list_transactions():
  rows = await transactions_service.get_transactions(FAKE_USER_ID)
  return rows


@router.post("/", response_model=TransactionRead)
async def create_transaction(payload: TransactionCreate):
  row = await transactions_service.create_transaction(
    payload,
    FAKE_USER_ID
  )
  if not row:
    raise HTTPException(status_code=400, detail="Transaction not created")
  return row



@router.put("/{transaction_id}", response_model=TransactionRead)
async def update_transaction(transaction_id: int, payload: TransactionUpdate):
  # Only update own transaction
  row = await transactions_service.update_transaction(
    transaction_id,
    payload,
    FAKE_USER_ID
  )
  if not row:
    raise HTTPException(status_code=404, detail="Transaction not found or not allowed to edit")
  return row



@router.delete("/{transaction_id}")
async def delete_transaction(transaction_id: int):
  deleted = await transactions_service.delete_transaction(
    transaction_id,
    FAKE_USER_ID
  )
  if not deleted:
    raise HTTPException(status_code=404, detail="Transaction not found")
  return {"status": "deleted"}
