from pydantic import BaseModel, EmailStr, StringConstraints
from typing import Optional, Annotated, Literal
from datetime import datetime

PhoneNumber = Annotated[str, StringConstraints(pattern=r'^09\d{9}$')]
PasswordStr = Annotated[str, StringConstraints(min_length=8, max_length=72)]
NameStr = Annotated[str, StringConstraints(min_length=1, max_length=50, pattern=r'^[A-Za-z\s\-]+$')]
VerificationCodeStr = Annotated[str, StringConstraints(
  pattern=r'^\d{6}$'
)]


class UserBase(BaseModel):
  email: EmailStr
  first_name: NameStr
  middle_name: Optional[str] = None
  last_name: NameStr
  phone_number: Optional[PhoneNumber] = None

class UserCreate(UserBase):
  password: PasswordStr
  verification_code: VerificationCodeStr

class UserRead(UserBase):
  id: int
  role_id: Literal[1, 2]
  is_active: bool
  created_at: datetime
  request_admin: bool

class UserRoleUpdate(BaseModel):
  role_id: int  # 1 = admin, 2 = standard

class UserLogin(BaseModel):
  email: EmailStr
  password: PasswordStr

class UserAdminRequest(BaseModel):
  request_admin: bool
