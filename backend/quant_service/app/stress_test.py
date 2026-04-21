# app/stress_test.py
from typing import List, Dict
from sqlalchemy.orm import Session
from app.analytics import analytics_engine
from app.schemas import StressTestResponse, ScenarioImpact
from app.models import Portfolio, Holding

SCENARIOS = [
    {
        "name": "2008 Financial Crisis",
        "drop_pct": 50.0,
        "description": "Historical crash triggered by the subprime mortgage collapse."
    },
    {
        "name": "2020 COVID-19 Flash Crash",
        "drop_pct": 33.0,
        "description": "Rapid market decline due to global pandemic uncertainty."
    },
    {
        "name": "2022 Tech Bear Market",
        "drop_pct": 25.0,
        "description": "Sharp decline in growth stocks due to rising interest rates."
    },
    {
        "name": "Mild Recession",
        "drop_pct": 15.0,
        "description": "Standard economic downturn simulation."
    },
    {
        "name": "Correction",
        "drop_pct": 10.0,
        "description": "Regular market pull-back."
    }
]

class StressTestService:
    @staticmethod
    async def run_stress_test(db: Session, user_id: int) -> StressTestResponse:
        portfolio = db.query(Portfolio).filter(Portfolio.user_id == user_id).first()
        if not portfolio:
            return StressTestResponse(
                user_id=user_id,
                current_value=0,
                portfolio_beta=1.0,
                scenarios=[],
                custom_shock_sensitivity=1.0,
                ai_advice="No portfolio data found to analyze."
            )

        # Get current metrics (especially Beta)
        metrics = await analytics_engine.calculate_performance_metrics(db, user_id)
        beta = metrics.sharpe_ratio  # Wait, wait. AnalyticsEngine calculate_performance_metrics returns beta. 
        # Actually I just checked analytics.py line 45 returns PerformanceMetrics(sharpe_ratio=sharpe_ratio, beta=beta...)
        # I need to use metrics.beta
        
        portfolio_beta = metrics.beta
        current_value = portfolio.total_value
        
        impacts = []
        for stage in SCENARIOS:
            # Expected Portfolio Drop = Beta * Market Drop
            # Note: We cap the loss at 100% of course, but it shouldn't hit that usually.
            portfolio_drop_pct = min(100.0, portfolio_beta * stage["drop_pct"])
            drop_value = (portfolio_drop_pct / 100.0) * current_value
            remaining = current_value - drop_value
            
            # Risk Level categorization
            if portfolio_drop_pct < 15:
                risk_level = "Low"
            elif portfolio_drop_pct < 30:
                risk_level = "Moderate"
            elif portfolio_drop_pct < 50:
                risk_level = "High"
            else:
                risk_level = "Extreme"

            impacts.append(ScenarioImpact(
                scenario_name=stage["name"],
                market_drop_pct=stage["drop_pct"],
                estimated_portfolio_drop_pct=round(portfolio_drop_pct, 2),
                estimated_portfolio_drop_value=round(drop_value, 2),
                remaining_value=round(remaining, 2),
                risk_level=risk_level
            ))

        ai_advice = StressTestService._generate_ai_advice(portfolio_beta, impacts)

        return StressTestResponse(
            user_id=user_id,
            current_value=current_value,
            portfolio_beta=portfolio_beta,
            scenarios=impacts,
            custom_shock_sensitivity=portfolio_beta,
            ai_advice=ai_advice
        )

    @staticmethod
    def _generate_ai_advice(beta: float, impacts: List[ScenarioImpact]) -> str:
        if beta > 1.3:
            return (
                "Your portfolio is highly aggressive (Beta > 1.3). While you outperform in bull markets, "
                "you are significantly vulnerable to crashes. Consider rotating 10-15% into defensive "
                "sectors like Consumer Staples or Utilities to dampen volatility."
            )
        elif beta < 0.7:
            return (
                "Your portfolio is very defensive (Beta < 0.7). You are well-protected against market shocks, "
                "but you might be lagging behind in broad market rallies. Ensure you have enough growth "
                "exposure to meet your long-term goals."
            )
        else:
            return (
                "Your portfolio has a balanced risk profile (Beta near 1.0). You are tracking the market "
                "closely. Ensure your diversification across sectors is maintained to avoid hidden concentration risks."
            )
