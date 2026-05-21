import pytest
import asyncpg
from app.main import app
from app.auth.format_role import get_user_id_and_role
from app.auth.security import create_access_token
from tests.conftest import make_auth_override, TEST_DB_CONFIG

# ── Helpers ───────────────────────────────────────────────────────────────────

SUPER_ADMIN_ID = 1

UPDATE_SELF_PAYLOAD = {
    "email": "admin@test.com",
    "first_name": "Updated",
    "last_name": "Admin",
    "phone_number": None,
}


async def create_test_user(email: str, role_id: int = 2) -> int:
    """Insert a throwaway user and return their ID."""
    pool = await asyncpg.create_pool(**TEST_DB_CONFIG, min_size=1, max_size=2)
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO users (email, password_hash, role_id, first_name, last_name)
            VALUES ($1, 'hashed', $2, 'Test', 'User')
            ON CONFLICT (email) DO UPDATE SET role_id = $2
            RETURNING id
            """,
            email,
            role_id,
        )
    await pool.close()
    return row["id"]


async def delete_test_user(user_id: int):
    """Remove a throwaway user and related data."""
    pool = await asyncpg.create_pool(**TEST_DB_CONFIG, min_size=1, max_size=2)
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM password_history WHERE user_id = $1", user_id)
        await conn.execute("DELETE FROM notifications WHERE recipient_user_id = $1", user_id)
        await conn.execute("DELETE FROM users WHERE id = $1", user_id)
    await pool.close()


# ── LIST USERS ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_users_admin(admin_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(
        seed_users["admin_id"], "admin"
    )
    response = await admin_client.get("/api/users/")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert any(u["id"] == seed_users["admin_id"] for u in data)


@pytest.mark.asyncio
async def test_list_users_standard_forbidden(standard_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(
        seed_users["standard_id"], "standard"
    )
    response = await standard_client.get("/api/users/")
    assert response.status_code == 403


# ── UPDATE SELF ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_update_self(admin_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(
        seed_users["admin_id"], "admin"
    )
    payload = {
        "email": "admin@test.com",
        "first_name": "Updated",
        "last_name": "Name",
        "phone_number": None,
    }
    response = await admin_client.patch("/api/users/me", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["first_name"] == "Updated"
    assert data["last_name"] == "Name"


@pytest.mark.asyncio
async def test_update_self_invalid_name(admin_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(
        seed_users["admin_id"], "admin"
    )
    payload = {
        "email": "admin@test.com",
        "first_name": "123Invalid",  # numbers not allowed in NameStr
        "last_name": "Admin",
        "phone_number": None,
    }
    response = await admin_client.patch("/api/users/me", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_update_self_invalid_phone(admin_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(
        seed_users["admin_id"], "admin"
    )
    payload = {
        "email": "admin@test.com",
        "first_name": "Admin",
        "last_name": "User",
        "phone_number": "12345",  # invalid format, must start with 09 and be 11 digits
    }
    response = await admin_client.patch("/api/users/me", json=payload)
    assert response.status_code == 422


# ── PASSWORD EXPIRY ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_password_expiry(admin_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(
        seed_users["admin_id"], "admin"
    )
    response = await admin_client.get("/api/users/me/password-expiry")
    assert response.status_code == 200
    data = response.json()
    assert "expires_at" in data


# ── UPDATE ROLE ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_update_role_super_admin_can_promote(admin_client, seed_users):
    # Use super admin (id=1) as the current user
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(
        SUPER_ADMIN_ID, "admin"
    )
    target_id = await create_test_user("roletest@test.com", role_id=2)

    response = await admin_client.put(
        f"/api/users/{target_id}/role",
        json={"role_id": 1},
    )
    assert response.status_code == 200
    assert response.json()["role_id"] == 1

    await delete_test_user(target_id)


@pytest.mark.asyncio
async def test_update_role_non_super_admin_forbidden(admin_client, seed_users):
    # Regular admin cannot change roles
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(
        seed_users["admin_id"], "admin"
    )
    target_id = await create_test_user("roletest2@test.com", role_id=2)

    response = await admin_client.put(
        f"/api/users/{target_id}/role",
        json={"role_id": 1},
    )
    assert response.status_code == 403

    await delete_test_user(target_id)


@pytest.mark.asyncio
async def test_update_role_cannot_demote_super_admin(admin_client):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(
        SUPER_ADMIN_ID, "admin"
    )
    response = await admin_client.put(
        f"/api/users/{SUPER_ADMIN_ID}/role",
        json={"role_id": 2},
    )
    assert response.status_code == 403


# ── SOFT DELETE ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_soft_delete_user(admin_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(
        seed_users["admin_id"], "admin"
    )
    target_id = await create_test_user("softdelete@test.com", role_id=2)

    response = await admin_client.delete(f"/api/users/{target_id}/soft")
    assert response.status_code == 200
    assert response.json()["detail"] == "User soft-deleted"

    await delete_test_user(target_id)


@pytest.mark.asyncio
async def test_soft_delete_standard_forbidden(standard_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(
        seed_users["standard_id"], "standard"
    )
    target_id = await create_test_user("softdelete2@test.com", role_id=2)

    response = await standard_client.delete(f"/api/users/{target_id}/soft")
    assert response.status_code == 403

    await delete_test_user(target_id)


@pytest.mark.asyncio
async def test_soft_delete_super_admin_protected(admin_client):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(
        SUPER_ADMIN_ID, "admin"
    )
    response = await admin_client.delete(f"/api/users/{SUPER_ADMIN_ID}/soft")
    assert response.status_code == 404


# ── RESTORE ───────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_restore_user(admin_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(
        seed_users["admin_id"], "admin"
    )
    target_id = await create_test_user("restore@test.com", role_id=2)

    # Soft delete first
    await admin_client.delete(f"/api/users/{target_id}/soft")
    # Then restore
    response = await admin_client.put(f"/api/users/{target_id}/restore")
    assert response.status_code == 200
    assert response.json()["detail"] == "User restored successfully"

    await delete_test_user(target_id)


@pytest.mark.asyncio
async def test_restore_standard_forbidden(standard_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(
        seed_users["standard_id"], "standard"
    )
    target_id = await create_test_user("restore2@test.com", role_id=2)

    response = await standard_client.put(f"/api/users/{target_id}/restore")
    assert response.status_code == 403

    await delete_test_user(target_id)


# ── HARD DELETE (self) ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_hard_delete_self(admin_client, seed_users):
    target_id = await create_test_user("harddelete@test.com", role_id=2)
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(
        target_id, "standard"
    )
    response = await admin_client.delete("/api/users/me")
    assert response.status_code == 200
    assert response.json()["detail"] == "Account permanently deleted"


@pytest.mark.asyncio
async def test_hard_delete_super_admin_protected(admin_client):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(
        SUPER_ADMIN_ID, "admin"
    )
    response = await admin_client.delete("/api/users/me")
    assert response.status_code == 403