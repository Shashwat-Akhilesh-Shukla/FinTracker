# app/models/rebalancing.py
from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class TargetAllocation(Base):
    """
    Model for storing desired portfolio allocation targets.
    Enables rebalancing at the Sector or Category level.
    """
    __tablename__ = "target_allocations"

    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    
    # category_type could be 'sector', 'asset_class', etc.
    category_type = Column(String, default="sector", nullable=False)
    category_name = Column(String, nullable=False) # e.g. 'Technology', 'Financials'
    
    target_percentage = Column(Float, nullable=False) # e.g. 0.40 for 40%
    
    # Relationship
    portfolio = relationship("Portfolio")

    def __repr__(self):
        return f"<TargetAllocation(portfolio_id={self.portfolio_id}, {self.category_name}={self.target_percentage*100}%)>"
