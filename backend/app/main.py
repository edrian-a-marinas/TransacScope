from fastapi import FastAPI
from app.routers import transactions, users, reports

app = FastAPI()

# 1. Mount Static Files (CSS, JS, Images)
# This makes files in /static accessible via ://yourdomain.com
# app.mount("/static", StaticFiles(directory="static"), name="static")

# 2. Backend API Routings (Returns JSON)
app.include_router(transactions.router)
#app.include_router(users.router)
#app.include_router(reports.router)

# 3. Frontend Page Routings (Returns HTML)
#app.include_router(what?.What? idk)





