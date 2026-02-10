from fastapi import APIRouter, HTTPException
from typing import List
from db.connection import get_pool
from app.auth import jwt
from app.services import transactions_service

from app.schemas.transactions import (
  TransactionCreate,
  TransactionUpdate,
  TransactionRead,
  TransactionHistoryRead
)


router = APIRouter(
  prefix="/transactions"
)

# possible new feature or ddition , make the def logged and user role in other file, then just import it so its a module other file can import it 



# Temporary placeholder; replace with authenticated user ID from JWT/session later
# In the future, add auth dependency here (e.g., current_user: User = Depends(get_current_user))
# to protect the endpoint and filter transactions by user/role permissions.
# admins can see all transaction of literally all, 
# Standard only see all their own transactions history
# example JWT place holder temporary
# always change each other of user logged and admin every time you change the other



@router.get("/", response_model=List[TransactionRead])
async def list_transactions():
  current_user_id = await jwt.get_logged_in_user_id()
  role = await jwt.get_user_role(current_user_id)

  rows = await transactions_service.get_transactions(current_user_id, role)
  
  return rows


@router.get("/history", response_model=List[TransactionHistoryRead])
async def list_transaction_history():
  current_user_id = await jwt.get_logged_in_user_id()
  role = await jwt.get_user_role(current_user_id)

  rows = await transactions_service.get_transactions_history(current_user_id, role)

  return rows


@router.post("/", response_model=TransactionRead)
async def create_transaction(payload: TransactionCreate):

  CURRENT_USER_ID = await jwt.get_logged_in_user_id()

  row = await transactions_service.create_transaction(
    payload,
    CURRENT_USER_ID,
  )

  if not row:
    raise HTTPException(status_code=400, detail="Transaction not created")
  
  return row


@router.put("/{transaction_id}", response_model=TransactionRead)
async def update_transaction(transaction_id: int, payload: TransactionUpdate):

  CURRENT_USER_ID = await jwt.get_logged_in_user_id()
  role = await jwt.get_user_role(CURRENT_USER_ID)

  # Only update own transaction
  row = await transactions_service.update_transaction(
    transaction_id,
    payload,
    CURRENT_USER_ID,
    role
  )

  if not row:
    raise HTTPException(status_code=404, detail="Transaction not found or not allowed to edit")
  
  return row


@router.delete("/{transaction_id}")
async def delete_transaction(transaction_id: int):

  CURRENT_USER_ID = await jwt.get_logged_in_user_id()
  role = await jwt.get_user_role(CURRENT_USER_ID)

  deleted = await transactions_service.delete_transaction(
    transaction_id,
    CURRENT_USER_ID,
    role
  )
  if not deleted:
    raise HTTPException(status_code=404, detail="Transaction not found or not allowed to delete")
  return {"status": "deleted"}



