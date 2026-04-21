# app/api/v1/endpoints/rebalancing.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.api.deps import get_current_user
from app.schemas.rebalancing import (
    RebalanceResponse, 
    TargetAllocationCreate, 
    TargetAllocationResponse
)
from app.services.rebalancing_service import RebalancingService
from app.models.portfolio import Portfolio

router = APIRouter()

@router.get("/target-allocation", response_model=List[TargetAllocationResponse])
async def get_target_allocations(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the defined target allocations for the user's default portfolio."""
    portfolio = db.query(Portfolio).filter(Portfolio.user_id == current_user["user_id"]).first()
    if not portfolio:
        return []
    
    service = RebalancingService(db)
    return service.get_target_allocations(portfolio.id)

@router.post("/target-allocation", response_model=List[TargetAllocationResponse])
async def set_target_allocations(
    targets: List[TargetAllocationCreate],
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Set the target allocations for the user's default portfolio."""
    portfolio = db.query(Portfolio).filter(Portfolio.user_id == current_user["user_id"]).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Optional: Validate that percentages sum to 1.0 (or close to it)
    total_percent = sum(t.target_percentage for t in targets)
    if total_percent > 1.001: # Allowing for minor float rounding
        raise HTTPException(status_code=400, detail=f"Total target percentage cannot exceed 100% (currently {total_percent*100}%).")

    service = RebalancingService(db)
    return service.set_target_allocations(portfolio.id, targets)

@router.get("/rebalance", response_model=RebalanceResponse)
async def get_rebalancing_suggestions(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Calculate deviations and get trade suggestions."""
    portfolio = db.query(Portfolio).filter(Portfolio.user_id == current_user["user_id"]).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    service = RebalancingService(db)
    return await service.generate_rebalancing_suggestions(portfolio.id)
