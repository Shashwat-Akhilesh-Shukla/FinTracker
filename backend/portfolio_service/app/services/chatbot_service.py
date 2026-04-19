"""
Chatbot service that:
- Fetches portfolio, holdings, and transaction data from the database for a user
- Builds a rich context prompt from the portfolio data
- Calls the Perplexity API (OpenAI-compatible) with streaming enabled
- Yields SSE-formatted chunks for real-time streaming to the client
"""

from typing import AsyncGenerator, List, Dict, Any, Optional
from sqlalchemy.orm import Session
from openai import AsyncOpenAI

from app.models.portfolio import Portfolio
from app.models.holding import Holding
from app.models.transaction import Transaction
from app.core.config import settings
from app.services.analytics_service import AnalyticsService



def _build_portfolio_context(db: Session, user_id: int) -> str:
    """Build a structured text context from the user's portfolio data."""
    portfolio = db.query(Portfolio).filter(Portfolio.user_id == user_id).first()

    if not portfolio:
        return "The user has no portfolio data yet."

    lines = []

    # --- Portfolio Summary ---
    lines.append("=== PORTFOLIO SUMMARY ===")
    lines.append(f"Portfolio Name: {portfolio.name}")
    if portfolio.description:
        lines.append(f"Description: {portfolio.description}")
    lines.append(f"Total Value:          ${portfolio.total_value:,.2f}")
    lines.append(f"Total Cost Basis:     ${portfolio.total_cost:,.2f}")
    lines.append(f"Total Return:         ${portfolio.total_return:,.2f} ({portfolio.total_return_percent:.2f}%)")
    lines.append(f"Day Change:           ${portfolio.day_change:,.2f} ({portfolio.day_change_percent:.2f}%)")
    lines.append(f"Cash Balance:         ${portfolio.cash_balance:,.2f}")
    lines.append(f"Dividend Income:      ${portfolio.dividend_income:,.2f}")
    if portfolio.last_sync:
        lines.append(f"Last Synced:          {portfolio.last_sync.strftime('%Y-%m-%d %H:%M UTC')}")

    # --- Advanced Metrics ---
    analytics = AnalyticsService(db)
    metrics = analytics.calculate_portfolio_metrics(portfolio.id)
    if metrics:
        lines.append("\n=== ADVANCED PERFORMANCE & RISK METRICS ===")
        lines.append(f"Sharpe Ratio:         {metrics.get('sharpe_ratio', 0.0):.2f}")
        lines.append(f"Beta (vs Market):     {metrics.get('beta', 1.0):.2f}")
        lines.append(f"Alpha:               {metrics.get('alpha', 0.0):.2f}%")
        lines.append(f"Volatility (SD):     {metrics.get('volatility', 0.0):.2f}%")
        lines.append(f"Max Drawdown:        {metrics.get('max_drawdown', 0.0):.2f}%")
        lines.append(f"Value at Risk (95%): {metrics.get('var_95', 0.0):.2f}%")
        lines.append(f"Annualized Return:    {metrics.get('annualized_return', 0.0):.2f}%")

    # --- Sector Allocation ---
    sectors = analytics.calculate_sector_allocation(portfolio.id)
    if sectors:
        lines.append("\n=== SECTOR ALLOCATION ===")
        for s in sectors:
            lines.append(f"{s['sector']:<20} {s['percentage']:>6.2f}% (${s['value']:,.2f})")

    # --- Holdings ---
    holdings = db.query(Holding).filter(Holding.portfolio_id == portfolio.id).all()
    if holdings:
        lines.append("\n=== HOLDINGS ===")
        lines.append(
            f"{'Symbol':<8} {'Name':<25} {'Shares':>8} {'Avg Cost':>10} "
            f"{'Curr Price':>11} {'Mkt Value':>12} {'Return':>10} {'Return%':>8} {'Sector':<15}"
        )
        lines.append("-" * 115)
        for h in holdings:
            lines.append(
                f"{h.symbol:<8} {(h.name or '')[:24]:<25} {h.shares:>8.2f} "
                f"${h.avg_cost:>9.2f} ${h.current_price:>10.2f} "
                f"${h.market_value:>11.2f} ${h.total_return:>9.2f} "
                f"{h.total_return_percent:>7.2f}% {(h.sector or 'N/A'):<15}"
            )
            if h.pe_ratio or h.dividend_yield:
                extras = []
                if h.pe_ratio:
                    extras.append(f"P/E: {h.pe_ratio:.1f}")
                if h.dividend_yield:
                    extras.append(f"Div Yield: {h.dividend_yield:.2f}%")
                lines.append(f"         ({', '.join(extras)})")
    else:
        lines.append("\n=== HOLDINGS ===\nNo holdings found.")

    # --- Recent Transactions (last 20) ---
    recent_txns = (
        db.query(Transaction)
        .filter(Transaction.portfolio_id == portfolio.id)
        .order_by(Transaction.transaction_date.desc())
        .limit(20)
        .all()
    )
    if recent_txns:
        lines.append("\n=== RECENT TRANSACTIONS (last 20) ===")
        lines.append(f"{'Date':<12} {'Type':<8} {'Symbol':<8} {'Shares':>8} {'Price':>10} {'Total':>12} {'Note'}")
        lines.append("-" * 80)
        for t in recent_txns:
            date_str = t.transaction_date.strftime("%Y-%m-%d") if t.transaction_date else "N/A"
            lines.append(
                f"{date_str:<12} {t.type:<8} {t.symbol:<8} {t.shares:>8.2f} "
                f"${t.price:>9.2f} ${t.total_amount:>11.2f}  {t.note or ''}"
            )
    else:
        lines.append("\n=== RECENT TRANSACTIONS ===\nNo transactions found.")

    return "\n".join(lines)


SYSTEM_PROMPT = """You are FinBot, an expert AI financial advisor embedded in the FinTracker portfolio management app.

You have been given the user's real portfolio data from the database. Use this data to answer questions accurately and helpfully.

Guidelines:
- Be concise but thorough. Use numbers from the data when relevant.
- Provide actionable insights when asked (e.g., diversification, risk, performance).
- If asked about something not in the data (e.g., future predictions), be honest about limitations.
- Format numbers clearly (e.g., $1,234.56, 12.34%).
- Keep a professional yet friendly tone.
- Do NOT make up data that isn't in the portfolio context provided.
"""


async def stream_chat_response(
    db: Session,
    user_id: int,
    message: str,
    conversation_history: Optional[List[Dict[str, str]]] = None,
) -> AsyncGenerator[str, None]:
    """
    Fetch portfolio context, call Perplexity API with streaming,
    and yield SSE-formatted chunks.
    """
    # Build portfolio context
    portfolio_context = _build_portfolio_context(db, user_id)

    # Build messages list
    messages: List[Dict[str, Any]] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"Here is my current portfolio data:\n\n{portfolio_context}",
        },
        {
            "role": "assistant",
            "content": "I have reviewed your portfolio data. I'm ready to answer your questions about it.",
        },
    ]

    # Append prior conversation history (for multi-turn)
    if conversation_history:
        for turn in conversation_history:
            if turn.get("role") in ("user", "assistant") and turn.get("content"):
                messages.append({"role": turn["role"], "content": turn["content"]})

    # Append the current user message
    messages.append({"role": "user", "content": message})

    # Call Perplexity API (OpenAI-compatible)
    client = AsyncOpenAI(
        api_key=settings.PERPLEXITY_API_KEY,
        base_url="https://api.perplexity.ai",
    )

    stream = await client.chat.completions.create(
        model="llama-3.1-sonar-small-128k-online",
        messages=messages,
        stream=True,
        temperature=0.2,
        max_tokens=1024,
    )

    async for chunk in stream:
        delta = chunk.choices[0].delta if chunk.choices else None
        if delta and delta.content:
            # Yield SSE-formatted data
            yield f"data: {delta.content}\n\n"

    # Signal end of stream
    yield "data: [DONE]\n\n"
