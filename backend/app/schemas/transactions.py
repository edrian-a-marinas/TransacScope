from pydantic import BaseModel, Field
from datetime import date
from typing import Optional
from decimal import Decimal


class TransactionCreate(BaseModel):
  amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
  category_id: int
  description: str
  transaction_date: date
  transaction_type: str 


class TransactionOut(TransactionCreate):
  id: int


class TransactionUpdate(BaseModel):
  
  description: Optional[str] = None
  transaction_date: Optional[date] = None


class TransactionRead(TransactionOut):
  category_name: str 
  user_id: int       









#decimal used for money, gt=0 must be greater than zero, max digits, decimal places

# transactionsRead inherits create and out 

"""
Model	Used for
TransactionCreate	POST /transactions
TransactionUpdate	PATCH /transactions/{id}
TransactionOut	    POST response
TransactionRead	    GET /transactions

"""