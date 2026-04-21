# app/services/rebalancing_service.py
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import math

from app.models.portfolio import Portfolio
from app.models.holding import Holding
from app.models.rebalancing import TargetAllocation
from app.schemas.rebalancing import (
    RebalanceResponse, 
    SectorRebalanceComparison, 
    RebalanceSuggestion,
    TargetAllocationCreate
)
from app.services.analytics_service import AnalyticsService

class RebalancingService:
    def __init__(self, db: Session):
        self.db = db
        self.analytics = AnalyticsService(db)

    def set_target_allocations(self, portfolio_id: int, targets: List[TargetAllocationCreate]):
        """Sets target allocations for a portfolio, replacing existing ones."""
        # Remove existing targets for this category type (defaulting to sector)
        self.db.query(TargetAllocation).filter(
            TargetAllocation.portfolio_id == portfolio_id,
            TargetAllocation.category_type == "sector"
        ).delete()

        # Add new targets
        db_targets = [
            TargetAllocation(
                portfolio_id=portfolio_id,
                category_name=t.category_name,
                target_percentage=t.target_percentage,
                category_type=t.category_type
            )
            for t in targets
        ]
        
        self.db.add_all(db_targets)
        self.db.commit()
        return db_targets

    def get_target_allocations(self, portfolio_id: int) -> List[TargetAllocation]:
        """Get existing target allocations."""
        return self.db.query(TargetAllocation).filter(
            TargetAllocation.portfolio_id == portfolio_id
        ).all()

    async def generate_rebalancing_suggestions(self, portfolio_id: int) -> RebalanceResponse:
        """
        Calculates deviations from targets and suggests trade actions.
        """
        portfolio = self.db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
        if not portfolio:
            raise ValueError("Portfolio not found")

        holdings = self.db.query(Holding).filter(Holding.portfolio_id == portfolio_id).all()
        targets = self.get_target_allocations(portfolio_id)
        
        total_value = portfolio.total_value
        cash = portfolio.cash_balance
        
        # Get current sector allocation
        current_sectors = self.analytics.calculate_sector_allocation(portfolio_id)
        current_map = {s['sector']: s['percentage'] / 100 for s in current_sectors}
        
        target_map = {t.category_name: t.target_percentage for t in targets}
        
        comparisons = []
        all_sectors = set(list(current_map.keys()) + list(target_map.keys()))
        
        suggestions = []
        
        for sector in all_sectors:
            curr = current_map.get(sector, 0.0)
            target = target_map.get(sector, 0.0)
            diff = target - curr
            
            action_value = diff * total_value
            
            comparisons.append(SectorRebalanceComparison(
                sector=sector,
                current_percentage=curr,
                target_percentage=target,
                difference_percentage=diff,
                suggested_action_value=action_value
            ))
            
            # Generate specific symbol suggestions
            if abs(action_value) > 100: # Ignore tiny rebalances
                sector_holdings = [h for h in holdings if h.sector == sector]
                
                if action_value < 0: # SELL needed
                    # Propose selling from the largest holdings in that sector
                    sorted_holdings = sorted(sector_holdings, key=lambda x: x.market_value, reverse=True)
                    remaining_to_sell = abs(action_value)
                    
                    for h in sorted_holdings:
                        if remaining_to_sell <= 0: break
                        
                        sell_amount = min(h.market_value, remaining_to_sell)
                        shares_to_sell = math.floor(sell_amount / h.current_price) if h.current_price > 0 else 0
                        
                        if shares_to_sell > 0:
                            suggestions.append(RebalanceSuggestion(
                                symbol=h.symbol,
                                action="SELL",
                                shares=float(shares_to_sell),
                                estimated_price=h.current_price,
                                estimated_total=shares_to_sell * h.current_price,
                                reason=f"Sector '{sector}' is overweight by {abs(diff*100):.1f}%."
                            ))
                            remaining_to_sell -= (shares_to_sell * h.current_price)

                elif action_value > 0: # BUY needed
                    # Propose buying existing symbols in that sector or notifying if none exist
                    if sector_holdings:
                        # Split BUY across existing holdings
                        buy_per_holding = action_value / len(sector_holdings)
                        for h in sector_holdings:
                            shares_to_buy = math.floor(buy_per_holding / h.current_price) if h.current_price > 0 else 0
                            if shares_to_buy > 0:
                                suggestions.append(RebalanceSuggestion(
                                    symbol=h.symbol,
                                    action="BUY",
                                    shares=float(shares_to_buy),
                                    estimated_price=h.current_price,
                                    estimated_total=shares_to_buy * h.current_price,
                                    reason=f"Sector '{sector}' is underweight by {abs(diff*100):.1f}%."
                                ))
                    else:
                        # No holdings in this sector yet
                        suggestions.append(RebalanceSuggestion(
                            symbol="NEW_PICK",
                            action="BUY",
                            shares=0,
                            estimated_price=0,
                            estimated_total=action_value,
                            reason=f"You have no exposure to '{sector}'. Consider adding a new position for diversification."
                        ))

        summary = self._generate_summary(comparisons)

        return RebalanceResponse(
            portfolio_id=portfolio_id,
            total_value=total_value,
            cash_balance=cash,
            sector_comparisons=comparisons,
            suggestions=suggestions,
            summary=summary
        )

    def _generate_summary(self, comparisons: List[SectorRebalanceComparison]) -> str:
        overweight = [c.sector for c in comparisons if c.difference_percentage < -0.05]
        underweight = [c.sector for c in comparisons if c.difference_percentage > 0.05]
        
        if not overweight and not underweight:
            return "Your portfolio is currently well-balanced according to your targets."
        
        msg = "Rebalancing needed. "
        if overweight:
            msg += f"Overweight sectors: {', '.join(overweight)}. "
        if underweight:
            msg += f"Underweight sectors: {', '.join(underweight)}."
            
        return msg
