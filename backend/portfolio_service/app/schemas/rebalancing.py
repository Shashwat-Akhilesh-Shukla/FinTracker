# app/schemas/rebalancing.py
from pydantic import BaseModel, validator
from typing import List, Optional

class TargetAllocationBase(BaseModel):
    category_name: str
    target_percentage: float
    category_type: str = "sector"

    @validator('target_percentage')
    def validate_percentage(cls, v):
        if not 0 <= v <= 1:
            raise ValueError('Target percentage must be between 0 and 1')
        return v

class TargetAllocationCreate(TargetAllocationBase):
    pass

class TargetAllocationResponse(TargetAllocationBase):
    id: int
    portfolio_id: int

    class Config:
        from_attributes = True

class RebalanceSuggestion(BaseModel):
    symbol: str
    action: str # BUY, SELL
    shares: float
    estimated_price: float
    estimated_total: float
    reason: str

class SectorRebalanceComparison(BaseModel):
    sector: str
    current_percentage: float
    target_percentage: float
    difference_percentage: float
    suggested_action_value: float # $ amount to move

class RebalanceResponse(BaseModel):
    portfolio_id: int
    total_value: float
    cash_balance: float
    sector_comparisons: List[SectorRebalanceComparison]
    suggestions: List[RebalanceSuggestion]
    summary: str
