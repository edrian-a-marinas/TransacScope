from pydantic import BaseModel
from datetime import date

class TransactionCreate(BaseModel):
    amount: float
    category_id: int
    description: str
    date: date

class TransactionOut(TransactionCreate):
    id: int
