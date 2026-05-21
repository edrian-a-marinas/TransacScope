from app.main import app
from app.auth.format_role import get_user_id_and_role
from tests.conftest import make_auth_override
import pytest
from decimal import Decimal



# ── Helpers ───────────────────────────────────────────────────────────────────

def transaction_payload(category_id: int, amount="100.00", tx_type="Expense"):
    return {
        "amount": amount,
        "category_id": category_id,
        "description": "Test transaction",
        "transaction_date": "2026-01-01",
        "transaction_type": tx_type,
    }


# ── CREATE ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_transaction_standard_user(standard_client, seed_users):
    payload = transaction_payload(seed_users["category_id"])
    response = await standard_client.post("/api/transactions/", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["amount"] == "100.00"
    assert data["transaction_type"] == "Expense"
    assert data["description"] == "Test transaction"
    assert data["user_id"] == seed_users["standard_id"]


@pytest.mark.asyncio
async def test_create_transaction_admin(admin_client, seed_users):
    payload = transaction_payload(seed_users["category_id"], amount="250.00", tx_type="Income")
    response = await admin_client.post("/api/transactions/", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["amount"] == "250.00"
    assert data["transaction_type"] == "Income"


@pytest.mark.asyncio
async def test_create_transaction_invalid_amount(standard_client, seed_users):
    payload = transaction_payload(seed_users["category_id"], amount="-50.00")
    response = await standard_client.post("/api/transactions/", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_transaction_zero_amount(standard_client, seed_users):
    payload = transaction_payload(seed_users["category_id"], amount="0.00")
    response = await standard_client.post("/api/transactions/", json=payload)
    assert response.status_code == 422


# ── GET ALL ───────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_transactions_standard_sees_own_only(standard_client, seed_users):
    await standard_client.post("/api/transactions/", json=transaction_payload(seed_users["category_id"]))
    response = await standard_client.get("/api/transactions/")
    assert response.status_code == 200
    data = response.json()
    assert all(tx["user_id"] == seed_users["standard_id"] for tx in data)



@pytest.mark.asyncio
async def test_get_transactions_admin_sees_all(admin_client, seed_users):
    await admin_client.post("/api/transactions/", json=transaction_payload(seed_users["category_id"]))
    response = await admin_client.get("/api/transactions/")
    assert response.status_code == 200
    data = response.json()
    assert seed_users["admin_id"] in {tx["user_id"] for tx in data}



# ── GET BY ID ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_transaction_by_id(standard_client, seed_users):
    created = await standard_client.post("/api/transactions/", json=transaction_payload(seed_users["category_id"]))
    tx_id = created.json()["id"]

    response = await standard_client.get(f"/api/transactions/{tx_id}")
    assert response.status_code == 200
    assert response.json()["id"] == tx_id


@pytest.mark.asyncio
async def test_get_transaction_not_found(standard_client):
    response = await standard_client.get("/api/transactions/999999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_standard_cannot_get_other_users_transaction(admin_client, standard_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    created = await admin_client.post("/api/transactions/", json=transaction_payload(seed_users["category_id"]))
    tx_id = created.json()["id"]
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["standard_id"], "standard")
    response = await standard_client.get(f"/api/transactions/{tx_id}")
    assert response.status_code == 404


# ── UPDATE ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_update_transaction(standard_client, seed_users):
    created = await standard_client.post("/api/transactions/", json=transaction_payload(seed_users["category_id"]))
    tx_id = created.json()["id"]

    response = await standard_client.put(
        f"/api/transactions/{tx_id}",
        json={"description": "Updated description", "amount": "200.00"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["description"] == "Updated description"
    assert data["amount"] == "200.00"


@pytest.mark.asyncio
async def test_standard_cannot_update_other_users_transaction(admin_client, standard_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    created = await admin_client.post("/api/transactions/", json=transaction_payload(seed_users["category_id"]))
    tx_id = created.json()["id"]
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["standard_id"], "standard")
    response = await standard_client.put(
        f"/api/transactions/{tx_id}",
        json={"description": "Should not work"},
    )
    assert response.status_code == 404

# ── DELETE (soft delete, admin only) ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_admin_can_delete_transaction(admin_client, seed_users):
    created = await admin_client.post("/api/transactions/", json=transaction_payload(seed_users["category_id"]))
    tx_id = created.json()["id"]

    response = await admin_client.delete(f"/api/transactions/{tx_id}")
    assert response.status_code == 200
    assert response.json()["status"] == "deleted"


@pytest.mark.asyncio
async def test_standard_cannot_delete_transaction(standard_client, seed_users):
    created = await standard_client.post("/api/transactions/", json=transaction_payload(seed_users["category_id"]))
    tx_id = created.json()["id"]

    response = await standard_client.delete(f"/api/transactions/{tx_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_nonexistent_transaction(admin_client):
    response = await admin_client.delete("/api/transactions/999999")
    assert response.status_code == 404


# ── SOFT DELETE VERIFICATION ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_deleted_transaction_not_returned(admin_client, seed_users):
    created = await admin_client.post("/api/transactions/", json=transaction_payload(seed_users["category_id"]))
    tx_id = created.json()["id"]

    await admin_client.delete(f"/api/transactions/{tx_id}")

    # Should not appear in list anymore
    response = await admin_client.get("/api/transactions/")
    ids = [tx["id"] for tx in response.json()]
    assert tx_id not in ids



# ── SCHEMA VALIDATION/S  ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_transaction_invalid_type(standard_client, seed_users):
    payload = {
        "amount": "100.00",
        "category_id": seed_users["category_id"],
        "description": "Test",
        "transaction_date": "2026-01-01",
        "transaction_type": "Cash",  # invalid enum value
    }
    response = await standard_client.post("/api/transactions/", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_transaction_missing_amount(standard_client, seed_users):
    payload = {
        "category_id": seed_users["category_id"],
        "description": "Test",
        "transaction_date": "2026-01-01",
        "transaction_type": "Expense",
    }
    response = await standard_client.post("/api/transactions/", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_transaction_missing_category(standard_client, seed_users):
    payload = {
        "amount": "100.00",
        "description": "Test",
        "transaction_date": "2026-01-01",
        "transaction_type": "Expense",
    }
    response = await standard_client.post("/api/transactions/", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_transaction_invalid_date_format(standard_client, seed_users):
    payload = {
        "amount": "100.00",
        "category_id": seed_users["category_id"],
        "description": "Test",
        "transaction_date": "not-a-date",
        "transaction_type": "Expense",
    }
    response = await standard_client.post("/api/transactions/", json=payload)
    assert response.status_code == 422