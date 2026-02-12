from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
  email: EmailStr
  first_name: str
  middle_name: Optional[str] = None
  last_name: str
  phone_number: str

class UserCreate(UserBase):
  password: str

class UserRead(UserBase):
  id: int
  role_id: int
  is_active: bool
  created_at: datetime
  request_admin: bool

class UserRoleUpdate(BaseModel):
  role_id: int  # 1 = admin, 2 = standard

class UserLogin(BaseModel):
  email: EmailStr
  password: str

class UserAdminRequest(BaseModel):
  request_admin: bool
