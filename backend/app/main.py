from app.core import config
from app.auth import router_email_verification as email_verification

from app.auth import router_auth as authentications
from app.routers import (
  transactions, 
  categories, 
  reports,
  users,
  )
from tests import test_health

app = config.create_app()


# Backend auth Routings 
app.include_router(authentications.router)
app.include_router(email_verification.router)

# Backend logic routings
app.include_router(transactions.router)
app.include_router(categories.router)
app.include_router(reports.router)
app.include_router(users.router)

# Backend health routing
app.include_router(test_health.router)