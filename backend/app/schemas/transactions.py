from pydantic import BaseModel, Field
from datetime import date
from typing import Optional
from decimal import Decimal


class TransactionCreate(BaseModel):
  amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
  category_id: int
  description: str
  date: date

class TransactionOut(TransactionCreate):
  id: int

class TransactionUpdate(BaseModel):
  amount: Optional[Decimal] = None
  category_id: Optional[int] = None
  description: Optional[str] = None
  date: Optional[date] = None

class TransactionRead(TransactionOut):
  category_name: str 
  user_id: int       









#decimal used for money, gt=0 must be greater than zero, max digits, decimal places

#Optional, allows partial updates, pdeng si description lng i update

"""
Model	Used for
TransactionCreate	POST /transactions
TransactionUpdate	PATCH /transactions/{id}
TransactionOut	    POST response
TransactionRead	    GET /transactions

"""