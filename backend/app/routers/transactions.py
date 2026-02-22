from fastapi import APIRouter, HTTPException, Depends
from typing import List, Tuple

from app.auth.format_role import get_user_id_and_role
from app.services import transactions_service

from app.schemas.transactions import (
  TransactionCreate,
  TransactionUpdate,
  TransactionRead,
  TransactionHistoryRead
)

router = APIRouter(
  prefix="/api/transactions"
)

# possible new feature or ddition , make the def logged and user role in other file, then just import it so its a module other file can import it 

@router.get("/history", response_model=List[TransactionHistoryRead])
async def get_transaction_history(user_data: Tuple[int, str] = Depends(get_user_id_and_role)):

  CURRENT_USER_ID, role = user_data
  rows = await transactions_service.get_transactions_history(CURRENT_USER_ID, role)

  return rows


@router.get("/", response_model=List[TransactionRead])
async def get_transactions(user_data: Tuple[int, str] = Depends(get_user_id_and_role)):

  CURRENT_USER_ID, role = user_data
  rows = await transactions_service.get_transactions(CURRENT_USER_ID, role)
  
  return rows


@router.get("/{transaction_id}", response_model=TransactionRead)
async def get_transactions_by_id(transaction_id: int, user_data: Tuple[int, str] = Depends(get_user_id_and_role)):

  CURRENT_USER_ID, role = user_data

  rows = await transactions_service.get_transaction_by_id(transaction_id, CURRENT_USER_ID, role)
  
  if not rows:
    raise HTTPException(status_code=404, detail="Transaction not found")
  
  return rows





@router.post("/", response_model=TransactionRead)
async def create_transaction(payload: TransactionCreate, user_data: Tuple[int, str] = Depends(get_user_id_and_role)):

  CURRENT_USER_ID, role = user_data
  row = await transactions_service.create_transaction(
    payload,
    CURRENT_USER_ID,
  )

  if not row:
    raise HTTPException(status_code=400, detail="Transaction not created")
  
  return row


@router.put("/{transaction_id}", response_model=TransactionRead)
async def update_transaction(transaction_id: int, payload: TransactionUpdate, user_data: Tuple[int, str] = Depends(get_user_id_and_role)):

  CURRENT_USER_ID, role = user_data

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
async def delete_transaction(transaction_id: int, user_data: Tuple[int, str] = Depends(get_user_id_and_role)):

  CURRENT_USER_ID, role = user_data
  deleted = await transactions_service.delete_transaction(
    transaction_id,
    CURRENT_USER_ID,
    role
  )
  if not deleted:
    raise HTTPException(status_code=404, detail="Transaction not found or not allowed to delete")
  return {"status": "deleted"}



