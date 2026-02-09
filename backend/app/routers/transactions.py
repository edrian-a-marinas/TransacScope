from fastapi import APIRouter, HTTPException
from typing import List
from db.connection import get_pool

from app.services import transactions_service

from app.schemas.transactions import (
  TransactionCreate,
  TransactionUpdate,
  TransactionRead,
  TransactionHistoryRead
)


router = APIRouter(
  prefix="/transactions",
  tags=["transactions"]
)

# possible new feature or ddition , make the def logged and user role in other file, then just import it so its a module other file can import it 



# Temporary placeholder; replace with authenticated user ID from JWT/session later
# In the future, add auth dependency here (e.g., current_user: User = Depends(get_current_user))
# to protect the endpoint and filter transactions by user/role permissions.
# admins can see all transaction of literally all, 
# Standard only see all their own transactions history
# example JWT place holder temporary
# always change each other of user logged and admin every time you change the other
async def get_logged_in_user_id():
  """
  example of sql lines taking the user id of the logged in
  Where blah blah blah
  """
  #the emulation user_id_logged in as ADMIN
  user_id_of_logged_in = 2   # for reability only so this is the exaclt outpu of JWT / loggei n id
  return user_id_of_logged_in


async def get_user_role(current_user_id):  
  """
    if not current_user_id:
      return None

    pool = await get_pool()
    async with pool.acquire() as conn:
      row = await conn.fetchrow(
        
        SELECT r.name
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.id = $1
        ,
        current_user_id
      )
      return row["name"] if row else None
  """

  # the emulation for role as admin
  current_user_id = 'standard'       # place holder for admin example. can change to standard 
  fetched_role = current_user_id

  return fetched_role


@router.get("/", response_model=List[TransactionRead])
async def list_transactions():
  current_user_id = await get_logged_in_user_id()
  role = await get_user_role(current_user_id)

  rows = await transactions_service.get_transactions(current_user_id, role)
  
  return rows


@router.get("/history", response_model=List[TransactionHistoryRead])
async def list_transaction_history():
  current_user_id = await get_logged_in_user_id()
  role = await get_user_role(current_user_id)

  rows = await transactions_service.get_transactions_history(current_user_id, role)

  return rows


@router.post("/", response_model=TransactionRead)
async def create_transaction(payload: TransactionCreate):

  CURRENT_USER_ID = await get_logged_in_user_id()
  role = await get_user_role(CURRENT_USER_ID)

  row = await transactions_service.create_transaction(
    payload,
    CURRENT_USER_ID,
  )

  if not row:
    raise HTTPException(status_code=400, detail="Transaction not created")
  
  return row


@router.put("/{transaction_id}", response_model=TransactionRead)
async def update_transaction(transaction_id: int, payload: TransactionUpdate):

  CURRENT_USER_ID = await get_logged_in_user_id()
  role = await get_user_role(CURRENT_USER_ID)

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

  CURRENT_USER_ID = await get_logged_in_user_id()
  role = await get_user_role(CURRENT_USER_ID)

  deleted = await transactions_service.delete_transaction(
    transaction_id,
    CURRENT_USER_ID,
    role
  )
  if not deleted:
    raise HTTPException(status_code=404, detail="Transaction not found or not allowed to delete")
  return {"status": "deleted"}



