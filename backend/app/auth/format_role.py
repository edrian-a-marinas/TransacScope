from typing import Tuple
from fastapi import Depends
from .security import get_current_user

ROLE_MAP = {1: "admin", 2: "standard"}

async def get_user_id_and_role(current_user: dict = Depends(get_current_user)) -> Tuple[int, str]:
  role_name = ROLE_MAP.get(current_user["role_id"], "standard")
  return current_user["id"], role_name