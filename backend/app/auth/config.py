from datetime import timedelta

JWT_SECRET_KEY = "supersecretkey123"  # keep it secure, use .env in prod
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # 1 hour
BCRYPT_ROUNDS = 12
