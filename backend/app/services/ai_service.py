import os
import re
import time
import logging
from groq import AsyncGroq
from db.connection import get_pool
from datetime import date, timedelta
from dotenv import load_dotenv
from pathlib import Path
from typing import Literal

load_dotenv(dotenv_path=Path(__file__).resolve().parents[3] / ".env", override=False)
logger = logging.getLogger(__name__)

# ── Context cache: keyed by (user_id, scope) ─────────────────────────────────
_context_cache: dict[tuple, tuple[dict, float]] = {}
CACHE_TTL = 300  # 5 minutes


def get_groq_client() -> AsyncGroq:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY is not set in environment variables")
    return AsyncGroq(
        api_key=api_key,
        max_retries=0,
        timeout=12.0,
    )


# ── Keyword extractor ─────────────────────────────────────────────────────────
def _extract_keywords(message: str) -> list[str]:
    stopwords = {
        "how", "much", "have", "i", "spent", "on", "in", "the", "my", "a",
        "an", "is", "are", "was", "what", "when", "which", "who", "where",
        "show", "me", "all", "for", "from", "to", "of", "and", "or", "do",
        "did", "does", "can", "could", "would", "total", "amount", "transactions",
        "expense", "expenses", "income", "category", "categories", "report",
        "last", "this", "month", "year", "week", "day", "days", "months",
        "february", "march", "april", "may", "june", "july", "august",
        "september", "october", "november", "december", "january",
        "feb", "mar", "apr", "jun", "jul", "aug", "sep", "oct", "nov", "dec", "jan",
    }
    words = re.findall(r"[a-zA-Z0-9]+", message.lower())
    return [w for w in words if w not in stopwords and len(w) >= 3]


def _build_context_string(ctx: dict, keywords: list[str]) -> str:
    all_txns = ctx["transactions"]
    if keywords:
        matched = [t for t in all_txns if any(kw in t["description"].lower() for kw in keywords)]
        filtered = matched if matched else all_txns
        label = ", keyword-filtered" if matched else ""
    else:
        filtered = all_txns
        label = ""

    if filtered:
        desc_lines = "\n".join(
            f"  - [{t['date']}] {t['type']} | {t['category']} | ₱{t['amount']:,.2f} | {t['description']}"
            for t in filtered
        )
        desc_section = (
            f"\n=== INDIVIDUAL TRANSACTIONS WITH DESCRIPTIONS "
            f"(last 90 days{label}) ===\n"
            f"Format: [date] type | category | amount | description\n{desc_lines}"
        )
    else:
        desc_section = ""

    return f"""Financial data {ctx['scope']}:

=== LAST 30 DAYS ({ctx['thirty_days_ago']} to {ctx['today']}) ===
{ctx['recent_summary']}

Category Breakdown (last 30 days):
{ctx['recent_breakdown']}

=== ALL-TIME (since {ctx['earliest']}) ===
{ctx['alltime_summary']}

Monthly Breakdown (all-time):
{ctx['monthly_breakdown']}
{desc_section}""".strip()


# ── DB fetch ──────────────────────────────────────────────────────────────────
async def _fetch_context_from_db(
    user_id: int,
    role: str,
    scope: Literal["all", "own"],
) -> dict:
    pool = await get_pool()
    today = date.today()
    ninety_days_ago = today - timedelta(days=90)
    thirty_days_ago = today - timedelta(days=30)

    # Admins with scope="own" behave exactly like standard users
    use_all = (role == "admin" and scope == "all")

    async with pool.acquire() as conn:
        if use_all:
            scope_label = "across all users in the business"

            recent_totals = await conn.fetchrow(
                """
                SELECT
                    COALESCE(SUM(CASE WHEN transaction_type = 'Income'  THEN amount ELSE 0 END), 0) AS total_income,
                    COALESCE(SUM(CASE WHEN transaction_type = 'Expense' THEN amount ELSE 0 END), 0) AS total_expenses,
                    COUNT(*) AS total_transactions
                FROM transactions
                WHERE deleted_at IS NULL AND transaction_date BETWEEN $1 AND $2
                """,
                thirty_days_ago, today,
            )
            recent_rows = await conn.fetch(
                """
                SELECT t.transaction_type, c.name AS category_name,
                    SUM(t.amount) AS total_amount, COUNT(*) AS entry_count
                FROM transactions t
                JOIN categories c ON c.id = t.category_id
                WHERE t.deleted_at IS NULL AND t.transaction_date BETWEEN $1 AND $2
                GROUP BY t.transaction_type, c.name ORDER BY total_amount DESC
                """,
                thirty_days_ago, today,
            )
            alltime_totals = await conn.fetchrow(
                """
                SELECT
                    COALESCE(SUM(CASE WHEN transaction_type = 'Income'  THEN amount ELSE 0 END), 0) AS total_income,
                    COALESCE(SUM(CASE WHEN transaction_type = 'Expense' THEN amount ELSE 0 END), 0) AS total_expenses,
                    COUNT(*) AS total_transactions,
                    MIN(transaction_date) AS earliest_date
                FROM transactions WHERE deleted_at IS NULL
                """,
            )
            monthly_rows = await conn.fetch(
                """
                SELECT DATE_TRUNC('month', transaction_date)::date AS month,
                    COALESCE(SUM(CASE WHEN transaction_type = 'Income'  THEN amount ELSE 0 END), 0) AS income,
                    COALESCE(SUM(CASE WHEN transaction_type = 'Expense' THEN amount ELSE 0 END), 0) AS expenses
                FROM transactions WHERE deleted_at IS NULL
                GROUP BY month ORDER BY month ASC
                """,
            )
            transaction_rows = await conn.fetch(
                """
                SELECT t.transaction_type, t.amount, t.description,
                    t.transaction_date, c.name AS category_name
                FROM transactions t
                JOIN categories c ON c.id = t.category_id
                WHERE t.deleted_at IS NULL
                  AND t.description IS NOT NULL AND TRIM(t.description) != ''
                  AND t.transaction_date >= $1
                ORDER BY t.transaction_date DESC
                """,
                ninety_days_ago,
            )

        else:
            scope_label = "for your own transactions"

            recent_totals = await conn.fetchrow(
                """
                SELECT
                    COALESCE(SUM(CASE WHEN transaction_type = 'Income'  THEN amount ELSE 0 END), 0) AS total_income,
                    COALESCE(SUM(CASE WHEN transaction_type = 'Expense' THEN amount ELSE 0 END), 0) AS total_expenses,
                    COUNT(*) AS total_transactions
                FROM transactions
                WHERE deleted_at IS NULL AND user_id = $1
                  AND transaction_date BETWEEN $2 AND $3
                """,
                user_id, thirty_days_ago, today,
            )
            recent_rows = await conn.fetch(
                """
                SELECT t.transaction_type, c.name AS category_name,
                    SUM(t.amount) AS total_amount, COUNT(*) AS entry_count
                FROM transactions t
                JOIN categories c ON c.id = t.category_id
                WHERE t.deleted_at IS NULL AND t.user_id = $1
                  AND t.transaction_date BETWEEN $2 AND $3
                GROUP BY t.transaction_type, c.name ORDER BY total_amount DESC
                """,
                user_id, thirty_days_ago, today,
            )
            alltime_totals = await conn.fetchrow(
                """
                SELECT
                    COALESCE(SUM(CASE WHEN transaction_type = 'Income'  THEN amount ELSE 0 END), 0) AS total_income,
                    COALESCE(SUM(CASE WHEN transaction_type = 'Expense' THEN amount ELSE 0 END), 0) AS total_expenses,
                    COUNT(*) AS total_transactions,
                    MIN(transaction_date) AS earliest_date
                FROM transactions WHERE deleted_at IS NULL AND user_id = $1
                """,
                user_id,
            )
            monthly_rows = await conn.fetch(
                """
                SELECT DATE_TRUNC('month', transaction_date)::date AS month,
                    COALESCE(SUM(CASE WHEN transaction_type = 'Income'  THEN amount ELSE 0 END), 0) AS income,
                    COALESCE(SUM(CASE WHEN transaction_type = 'Expense' THEN amount ELSE 0 END), 0) AS expenses
                FROM transactions WHERE deleted_at IS NULL AND user_id = $1
                GROUP BY month ORDER BY month ASC
                """,
                user_id,
            )
            transaction_rows = await conn.fetch(
                """
                SELECT t.transaction_type, t.amount, t.description,
                    t.transaction_date, c.name AS category_name
                FROM transactions t
                JOIN categories c ON c.id = t.category_id
                WHERE t.deleted_at IS NULL AND t.user_id = $1
                  AND t.description IS NOT NULL AND TRIM(t.description) != ''
                  AND t.transaction_date >= $2
                ORDER BY t.transaction_date DESC
                """,
                user_id, ninety_days_ago,
            )

    def fmt(v): return f"₱{float(v):,.2f}"

    r_income   = float(recent_totals["total_income"])
    r_expenses = float(recent_totals["total_expenses"])
    r_net      = r_income - r_expenses
    r_count    = recent_totals["total_transactions"]

    a_income   = float(alltime_totals["total_income"])
    a_expenses = float(alltime_totals["total_expenses"])
    a_net      = a_income - a_expenses
    a_count    = alltime_totals["total_transactions"]
    earliest   = alltime_totals["earliest_date"]

    return {
        "scope": scope_label,
        "thirty_days_ago": str(thirty_days_ago),
        "today": str(today),
        "recent_summary": (
            f"Total Income: {fmt(r_income)}\nTotal Expenses: {fmt(r_expenses)}\n"
            f"Net Profit/Loss: {fmt(r_net)}\nTransactions: {r_count}"
        ),
        "recent_breakdown": "\n".join(
            f"  - {r['category_name']} ({r['transaction_type']}): "
            f"{fmt(r['total_amount'])} across {r['entry_count']} transaction(s)"
            for r in recent_rows
        ) or "  No transactions found.",
        "earliest": str(earliest),
        "alltime_summary": (
            f"Total Income: {fmt(a_income)}\nTotal Expenses: {fmt(a_expenses)}\n"
            f"Net Profit/Loss: {fmt(a_net)}\nTransactions: {a_count}"
        ),
        "monthly_breakdown": "\n".join(
            f"  - {r['month'].strftime('%B %Y')}: "
            f"Income {fmt(r['income'])} | Expenses {fmt(r['expenses'])} | "
            f"Net {fmt(float(r['income']) - float(r['expenses']))}"
            for r in monthly_rows
        ) or "  No monthly data found.",
        "transactions": [
            {
                "date": r["transaction_date"].strftime("%Y-%m-%d"),
                "type": r["transaction_type"],
                "category": r["category_name"],
                "amount": float(r["amount"]),
                "description": r["description"].strip(),
            }
            for r in transaction_rows
        ],
    }


async def get_financial_context(
    user_id: int,
    role: str,
    scope: Literal["all", "own"] = "all",
) -> dict:
    """Return cached context or fetch fresh. Cache key includes scope."""
    effective_scope = scope if role == "admin" else "own"
    cache_key = (user_id, effective_scope)

    cached = _context_cache.get(cache_key)
    if cached:
        ctx, ts = cached
        if time.time() - ts < CACHE_TTL:
            logger.info(f"Context cache hit for user_id={user_id} scope={effective_scope}")
            return ctx

    logger.info(f"Context cache miss — fetching DB for user_id={user_id} scope={effective_scope}")
    ctx = await _fetch_context_from_db(user_id, role, effective_scope)
    _context_cache[cache_key] = (ctx, time.time())
    return ctx


async def chat(
    message: str,
    history: list[dict],
    user_id: int,
    role: str,
    scope: Literal["all", "own"] = "all",
) -> str:
    try:
        ctx = await get_financial_context(user_id, role, scope)
        keywords = _extract_keywords(message)
        financial_context = _build_context_string(ctx, keywords)

        scope_note = (
            "\nYou are currently viewing YOUR OWN transactions only (not all users)."
            if role == "admin" and scope == "own"
            else "\nYou are viewing data across ALL users in the business."
            if role == "admin"
            else ""
        )

        system_prompt = f"""You are a financial assistant for TransacScope. Friendly, casual, and direct — like a knowledgeable friend who knows their numbers.
{scope_note}
DATA HIERARCHY — always follow this when picking which dataset to answer from:
- "this month", "recently", or no time specified → use LAST 30 DAYS section (default)
- specific month or date range → use MONTHLY BREAKDOWN or INDIVIDUAL TRANSACTIONS
- "all time", "ever", "total", "since I started" → use ALL-TIME section
- keyword/item questions (e.g. "bombits", "tuition") → use INDIVIDUAL TRANSACTIONS WITH DESCRIPTIONS
Never mix datasets in a single answer. Pick the right one and commit to it.
Never announce which dataset you used (no "Based on last 30 days..." preamble). Just answer naturally. Only mention the time period if the user didn't specify one and it adds useful context — e.g. "Transportation leads at ₱2,084 this month."

RULES:
1. Answer what was asked, then one short follow-up thought max — never volunteer unrequested data as the main answer.
2. For date range questions, give a breakdown (per-month etc.), not just a single number.
3. Use individual transaction descriptions to answer keyword/item questions.
4. If you don't have the data, say so briefly and suggest the Reports section.
5. No "great question!", no lectures, no unsolicited advice.
6. Use ₱ for all amounts. Short paragraphs or a clean list — not walls of text.
7. Anything outside finance or this app: politely say it's out of scope and redirect.
8. Never contradict yourself. Pick one answer and commit — do not revise mid-sentence.

Financial data:
{financial_context}"""

        messages = [{"role": "system", "content": system_prompt}]
        for msg in history:
            messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": message})

        client = get_groq_client()
        response = await client.chat.completions.create(
            model=os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"),
            messages=messages,  # type: ignore
            max_tokens=512,
            temperature=0.5,
        )

        reply = response.choices[0].message.content
        logger.info(f"AI response for user_id={user_id} role={role} scope={scope} keywords={keywords}")
        return reply  # type: ignore

    except Exception:
        logger.exception("Error getting AI chat response")
        raise