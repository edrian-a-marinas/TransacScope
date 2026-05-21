from app.core.limiter import limiter
limiter.enabled = True

import pytest
import bcrypt
from datetime import datetime, timedelta
from app.main import app
from app.auth.format_role import get_user_id_and_role
from tests.conftest import make_auth_override, TEST_DB_CONFIG
import asyncpg
from app.auth.security import create_access_token

# ── Helpers ───────────────────────────────────────────────────────────────────

TEST_EMAIL = "authtest@test.com"
TEST_PASSWORD = "SecurePass123"
TEST_CODE = "123456"

REGISTER_PAYLOAD = {
    "email": TEST_EMAIL,
    "password": TEST_PASSWORD,
    "first_name": "Auth",
    "last_name": "Test",
    "phone_number": None,
    "verification_code": TEST_CODE,
}


async def seed_otp(email: str, code: str, expired: bool = False):
    """Insert a valid OTP into email_verifications."""
    pool = await asyncpg.create_pool(**TEST_DB_CONFIG, min_size=1, max_size=2)
    hashed = bcrypt.hashpw(code.encode(), bcrypt.gensalt()).decode()
    expires_at = (
        datetime.utcnow() - timedelta(minutes=1)
        if expired
        else datetime.utcnow() + timedelta(minutes=10)
    )
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO email_verifications (email, code, expires_at, is_used)
            VALUES ($1, $2, $3, false)
            """,
            email,
            hashed,
            expires_at,
        )
    await pool.close()


async def cleanup_auth_test_user():
    pool = await asyncpg.create_pool(**TEST_DB_CONFIG, min_size=1, max_size=2)
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT id FROM users WHERE email = $1", TEST_EMAIL)
        if row:
            await conn.execute("DELETE FROM password_history WHERE user_id = $1", row["id"])
            await conn.execute("DELETE FROM users WHERE id = $1", row["id"])
        await conn.execute("DELETE FROM email_verifications WHERE email = $1", TEST_EMAIL)
        await conn.execute("DELETE FROM login_attempts WHERE email = $1", TEST_EMAIL)
        await conn.execute("DELETE FROM login_attempts WHERE email = 'nobody@test.com'")
    await pool.close()


# ── REGISTER ──────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_register_success(admin_client):
    await cleanup_auth_test_user()
    await seed_otp(TEST_EMAIL, TEST_CODE)

    response = await admin_client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == TEST_EMAIL
    assert data["role_id"] == 2
    assert data["is_active"] is True
    assert "password_hash" not in data

    await cleanup_auth_test_user()


@pytest.mark.asyncio
async def test_register_invalid_otp(admin_client):
    await cleanup_auth_test_user()
    await seed_otp(TEST_EMAIL, "999999")  # seed different code

    payload = {**REGISTER_PAYLOAD, "verification_code": "123456"}  # wrong code
    response = await admin_client.post("/api/auth/register", json=payload)
    assert response.status_code == 400

    await cleanup_auth_test_user()


@pytest.mark.asyncio
async def test_register_expired_otp(admin_client):
    await cleanup_auth_test_user()
    await seed_otp(TEST_EMAIL, TEST_CODE, expired=True)

    response = await admin_client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    assert response.status_code == 400

    await cleanup_auth_test_user()


@pytest.mark.asyncio
async def test_register_duplicate_email(admin_client):
    await cleanup_auth_test_user()
    await seed_otp(TEST_EMAIL, TEST_CODE)
    await admin_client.post("/api/auth/register", json=REGISTER_PAYLOAD)

    # Try registering again with same email
    await seed_otp(TEST_EMAIL, TEST_CODE)
    response = await admin_client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    assert response.status_code == 400

    await cleanup_auth_test_user()


@pytest.mark.asyncio
async def test_register_missing_required_fields(admin_client):
    payload = {"email": TEST_EMAIL, "password": TEST_PASSWORD}
    response = await admin_client.post("/api/auth/register", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_invalid_email_format(admin_client):
    payload = {**REGISTER_PAYLOAD, "email": "notanemail"}
    response = await admin_client.post("/api/auth/register", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_password_too_short(admin_client):
    payload = {**REGISTER_PAYLOAD, "password": "short"}
    response = await admin_client.post("/api/auth/register", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_invalid_verification_code_format(admin_client):
    # Code must be exactly 6 digits
    payload = {**REGISTER_PAYLOAD, "verification_code": "12345"}  # 5 digits
    response = await admin_client.post("/api/auth/register", json=payload)
    assert response.status_code == 422


# ── LOGIN ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_login_success(admin_client):
    await cleanup_auth_test_user()
    await seed_otp(TEST_EMAIL, TEST_CODE)
    await admin_client.post("/api/auth/register", json=REGISTER_PAYLOAD)

    response = await admin_client.post(
        "/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == TEST_EMAIL

    await cleanup_auth_test_user()


@pytest.mark.asyncio
async def test_login_wrong_password(admin_client):
    await cleanup_auth_test_user()
    await seed_otp(TEST_EMAIL, TEST_CODE)
    await admin_client.post("/api/auth/register", json=REGISTER_PAYLOAD)

    response = await admin_client.post(
        "/api/auth/login",
        json={"email": TEST_EMAIL, "password": "WrongPassword123"},
    )
    assert response.status_code == 401

    await cleanup_auth_test_user()


@pytest.mark.asyncio
async def test_login_nonexistent_email(admin_client):
    response = await admin_client.post(
        "/api/auth/login",
        json={"email": "nobody@test.com", "password": TEST_PASSWORD},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_invalid_email_format(admin_client):
    response = await admin_client.post(
        "/api/auth/login",
        json={"email": "notanemail", "password": TEST_PASSWORD},
    )
    assert response.status_code == 422


# ── GET ME ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_me(admin_client, seed_users):
    token = create_access_token({
        "user_id": seed_users["admin_id"],
        "role_id": 1,
        "is_active": True,
        "password_expired": False,
    })
    response = await admin_client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == seed_users["admin_id"]
    assert data["email"] == "admin@test.com"


# ── RATE LIMITING ─────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_login_rate_limiting(admin_client):
    """After 5 failed attempts, login should return 429."""
    await cleanup_auth_test_user()
    await seed_otp(TEST_EMAIL, TEST_CODE)
    await admin_client.post("/api/auth/register", json=REGISTER_PAYLOAD)

    # Exhaust the 5 allowed attempts with wrong password
    for _ in range(5):
        await admin_client.post(
            "/api/auth/login",
            json={"email": TEST_EMAIL, "password": "WrongPassword999"},
        )

    # 6th attempt should be blocked
    response = await admin_client.post(
        "/api/auth/login",
        json={"email": TEST_EMAIL, "password": "WrongPassword999"},
    )
    assert response.status_code == 429
    assert "Too many failed login attempts" in response.json()["detail"]

    await cleanup_auth_test_user()
