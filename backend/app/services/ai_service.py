import os
import logging
from groq import AsyncGroq
from db.connection import get_pool
from datetime import date, timedelta
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(dotenv_path=Path(__file__).resolve().parents[3] / ".env")

logger = logging.getLogger(__name__)

def get_groq_client() -> AsyncGroq:
    api_key = os.getenv("GROQ_API_KEY")
    model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    if not api_key:
        raise ValueError("GROQ_API_KEY is not set in environment variables")
    return AsyncGroq(api_key=api_key)


async def get_financial_context(user_id: int, role: str) -> str:
    """
    Pull a financial summary from the DB and format it as context
    for the AI system prompt. Admins see all users, standard users
    see only their own transactions.
    """
    try:
        pool = await get_pool()
        today = date.today()
        thirty_days_ago = today - timedelta(days=30)

        async with pool.acquire() as conn:
            if role == "admin":
                # Admin sees all transactions
                rows = await conn.fetch(
                    """
                    SELECT
                        t.transaction_type,
                        c.name AS category_name,
                        SUM(t.amount) AS total_amount,
                        COUNT(*) AS entry_count
                    FROM transactions t
                    JOIN categories c ON c.id = t.category_id
                    WHERE t.deleted_at IS NULL
                        AND t.transaction_date BETWEEN $1 AND $2
                    GROUP BY t.transaction_type, c.name
                    ORDER BY total_amount DESC
                    """,
                    thirty_days_ago, today
                )
                totals = await conn.fetchrow(
                    """
                    SELECT
                        COALESCE(SUM(CASE WHEN transaction_type = 'Income' THEN amount ELSE 0 END), 0) AS total_income,
                        COALESCE(SUM(CASE WHEN transaction_type = 'Expense' THEN amount ELSE 0 END), 0) AS total_expenses,
                        COUNT(*) AS total_transactions
                    FROM transactions
                    WHERE deleted_at IS NULL
                        AND transaction_date BETWEEN $1 AND $2
                    """,
                    thirty_days_ago, today
                )
                scope = "across all users in the business"
            else:
                # Standard user sees only their own
                rows = await conn.fetch(
                    """
                    SELECT
                        t.transaction_type,
                        c.name AS category_name,
                        SUM(t.amount) AS total_amount,
                        COUNT(*) AS entry_count
                    FROM transactions t
                    JOIN categories c ON c.id = t.category_id
                    WHERE t.deleted_at IS NULL
                        AND t.user_id = $1
                        AND t.transaction_date BETWEEN $2 AND $3
                    GROUP BY t.transaction_type, c.name
                    ORDER BY total_amount DESC
                    """,
                    user_id, thirty_days_ago, today
                )
                totals = await conn.fetchrow(
                    """
                    SELECT
                        COALESCE(SUM(CASE WHEN transaction_type = 'Income' THEN amount ELSE 0 END), 0) AS total_income,
                        COALESCE(SUM(CASE WHEN transaction_type = 'Expense' THEN amount ELSE 0 END), 0) AS total_expenses,
                        COUNT(*) AS total_transactions
                    FROM transactions
                    WHERE deleted_at IS NULL
                        AND user_id = $1
                        AND transaction_date BETWEEN $2 AND $3
                    """,
                    user_id, thirty_days_ago, today
                )
                scope = "for your own transactions"

        # Format context string
        total_income = float(totals["total_income"])
        total_expenses = float(totals["total_expenses"])
        net_profit = total_income - total_expenses
        total_transactions = totals["total_transactions"]

        breakdown_lines = []
        for row in rows:
            breakdown_lines.append(
                f"  - {row['category_name']} ({row['transaction_type']}): "
                f"₱{float(row['total_amount']):,.2f} across {row['entry_count']} transaction(s)"
            )

        breakdown_text = "\n".join(breakdown_lines) if breakdown_lines else "  No transactions found."

        context = f"""
Current financial data {scope} for the last 30 days ({thirty_days_ago} to {today}):

Summary:
  - Total Income: ₱{total_income:,.2f}
  - Total Expenses: ₱{total_expenses:,.2f}
  - Net Profit: ₱{net_profit:,.2f}
  - Total Transactions: {total_transactions}

Category Breakdown:
{breakdown_text}
"""
        return context.strip()

    except Exception:
        logger.exception("Error fetching financial context for AI")
        return "Financial data is currently unavailable."


async def chat(
    message: str,
    history: list[dict],
    user_id: int,
    role: str,
) -> str:
    """
    Send a message to Groq with financial DB context injected
    into the system prompt. Maintains conversation history.
    """
    try:
        financial_context = await get_financial_context(user_id, role)

        system_prompt = f"""You are a financial assistant for TransacScope, a role-based business finance management system.

Your job is to help users understand their financial data, analyze spending patterns, identify trends, and answer questions about their transactions.

Be concise, friendly, and use Philippine Peso (₱) for all amounts. If asked about something outside of finance or the user's data, politely redirect the conversation back to financial topics.

Here is the current financial data you have access to:

{financial_context}

Use this data to answer questions accurately. If the user asks about specific transactions you don't have details on, let them know you only have summary-level data for the last 30 days."""

        messages = [{"role": "system", "content": system_prompt}]

        # Append conversation history
        for msg in history:
            messages.append({"role": msg["role"], "content": msg["content"]})

        # Append current user message
        messages.append({"role": "user", "content": message})

        client = get_groq_client()
        response = await client.chat.completions.create(
            model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
            messages=messages,  # type: ignore
            max_tokens=1024,
            temperature=0.7,
        )

        reply = response.choices[0].message.content
        logger.info(f"AI chat response generated for user_id={user_id} role={role}")
        return reply    # type: ignore

    except Exception:
        logger.exception("Error getting AI chat response")
        raise