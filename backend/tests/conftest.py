import os
os.environ["ALLOWED_HOSTS"] = "localhost,127.0.0.1,testserver,test"

import pytest
import asyncpg
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.auth.format_role import get_user_id_and_role
from db import connection as db_connection
import uuid

TEST_DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "user": "transaction_user",
    "password": "edrian",
    "database": "transacscope_test_db",
}



async def insert_test_category(conn, name_prefix: str, cat_type: str = "Expense"):
    unique_name = f"{name_prefix}_{uuid.uuid4().hex[:8]}"
    row = await conn.fetchrow(
        "INSERT INTO categories (name, type) VALUES ($1, $2) RETURNING id",
        unique_name, cat_type
    )
    return row["id"]

# ── Single shared pool for entire session ─────────────────────────────────────

@pytest_asyncio.fixture(scope="session")
async def test_pool():
    pool = await asyncpg.create_pool(**TEST_DB_CONFIG, min_size=2, max_size=5)
    db_connection._pool = pool
    yield pool
    await pool.close()
    db_connection._pool = None


# ── Seed users and category once per session ──────────────────────────────────

@pytest_asyncio.fixture(scope="session")
async def seed_users(test_pool):
    async with test_pool.acquire() as conn:
        admin = await conn.fetchrow(
            """
            INSERT INTO users (email, password_hash, role_id, first_name, last_name)
            VALUES ('admin@test.com', 'hashed', 1, 'Admin', 'User')
            ON CONFLICT (email) DO UPDATE SET role_id = 1
            RETURNING id, role_id
            """
        )
        standard = await conn.fetchrow(
            """
            INSERT INTO users (email, password_hash, role_id, first_name, last_name)
            VALUES ('standard@test.com', 'hashed', 2, 'Standard', 'User')
            ON CONFLICT (email) DO UPDATE SET role_id = 2
            RETURNING id, role_id
            """
        )
        category = await conn.fetchrow(
            "SELECT id FROM categories WHERE name = 'Test Category'"
        )
        if category is None:
            category = await conn.fetchrow(
                "INSERT INTO categories (name, type) VALUES ('Test Category', 'Expense') RETURNING id"
            )

    yield {
        "admin_id": admin["id"],
        "standard_id": standard["id"],
        "category_id": category["id"],
    }
    async with test_pool.acquire() as conn:
        await conn.execute("DELETE FROM transaction_deletion_requests")
        await conn.execute("DELETE FROM log_history")
        await conn.execute("DELETE FROM transactions")
        await conn.execute("DELETE FROM log_history")
        await conn.execute(
            "DELETE FROM users WHERE email IN ('admin@test.com', 'standard@test.com')"
        )
        await conn.execute(
            "DELETE FROM categories WHERE name IN ('OldName','SwitchMe','DescTest','ToSoftDelete','GhostCategory','GhostExpense','GhostIncome','LogTest','DeleteLogTest')"
        )


# ── Clean transactions before each test ──────────────────────────────────────

@pytest_asyncio.fixture(autouse=True)
async def clean_transactions():
    # separate pool just for cleanup — never shares with app pool
    cleanup_pool = await asyncpg.create_pool(**TEST_DB_CONFIG, min_size=1, max_size=2)
    async with cleanup_pool.acquire() as conn:
        await conn.execute("DELETE FROM transaction_deletion_requests")
        await conn.execute("DELETE FROM log_history")
        await conn.execute("DELETE FROM transactions")
    await cleanup_pool.close()
    yield


# ── Auth dependency overrides ─────────────────────────────────────────────────

def make_auth_override(user_id: int, role: str):
    async def override():
        return user_id, role
    return override


# ── HTTP clients ──────────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def admin_client(seed_users):
    overrides = {get_user_id_and_role: make_auth_override(seed_users["admin_id"], "admin")}
    async with AsyncClient(
        transport=ASGITransport(app=app, raise_app_exceptions=False),
        base_url="http://testserver",
        headers={},
    ) as client:
        app.dependency_overrides = overrides
        yield client
        app.dependency_overrides = {}


@pytest_asyncio.fixture
async def standard_client(seed_users):
    overrides = {get_user_id_and_role: make_auth_override(seed_users["standard_id"], "standard")}
    async with AsyncClient(
        transport=ASGITransport(app=app, raise_app_exceptions=False),
        base_url="http://testserver",
        headers={},
    ) as client:
        app.dependency_overrides = overrides
        yield client
        app.dependency_overrides = {}