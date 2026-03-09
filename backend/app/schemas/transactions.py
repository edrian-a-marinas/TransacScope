from pydantic import BaseModel, Field, ConfigDict
from datetime import date, datetime
from typing import Optional
from decimal import Decimal
from enum import Enum

class ActionType(str, Enum):
  updated = "updated"
  deleted = "deleted"

class TransactionType(str, Enum):
  Expense = "Expense"
  Income = "Income"

class TransactionCreate(BaseModel):
  amount: Decimal = Field(gt=Decimal("0"), max_digits=12, decimal_places=2)
  category_id: int
  description: str
  transaction_date: date
  transaction_type: TransactionType

class TransactionOut(TransactionCreate):
  id: int

class TransactionUpdate(BaseModel):
  amount:           Optional[Decimal] = Field(default=None, gt=Decimal("0"), max_digits=12, decimal_places=2)
  description:      Optional[str]     = None
  transaction_date: Optional[date]    = None

class TransactionRead(TransactionOut):
  category_name: str
  user_id: int
  created_at: datetime

class TransactionHistoryRead(BaseModel):
  id: int
  entity_id: int
  user_id: int
  category_id: Optional[int] = None
  transaction_type: Optional[str] = None
  old_amount: Optional[str] = None
  new_amount: Optional[str] = None
  old_description: Optional[str] = None
  new_description: Optional[str] = None
  old_transaction_date: Optional[date] = None
  new_transaction_date: Optional[date] = None
  action: ActionType
  action_taken_at: datetime
  model_config = ConfigDict(from_attributes=True)

class TransactionDeletionRequestCreate(BaseModel):
  transaction_id: int

class ReviewDeletionRequestPayload(BaseModel):
  approve: bool

class TransactionInfoRead(BaseModel):
  id: int
  amount: Decimal
  category_id: int
  category_name: str
  description: Optional[str] = None
  transaction_type: str
  transaction_date: date

class TransactionDeletionRequestRead(BaseModel):
  id: int
  transaction_id: int
  requested_by: int
  status: str
  requested_at: datetime
  reviewed_by: Optional[int] = None
  reviewed_at: Optional[datetime] = None
  transaction: Optional[TransactionInfoRead] = None
  model_config = ConfigDict(from_attributes=True)

class ReviewerInfo(BaseModel):
  first_name: str
  last_name: str

class DeletionRequestHistoryRead(BaseModel):
  id: int
  transaction_id: int
  requested_by: int
  status: str
  requested_at: datetime
  reviewed_by: Optional[int] = None
  reviewed_at: Optional[datetime] = None
  requester: Optional[ReviewerInfo] = None
  reviewer:  Optional[ReviewerInfo] = None
  transaction: Optional[TransactionInfoRead] = None
  model_config = ConfigDict(from_attributes=True)