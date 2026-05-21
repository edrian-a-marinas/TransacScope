import uuid
import pytest
from app.main import app
from app.auth.format_role import get_user_id_and_role
from tests.conftest import make_auth_override, insert_test_category


# ── Helpers ───────────────────────────────────────────────────────────────────

def unique(prefix: str) -> str:
    """Generate a unique name to avoid categories_name_unique_active constraint."""
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


def category_payload(name: str, category_type="Expense", description=None):
    payload = {"name": name, "type": category_type}
    if description is not None:
        payload["description"] = description
    return payload


# ── GET ALL ───────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_categories_returns_list(admin_client):
    response = await admin_client.get("/api/categories/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_get_categories_standard_user(standard_client):
    response = await standard_client.get("/api/categories/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_get_categories_excludes_deleted(admin_client, test_pool):
    async with test_pool.acquire() as conn:
        ctg_id = await insert_test_category(conn, "ToDelete", "Expense")
        await conn.execute("UPDATE categories SET deleted_at = now() WHERE id = $1", ctg_id)

    response = await admin_client.get("/api/categories/")
    ids = [c["id"] for c in response.json()]
    assert ctg_id not in ids

    async with test_pool.acquire() as conn:
        await conn.execute("DELETE FROM categories WHERE id = $1", ctg_id)


# ── GET EXPENSE ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_expense_categories_only_expense(admin_client):
    response = await admin_client.get("/api/categories/expense")
    assert response.status_code == 200
    assert all(c["type"] == "Expense" for c in response.json())


@pytest.mark.asyncio
async def test_get_expense_categories_no_income(admin_client, test_pool):
    async with test_pool.acquire() as conn:
        ctg_id = await insert_test_category(conn, "SalaryIncome", "Income")

    response = await admin_client.get("/api/categories/expense")
    ids = [c["id"] for c in response.json()]
    assert ctg_id not in ids

    async with test_pool.acquire() as conn:
        await conn.execute("DELETE FROM categories WHERE id = $1", ctg_id)


# ── GET INCOME ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_income_categories_only_income(admin_client):
    response = await admin_client.get("/api/categories/income")
    assert response.status_code == 200
    assert all(c["type"] == "Income" for c in response.json())


@pytest.mark.asyncio
async def test_get_income_categories_no_expense(admin_client, test_pool):
    async with test_pool.acquire() as conn:
        ctg_id = await insert_test_category(conn, "GroceriesExpense", "Expense")

    response = await admin_client.get("/api/categories/income")
    ids = [c["id"] for c in response.json()]
    assert ctg_id not in ids

    async with test_pool.acquire() as conn:
        await conn.execute("DELETE FROM categories WHERE id = $1", ctg_id)


# ── CREATE ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_category_admin(admin_client, seed_users, test_pool):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    payload = category_payload(unique("Utilities"), "Expense", "Monthly bills")
    response = await admin_client.post("/api/categories/", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "Expense"
    assert data["description"] == "Monthly bills"
    assert "id" in data
    assert "created_at" in data

    async with test_pool.acquire() as conn:
        await conn.execute("DELETE FROM categories WHERE id = $1", data["id"])


@pytest.mark.asyncio
async def test_create_category_income_type(admin_client, seed_users, test_pool):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    payload = category_payload(unique("Freelance"), "Income")
    response = await admin_client.post("/api/categories/", json=payload)
    assert response.status_code == 200
    assert response.json()["type"] == "Income"

    async with test_pool.acquire() as conn:
        await conn.execute("DELETE FROM categories WHERE id = $1", response.json()["id"])


@pytest.mark.asyncio
async def test_create_category_no_description(admin_client, seed_users, test_pool):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    payload = category_payload(unique("Misc"), "Expense")
    response = await admin_client.post("/api/categories/", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["description"] is None

    async with test_pool.acquire() as conn:
        await conn.execute("DELETE FROM categories WHERE id = $1", data["id"])


@pytest.mark.asyncio
async def test_create_category_standard_user_forbidden(standard_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["standard_id"], "standard")
    payload = category_payload(unique("Blocked"), "Expense")
    response = await standard_client.post("/api/categories/", json=payload)
    assert response.status_code == 403


# ── CREATE — SCHEMA VALIDATION ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_category_name_too_short(admin_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    response = await admin_client.post("/api/categories/", json={"name": "X", "type": "Expense"})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_category_name_too_long(admin_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    response = await admin_client.post("/api/categories/", json={"name": "A" * 101, "type": "Expense"})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_category_description_too_short(admin_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    payload = category_payload(unique("Food"), "Expense", description="Hi")
    response = await admin_client.post("/api/categories/", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_category_invalid_type(admin_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    response = await admin_client.post("/api/categories/", json={"name": "Food", "type": "Cash"})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_category_missing_name(admin_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    response = await admin_client.post("/api/categories/", json={"type": "Expense"})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_category_missing_type(admin_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    response = await admin_client.post("/api/categories/", json={"name": "Food"})
    assert response.status_code == 422


# ── UPDATE ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_update_category_name(admin_client, seed_users, test_pool):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    async with test_pool.acquire() as conn:
        ctg_id = await insert_test_category(conn, "OldName", "Expense")

    new_name = unique("NewName")
    response = await admin_client.put(f"/api/categories/{ctg_id}", json={"name": new_name})
    assert response.status_code == 200
    assert response.json()["name"] == new_name

    async with test_pool.acquire() as conn:
        await conn.execute("DELETE FROM log_history WHERE entity_id = $1 AND entity_type = 'category'", ctg_id)
        await conn.execute("DELETE FROM categories WHERE id = $1", ctg_id)


@pytest.mark.asyncio
async def test_update_category_type(admin_client, seed_users, test_pool):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    async with test_pool.acquire() as conn:
        ctg_id = await insert_test_category(conn, "SwitchMe", "Expense")

    response = await admin_client.put(f"/api/categories/{ctg_id}", json={"type": "Income"})
    assert response.status_code == 200
    assert response.json()["type"] == "Income"

    async with test_pool.acquire() as conn:
        await conn.execute("DELETE FROM log_history WHERE entity_id = $1 AND entity_type = 'category'", ctg_id)
        await conn.execute("DELETE FROM categories WHERE id = $1", ctg_id)


@pytest.mark.asyncio
async def test_update_category_description(admin_client, seed_users, test_pool):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    async with test_pool.acquire() as conn:
        ctg_id = await insert_test_category(conn, "DescTest", "Expense")

    response = await admin_client.put(
        f"/api/categories/{ctg_id}",
        json={"description": "Updated description text"},
    )
    assert response.status_code == 200
    assert response.json()["description"] == "Updated description text"

    async with test_pool.acquire() as conn:
        await conn.execute("DELETE FROM log_history WHERE entity_id = $1 AND entity_type = 'category'", ctg_id)
        await conn.execute("DELETE FROM categories WHERE id = $1", ctg_id)


@pytest.mark.asyncio
async def test_update_category_not_found(admin_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    response = await admin_client.put("/api/categories/999999", json={"name": "Ghost"})
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_category_standard_user_forbidden(standard_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["standard_id"], "standard")
    response = await standard_client.put(
        f"/api/categories/{seed_users['category_id']}",
        json={"name": unique("HackedName")},
    )
    assert response.status_code == 404


# ── UPDATE — SCHEMA VALIDATION ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_update_category_name_too_short(admin_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    response = await admin_client.put(
        f"/api/categories/{seed_users['category_id']}", json={"name": "X"}
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_update_category_name_too_long(admin_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    response = await admin_client.put(
        f"/api/categories/{seed_users['category_id']}", json={"name": "B" * 101}
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_update_category_description_too_short(admin_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    response = await admin_client.put(
        f"/api/categories/{seed_users['category_id']}", json={"description": "Hi"}
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_update_category_invalid_type(admin_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    response = await admin_client.put(
        f"/api/categories/{seed_users['category_id']}", json={"type": "Cash"}
    )
    assert response.status_code == 422


# ── DELETE (soft delete, admin only) ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_delete_category_admin(admin_client, seed_users, test_pool):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    async with test_pool.acquire() as conn:
        ctg_id = await insert_test_category(conn, "ToSoftDelete", "Income")

    response = await admin_client.delete(f"/api/categories/{ctg_id}")
    assert response.status_code == 200
    assert response.json()["status"] == "deleted"

    async with test_pool.acquire() as conn:
        await conn.execute("DELETE FROM log_history WHERE entity_id = $1 AND entity_type = 'category'", ctg_id)
        await conn.execute("DELETE FROM categories WHERE id = $1", ctg_id)


@pytest.mark.asyncio
async def test_delete_category_standard_user_forbidden(standard_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["standard_id"], "standard")
    response = await standard_client.delete(f"/api/categories/{seed_users['category_id']}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_category_not_found(admin_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    response = await admin_client.delete("/api/categories/999999")
    assert response.status_code == 404


# ── SOFT DELETE VERIFICATION ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_deleted_category_not_in_get_all(admin_client, seed_users, test_pool):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    async with test_pool.acquire() as conn:
        ctg_id = await insert_test_category(conn, "GhostCategory", "Expense")

    await admin_client.delete(f"/api/categories/{ctg_id}")

    ids = [c["id"] for c in (await admin_client.get("/api/categories/")).json()]
    assert ctg_id not in ids

    async with test_pool.acquire() as conn:
        await conn.execute("DELETE FROM log_history WHERE entity_id = $1 AND entity_type = 'category'", ctg_id)
        await conn.execute("DELETE FROM categories WHERE id = $1", ctg_id)


@pytest.mark.asyncio
async def test_deleted_category_not_in_expense_list(admin_client, seed_users, test_pool):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    async with test_pool.acquire() as conn:
        ctg_id = await insert_test_category(conn, "GhostExpense", "Expense")

    await admin_client.delete(f"/api/categories/{ctg_id}")

    ids = [c["id"] for c in (await admin_client.get("/api/categories/expense")).json()]
    assert ctg_id not in ids

    async with test_pool.acquire() as conn:
        await conn.execute("DELETE FROM log_history WHERE entity_id = $1 AND entity_type = 'category'", ctg_id)
        await conn.execute("DELETE FROM categories WHERE id = $1", ctg_id)


@pytest.mark.asyncio
async def test_deleted_category_not_in_income_list(admin_client, seed_users, test_pool):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    async with test_pool.acquire() as conn:
        ctg_id = await insert_test_category(conn, "GhostIncome", "Income")

    await admin_client.delete(f"/api/categories/{ctg_id}")

    ids = [c["id"] for c in (await admin_client.get("/api/categories/income")).json()]
    assert ctg_id not in ids

    async with test_pool.acquire() as conn:
        await conn.execute("DELETE FROM log_history WHERE entity_id = $1 AND entity_type = 'category'", ctg_id)
        await conn.execute("DELETE FROM categories WHERE id = $1", ctg_id)


# ── LOG HISTORY VERIFICATION ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_update_category_writes_log_history(admin_client, seed_users, test_pool):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    async with test_pool.acquire() as conn:
        ctg_id = await insert_test_category(conn, "LogTest", "Expense")

    await admin_client.put(f"/api/categories/{ctg_id}", json={"name": unique("LogTestUpdated")})

    async with test_pool.acquire() as conn:
        log = await conn.fetchrow(
            "SELECT * FROM log_history WHERE entity_type = 'category' AND entity_id = $1 AND action = 'updated'",
            ctg_id,
        )
    assert log is not None
    assert log["user_id"] == seed_users["admin_id"]

    async with test_pool.acquire() as conn:
        await conn.execute("DELETE FROM log_history WHERE entity_id = $1 AND entity_type = 'category'", ctg_id)
        await conn.execute("DELETE FROM categories WHERE id = $1", ctg_id)


@pytest.mark.asyncio
async def test_delete_category_writes_log_history(admin_client, seed_users, test_pool):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    async with test_pool.acquire() as conn:
        ctg_id = await insert_test_category(conn, "DeleteLogTest", "Income")

    await admin_client.delete(f"/api/categories/{ctg_id}")

    async with test_pool.acquire() as conn:
        log = await conn.fetchrow(
            "SELECT * FROM log_history WHERE entity_type = 'category' AND entity_id = $1 AND action = 'soft-deleted'",
            ctg_id,
        )
    assert log is not None

    async with test_pool.acquire() as conn:
        await conn.execute("DELETE FROM log_history WHERE entity_id = $1 AND entity_type = 'category'", ctg_id)
        await conn.execute("DELETE FROM categories WHERE id = $1", ctg_id)