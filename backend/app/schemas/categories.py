from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


name_validation_optional = Field(None, min_length=2, max_length=100)
description_validation_optional = Field(None, min_length=5)


class CategoryBase(BaseModel):
  name: str = Field(..., min_length=2, max_length=100)
  description: Optional[str] = Field(None, min_length=5)
  type: Literal["Income", "Expense"]


class CategoryCreate(CategoryBase):
  pass


class CategoryUpdate(BaseModel):
  name: Optional[str] = name_validation_optional
  description: Optional[str] = description_validation_optional
  type: Optional[Literal["Income", "Expense"]] = None


class CategoryRead(CategoryBase):
  id: int
  created_at: datetime