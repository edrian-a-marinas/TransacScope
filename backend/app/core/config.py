import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env"))

def create_app() -> FastAPI:
    
  DEBUG = os.getenv("DEBUG", "False").lower() == "true"

  app = FastAPI(
    debug=DEBUG,
    docs_url=None if not DEBUG else "/docs",
    redoc_url=None if not DEBUG else "/redoc",
    openapi_url=None if not DEBUG else "/openapi.json",
  )

  app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["127.0.0.1", "localhost"] # change allowed_hosts=["api.myapp.com", "www.myapp.com"]
  )

  app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # change allow_origins to frontend URL https://myapp.com
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
    allow_credentials=True
  )

  return app
