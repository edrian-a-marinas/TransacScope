from fastapi import FastAPI
from app.core.config import configure_middlewares, debug_mode
from app.core.limiter import configure_limiter

from app.auth import router_auth as authentications
from app.auth import router_email_verification as email_verification
from app.routers import transactions, categories, reports, users, notifications, test_health, ai
import logging

logging.basicConfig(
  level=logging.INFO,
  format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
  datefmt="%Y-%m-%d %H:%M:%S",
)


app = FastAPI(**debug_mode())

# Apply middleware and limiter
configure_middlewares(app)
configure_limiter(app)

# Auth
app.include_router(authentications.router)
app.include_router(email_verification.router)

# App logic
app.include_router(transactions.router)
app.include_router(categories.router)
app.include_router(reports.router)
app.include_router(users.router)

app.include_router(notifications.router)
app.include_router(ai.router)

# Health check
app.include_router(test_health.router)