import pytest
from unittest.mock import AsyncMock, patch


# ── /api/ai/chat ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_chat_standard_user_returns_reply(standard_client):
    mock_reply = "Your total expenses for the last 30 days are ₱5,000.00."
    with patch("app.services.ai_service.chat", new=AsyncMock(return_value=mock_reply)):
        response = await standard_client.post(
            "/api/ai/chat",
            json={"message": "What are my expenses?", "history": []},
        )
    assert response.status_code == 200
    assert response.json()["reply"] == mock_reply


@pytest.mark.asyncio
async def test_chat_admin_user_returns_reply(admin_client):
    mock_reply = "All users combined have a net profit of ₱20,000.00."
    with patch("app.services.ai_service.chat", new=AsyncMock(return_value=mock_reply)):
        response = await admin_client.post(
            "/api/ai/chat",
            json={"message": "Give me an overview.", "history": []},
        )
    assert response.status_code == 200
    assert response.json()["reply"] == mock_reply


@pytest.mark.asyncio
async def test_chat_with_history(standard_client):
    mock_reply = "Based on our earlier discussion, your expenses are high."
    history = [
        {"role": "user", "content": "Hello"},
        {"role": "assistant", "content": "Hi! How can I help?"},
    ]
    with patch("app.services.ai_service.chat", new=AsyncMock(return_value=mock_reply)) as mock_chat:
        response = await standard_client.post(
            "/api/ai/chat",
            json={"message": "Tell me more.", "history": history},
        )
    assert response.status_code == 200
    assert response.json()["reply"] == mock_reply
    # Verify history was passed through correctly
    called_history = mock_chat.call_args.kwargs["history"]
    assert len(called_history) == 2
    assert called_history[0]["role"] == "user"
    assert called_history[1]["role"] == "assistant"


@pytest.mark.asyncio
async def test_chat_passes_user_id_and_role(standard_client, seed_users):
    mock_reply = "Here is your data."
    with patch("app.services.ai_service.chat", new=AsyncMock(return_value=mock_reply)) as mock_chat:
        response = await standard_client.post(
            "/api/ai/chat",
            json={"message": "Show me my data.", "history": []},
        )
    assert response.status_code == 200
    call_kwargs = mock_chat.call_args.kwargs
    assert call_kwargs["user_id"] == seed_users["standard_id"]
    assert call_kwargs["role"] == "standard"


@pytest.mark.asyncio
async def test_chat_passes_admin_id_and_role(admin_client, seed_users):
    mock_reply = "Here is the full data."
    with patch("app.services.ai_service.chat", new=AsyncMock(return_value=mock_reply)) as mock_chat:
        response = await admin_client.post(
            "/api/ai/chat",
            json={"message": "Show all data.", "history": []},
        )
    assert response.status_code == 200
    call_kwargs = mock_chat.call_args.kwargs
    assert call_kwargs["user_id"] == seed_users["admin_id"]
    assert call_kwargs["role"] == "admin"


@pytest.mark.asyncio
async def test_chat_missing_message_returns_422(standard_client):
    response = await standard_client.post(
        "/api/ai/chat",
        json={"history": []},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_chat_invalid_history_role_returns_422(standard_client):
    """History messages must have 'role' and 'content' fields."""
    response = await standard_client.post(
        "/api/ai/chat",
        json={
            "message": "Hello",
            "history": [{"content": "missing role field"}],
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_chat_empty_message_string(standard_client):
    """Empty string is technically valid per schema — service decides."""
    mock_reply = "Please provide a question."
    with patch("app.services.ai_service.chat", new=AsyncMock(return_value=mock_reply)):
        response = await standard_client.post(
            "/api/ai/chat",
            json={"message": "", "history": []},
        )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_chat_default_history_is_empty(standard_client):
    """history field should default to [] when omitted."""
    mock_reply = "Sure!"
    with patch("app.services.ai_service.chat", new=AsyncMock(return_value=mock_reply)) as mock_chat:
        response = await standard_client.post(
            "/api/ai/chat",
            json={"message": "Hi"},
        )
    assert response.status_code == 200
    assert mock_chat.call_args.kwargs["history"] == []


@pytest.mark.asyncio
async def test_chat_service_exception_raises_500(standard_client):
    with patch(
        "app.services.ai_service.chat",
        new=AsyncMock(side_effect=Exception("Groq API error")),
    ):
        response = await standard_client.post(
            "/api/ai/chat",
            json={"message": "Hello", "history": []},
        )
    assert response.status_code == 500


# ── /api/ai/context ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_context_standard_user(standard_client):
    mock_context = "Total Income: ₱10,000.00\nTotal Expenses: ₱4,000.00"
    with patch(
        "app.services.ai_service.get_financial_context",
        new=AsyncMock(return_value=mock_context),
    ):
        response = await standard_client.get("/api/ai/context")
    assert response.status_code == 200
    assert response.json()["context"] == mock_context


@pytest.mark.asyncio
async def test_get_context_admin_user(admin_client):
    mock_context = "All-user summary: Total Income: ₱50,000.00"
    with patch(
        "app.services.ai_service.get_financial_context",
        new=AsyncMock(return_value=mock_context),
    ):
        response = await admin_client.get("/api/ai/context")
    assert response.status_code == 200
    assert response.json()["context"] == mock_context


@pytest.mark.asyncio
async def test_get_context_passes_correct_user_id_and_role(standard_client, seed_users):
    with patch(
        "app.services.ai_service.get_financial_context",
        new=AsyncMock(return_value="context"),
    ) as mock_ctx:
        response = await standard_client.get("/api/ai/context")
    assert response.status_code == 200
    mock_ctx.assert_awaited_once_with(seed_users["standard_id"], "standard")


@pytest.mark.asyncio
async def test_get_context_passes_admin_id_and_role(admin_client, seed_users):
    with patch(
        "app.services.ai_service.get_financial_context",
        new=AsyncMock(return_value="admin context"),
    ) as mock_ctx:
        response = await admin_client.get("/api/ai/context")
    assert response.status_code == 200
    mock_ctx.assert_awaited_once_with(seed_users["admin_id"], "admin")


@pytest.mark.asyncio
async def test_get_context_response_shape(standard_client):
    """Response must be a dict with a 'context' key."""
    with patch(
        "app.services.ai_service.get_financial_context",
        new=AsyncMock(return_value="some context"),
    ):
        response = await standard_client.get("/api/ai/context")
    assert response.status_code == 200
    body = response.json()
    assert "context" in body
    assert isinstance(body["context"], str)


@pytest.mark.asyncio
async def test_get_context_unavailable_fallback(standard_client):
    """Service returns fallback string on DB error — router should still return 200."""
    with patch(
        "app.services.ai_service.get_financial_context",
        new=AsyncMock(return_value="Financial data is currently unavailable."),
    ):
        response = await standard_client.get("/api/ai/context")
    assert response.status_code == 200
    assert response.json()["context"] == "Financial data is currently unavailable."