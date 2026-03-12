from fastapi import APIRouter
from db.connection import get_pool

router = APIRouter(prefix="/health")

@router.get("/")
def health_check():
  return {"status": "ok"}
    

@router.get("/db")
async def health_check_db():
  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      await conn.fetchval("SELECT 1")
    return {"status": "ok", "database": "connected"}
  except Exception as e:
    return {"status": "error", "database": str(e)}