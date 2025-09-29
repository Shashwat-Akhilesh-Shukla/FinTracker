from datetime import datetime, timedelta
from typing import Dict, List
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import MarketData
from app.market_data import FinnhubMarketDataService
import logging

logger = logging.getLogger(__name__)

class BenchmarkService:
    def __init__(self):
        self.benchmarks = {
            "NIFTY50": "^NSEI",
            "SP500": "^GSPC", 
            "NASDAQ": "^IXIC",
            "SENSEX": "^BSESN"
        }
        self.market_data_service = FinnhubMarketDataService()

    # async def get_benchmark_data(self, timeframe: str) -> Dict[str, List[Dict]]:
    #     period_days = {
    #         "1M": 30, 
    #         "6M": 180, 
    #         "1Y": 365, 
    #         "3Y": 1095, 
    #         "MAX": 2000
    #     }
    #     days = period_days.get(timeframe, 365)

    #     benchmark_data = {}
    #     for name, symbol in self.benchmarks.items():
    #         try:
    #             data = await self.market_data_service.get_market_benchmark_data(symbol, days)
    #             benchmark_data[name] = data
    #         except Exception as e:
    #             logger.error(f"Error fetching {name}: {e}")
    #             benchmark_data[name] = []

    #     return benchmark_data

    def _get_db_benchmark_data(self, db: Session, symbol: str, days: int) -> List[Dict]:
        """Get benchmark data from database"""
        try:
            # Calculate cutoff date
            cutoff_date = datetime.now() - timedelta(days=days)
            
            # Query market data from DB
            benchmark_data = db.query(MarketData).filter(
                MarketData.symbol == symbol,
                MarketData.date >= cutoff_date
            ).order_by(MarketData.date.asc()).all()

            # Format data
            return [
                {
                    "date": data.date.strftime("%Y-%m-%d"),
                    "close": data.close
                }
                for data in benchmark_data
            ]
        except Exception as e:
            logger.error(f"Error getting benchmark data from DB for {symbol}: {e}")
            return []

    async def get_benchmark_data(self, timeframe: str) -> Dict[str, List[Dict]]:
        """Get benchmark data with DB fallback"""
        period_days = {
            "1M": 30, 
            "6M": 180, 
            "1Y": 365, 
            "3Y": 1095, 
            "MAX": 2000
        }
        days = period_days.get(timeframe, 365)

        benchmark_data = {}
        db = next(get_db())  # Get DB session

        try:
            for name, symbol in self.benchmarks.items():
                # Get data from DB
                data = self._get_db_benchmark_data(db, symbol, days)
                benchmark_data[name] = data
                
                if not data:
                    logger.warning(f"No DB data found for benchmark {name} ({symbol})")
        except Exception as e:
            logger.error(f"Error fetching benchmark data: {e}")
        finally:
            db.close()

        return benchmark_data

    async def calculate_benchmark_returns(self, timeframe: str) -> Dict[str, float]:
        data = await self.get_benchmark_data(timeframe)
        returns = {}

        for name, prices in data.items():
            if len(prices) >= 2:
                start_price = prices[0]["close"]
                end_price = prices[-1]["close"]
                return_pct = ((end_price - start_price) / start_price) * 100
                returns[name] = round(return_pct, 2)
            else:
                returns[name] = 0.0

        return returns

    def generate_mock_benchmark_data(self, timeframe: str) -> Dict[str, List[Dict]]:
        """Generate realistic mock benchmark data for visualization"""
        import numpy as np
        from datetime import datetime, timedelta

        period_days = {
            "1M": 30,
            "6M": 180,
            "1Y": 365,
            "3Y": 1095,
            "MAX": 2000
        }
        days = period_days.get(timeframe, 365)

        # Generate dates
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        dates = [start_date + timedelta(days=i) for i in range(days)]

        benchmark_data = {}

        # Benchmark characteristics (approximate real market data)
        benchmark_params = {
            "NIFTY50": {"start_price": 18000, "annual_return": 0.12, "volatility": 0.18},
            "SP500": {"start_price": 4000, "annual_return": 0.10, "volatility": 0.15},
            "NASDAQ": {"start_price": 13000, "annual_return": 0.13, "volatility": 0.20},
            "SENSEX": {"start_price": 65000, "annual_return": 0.11, "volatility": 0.17}
        }

        np.random.seed(42)  # For reproducible results

        for name, params in benchmark_params.items():
            prices = []
            current_price = params["start_price"]

            # Generate price series with realistic volatility and trends
            daily_return = params["annual_return"] / 252
            daily_volatility = params["volatility"] / np.sqrt(252)

            prev_return = 0.0

            for date in dates:
                # Add autocorrelation and random noise
                autocorrelation = 0.1
                noise = np.random.normal(0, daily_volatility)
                daily_return_val = daily_return + autocorrelation * prev_return + noise

                current_price *= (1 + daily_return_val)
                prev_return = daily_return_val

                prices.append({
                    "date": date.strftime("%Y-%m-%d"),
                    "close": round(current_price, 2)
                })

            benchmark_data[name] = prices

        return benchmark_data

benchmark_service = BenchmarkService()
