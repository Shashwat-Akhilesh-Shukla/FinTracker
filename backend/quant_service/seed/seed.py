import os
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import IntegrityError
import pandas as pd

# Install: pip install --upgrade --no-cache-dir git+https://github.com/rongardF/tvdatafeed.git
from tvDatafeed import TvDatafeed, Interval

from models import MarketData, Base
from config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class TvDatafeedMarketSeeder:
    def __init__(self, username: Optional[str] = None, password: Optional[str] = None):
        """
        Initialize with TradingView credentials (optional but recommended)
        Without credentials, some data might be limited
        """
        try:
            if username and password:
                self.tv = TvDatafeed(username, password)
                logger.info("✅ TradingView login successful")
            else:
                self.tv = TvDatafeed()
                logger.warning("⚠️  Using TradingView without login - data may be limited")
        except Exception as e:
            logger.error(f"Failed to initialize TvDatafeed: {e}")
            raise

        # Indian stock symbols (no .NS suffix needed for TradingView)
        self.portfolio_symbols = [
            "RELIANCE", "TCS", "HDFCBANK", "ICICIBANK", "INFY",
            "BHARTIARTL", "HINDUNILVR", "KOTAKBANK", "ITC", "BAJFINANCE",
            "M&M", "MARUTI", "HCLTECH", "AXISBANK", "LT",
            "SBIN", "DRREDDY", "ULTRACEMCO", "POWERGRID", "TITAN",
            "NESTLEIND", "ASIANPAINT", "WIPRO", "BRITANNIA", "TATASTEEL"
        ]

        # Update benchmark symbols to match benchmarks.py requirements
        self.benchmark_symbols = {
            "NIFTY50": ("NIFTY", "NSE"),     # NIFTY 50
            "SENSEX": ("SENSEX", "BSE"),      # BSE SENSEX
        }

        # Update US benchmarks to match required symbols
        self.us_benchmarks = {
            "SP500": ("SPX", "CBOE"),         # S&P 500 (^GSPC)
            "NASDAQ": ("NDX", "NASDAQ"),       # NASDAQ 100 (^IXIC)
        }

        # All symbols to process (portfolio + benchmarks)
        self.all_symbols = (
            self.portfolio_symbols + 
            list(self.benchmark_symbols.keys()) + 
            list(self.us_benchmarks.keys())
        )

        # Configuration
        self.exchange = "NSE"
        self.interval = Interval.in_daily
        self.historical_bars = 1000  # TradingView allows up to 5000 bars
        self.batch_size = 5
        self.request_delay = 3.0  # Delay between requests

        # Statistics
        self.stats = {
            "symbols_processed": 0,
            "symbols_failed": 0,
            "total_records_inserted": 0,
            "start_time": None,
            "errors": []
        }

    def get_db_session(self) -> Session:
        """Create database session"""
        engine = create_engine(
            settings.DATABASE_URL,
            pool_pre_ping=True,
            echo=False
        )
        Base.metadata.create_all(bind=engine)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        return SessionLocal()

    async def check_existing_data(self, db: Session, symbol: str) -> Dict:
        """Check what data already exists for a symbol"""
        try:
            result = db.execute(text("""
                SELECT 
                    COUNT(*) as total_records,
                    MIN(date) as earliest_date,
                    MAX(date) as latest_date
                FROM market_data 
                WHERE symbol = :symbol
            """), {"symbol": symbol}).fetchone()

            if result and result.total_records > 0:
                days_coverage = (result.latest_date - result.earliest_date).days
                return {
                    "records": result.total_records,
                    "earliest": result.earliest_date,
                    "latest": result.latest_date,
                    "coverage_days": days_coverage
                }
            return {"records": 0}
        except Exception as e:
            logger.error(f"Error checking existing data for {symbol}: {e}")
            return {"records": 0}

    async def seed_symbol_data(self, db: Session, symbol: str, exchange: str = "NSE", force_refresh: bool = False) -> bool:
        """Seed historical data for a single symbol using TvDatafeed"""
        try:
            # Check existing data
            existing = await self.check_existing_data(db, symbol)
            
            if not force_refresh and existing["records"] > 0:
                days_old = (datetime.now().date() - existing["latest"].date()).days if existing.get("latest") else 999
                
                if existing["records"] > 500 and days_old < 7:
                    logger.info(f"✓ {symbol}: Skipping (has {existing['records']} records, {days_old} days old)")
                    return True

            logger.info(f"🔄 {symbol}: Fetching {self.historical_bars} bars from TradingView...")

            # Fetch data from TradingView
            df = self.tv.get_hist(
                symbol=symbol,
                exchange=exchange,
                interval=self.interval,
                n_bars=self.historical_bars
            )

            if df is None or df.empty:
                logger.warning(f"❌ {symbol}: No data received from TradingView")
                self.stats["symbols_failed"] += 1
                self.stats["errors"].append(f"{symbol}: No data received")
                return False

            # Store data in database
            records_inserted = 0
            for timestamp, row in df.iterrows():
                try:
                    # Convert pandas timestamp to datetime
                    date_obj = timestamp.to_pydatetime() if hasattr(timestamp, 'to_pydatetime') else timestamp

                    market_data = MarketData(
                        symbol=symbol,
                        date=date_obj,
                        open=float(row['open']),
                        high=float(row['high']),
                        low=float(row['low']),
                        close=float(row['close']),
                        volume=float(row['volume']),
                        adjusted_close=float(row['close'])  # TradingView doesn't provide adjusted close
                    )

                    db.merge(market_data)  # Use merge to handle duplicates
                    records_inserted += 1

                except Exception as e:
                    logger.warning(f"Invalid data for {symbol} at {timestamp}: {e}")
                    continue

            # Commit all records for this symbol
            db.commit()

            logger.info(f"✅ {symbol}: Inserted {records_inserted} records")
            self.stats["total_records_inserted"] += records_inserted
            self.stats["symbols_processed"] += 1

            return True

        except Exception as e:
            logger.error(f"❌ {symbol}: Failed to seed data - {e}")
            db.rollback()
            self.stats["symbols_failed"] += 1
            self.stats["errors"].append(f"{symbol}: {str(e)}")
            return False

    async def seed_batch(self, db: Session, symbols: List[str], exchange: str = "NSE", force_refresh: bool = False):
        """Seed data for a batch of symbols"""
        for symbol in symbols:
            try:
                await self.seed_symbol_data(db, symbol, exchange, force_refresh)
                
                # Rate limiting delay
                if symbol != symbols[-1]:  # Don't delay after last symbol
                    await asyncio.sleep(self.request_delay)
                    
            except Exception as e:
                logger.error(f"Error processing {symbol}: {e}")
                continue

    async def seed_benchmarks(self, db: Session, force_refresh: bool = False):
        """Seed all benchmark data"""
        logger.info("📈 Seeding benchmark indices...")
        
        # Seed Indian benchmarks
        for name, (symbol, exchange) in self.benchmark_symbols.items():
            try:
                logger.info(f"Seeding Indian benchmark: {name} ({symbol} on {exchange})")
                await self.seed_symbol_data(db, symbol, exchange, force_refresh)
                await asyncio.sleep(self.request_delay)
            except Exception as e:
                logger.error(f"Error seeding Indian benchmark {name}: {e}")
                continue

        # Seed US benchmarks
        for name, (symbol, exchange) in self.us_benchmarks.items():
            try:
                logger.info(f"Seeding US benchmark: {name} ({symbol} on {exchange})")
                await self.seed_symbol_data(db, symbol, exchange, force_refresh)
                await asyncio.sleep(self.request_delay)
            except Exception as e:
                logger.error(f"Error seeding US benchmark {name}: {e}")
                continue

    async def run_seeding(self, force_refresh: bool = False, symbols_filter: List[str] = None):
        """Main seeding function"""
        self.stats["start_time"] = datetime.now()

        logger.info("🚀 Starting TradingView market data seeding...")
        db = self.get_db_session()

        try:
            # Always seed benchmarks first
            logger.info("Step 1: Seeding benchmark indices...")
            await self.seed_benchmarks(db, force_refresh)

            # Then seed portfolio symbols if not filtered
            if not symbols_filter or any(s in self.portfolio_symbols for s in symbols_filter):
                logger.info("Step 2: Seeding portfolio symbols...")
                symbols_to_process = (
                    [s for s in symbols_filter if s in self.portfolio_symbols]
                    if symbols_filter
                    else self.portfolio_symbols
                )
                
                for i in range(0, len(symbols_to_process), self.batch_size):
                    batch = symbols_to_process[i:i + self.batch_size]
                    await self.seed_batch(db, batch, "NSE", force_refresh)
                    
                    if i + self.batch_size < len(symbols_to_process):
                        await asyncio.sleep(self.request_delay * 2)

        finally:
            db.close()

        # Print final statistics
        await self.print_final_stats()

    async def print_final_stats(self):
        """Print seeding statistics"""
        duration = datetime.now() - self.stats["start_time"]

        logger.info("=" * 60)
        logger.info("🎯 TRADINGVIEW SEEDING COMPLETE!")
        logger.info("=" * 60)
        logger.info(f"⏱️  Duration: {duration}")
        logger.info(f"✅ Symbols processed: {self.stats['symbols_processed']}")
        logger.info(f"❌ Symbols failed: {self.stats['symbols_failed']}")
        logger.info(f"📊 Total records inserted: {self.stats['total_records_inserted']}")

        if self.stats["errors"]:
            logger.info("🚨 Errors encountered:")
            for error in self.stats["errors"][:10]:  # Show first 10 errors
                logger.info(f"   • {error}")
            if len(self.stats["errors"]) > 10:
                logger.info(f"   ... and {len(self.stats['errors']) - 10} more")

        logger.info("=" * 60)

    async def validate_seeded_data(self):
        """Validate the seeded data"""
        logger.info("🔍 Validating seeded data...")

        db = self.get_db_session()
        try:
            validation_results = {}

            for symbol in self.all_symbols:
                result = db.execute(text("""
                    SELECT 
                        COUNT(*) as total_records,
                        MIN(date) as earliest_date,
                        MAX(date) as latest_date,
                        AVG(close) as avg_price
                    FROM market_data 
                    WHERE symbol = :symbol
                """), {"symbol": symbol}).fetchone()

                if result:
                    validation_results[symbol] = {
                        "records": result.total_records,
                        "date_range": f"{result.earliest_date} to {result.latest_date}" if result.earliest_date else "No data",
                        "avg_price": round(result.avg_price, 2) if result.avg_price else 0
                    }

            # Print validation summary
            logger.info("📋 Validation Results:")
            for symbol, data in validation_results.items():
                symbol_type = "📈 Benchmark" if symbol in self.benchmark_symbols else "💼 Portfolio"
                logger.info(f"{symbol_type} {symbol}: {data['records']} records, Avg: ₹{data['avg_price']}")

        finally:
            db.close()

    def search_symbol(self, search_term: str, exchange: str = "NSE"):
        """Search for symbols on TradingView"""
        try:
            results = self.tv.search_symbol(search_term, exchange)
            logger.info(f"Search results for '{search_term}' on {exchange}:")
            for result in results:
                logger.info(f"  • {result}")
            return results
        except Exception as e:
            logger.error(f"Error searching symbol: {e}")
            return []

# ============================================================================
# USAGE FUNCTIONS
# ============================================================================

async def seed_all_data(username: str = None, password: str = None):
    """Seed all portfolio and benchmark data"""
    seeder = TvDatafeedMarketSeeder(username, password)
    await seeder.run_seeding(force_refresh=False)
    await seeder.validate_seeded_data()

async def seed_specific_symbols(symbols: List[str], username: str = None, password: str = None):
    """Seed data for specific symbols only"""
    seeder = TvDatafeedMarketSeeder(username, password)
    await seeder.run_seeding(force_refresh=False, symbols_filter=symbols)

async def refresh_all_data(username: str = None, password: str = None):
    """Force refresh all data"""
    seeder = TvDatafeedMarketSeeder(username, password)
    await seeder.run_seeding(force_refresh=True)

async def seed_sample_data(username: str = None, password: str = None):
    """Seed sample data for testing"""
    sample_symbols = ["RELIANCE", "TCS", "NIFTY"]
    seeder = TvDatafeedMarketSeeder(username, password)
    await seeder.run_seeding(symbols_filter=sample_symbols, include_us_benchmarks=False)

def search_symbols(search_term: str, exchange: str = "NSE"):
    """Search for symbols"""
    seeder = TvDatafeedMarketSeeder()
    return seeder.search_symbol(search_term, exchange)

# ============================================================================
# CLI INTERFACE
# ============================================================================

if __name__ == "__main__":
    import sys

    async def main():
        if len(sys.argv) < 2:
            print("TradingView Market Data Seeder")
            print("Usage:")
            print("  python seed_market_data.py all                    # Seed all data")
            print("  python seed_market_data.py sample                 # Seed sample data")  
            print("  python seed_market_data.py refresh                # Force refresh all")
            print("  python seed_market_data.py search <term>          # Search symbols")
            print("")
            print("Optional: Set TRADINGVIEW_USERNAME and TRADINGVIEW_PASSWORD env vars")
            return

        command = sys.argv[1].lower()
        
        # Get credentials from environment
        username = os.getenv("TRADINGVIEW_USERNAME")
        password = os.getenv("TRADINGVIEW_PASSWORD")

        if command == "all":
            await seed_all_data(username, password)
        elif command == "sample":
            await seed_sample_data(username, password)
        elif command == "refresh":
            await refresh_all_data(username, password)
        elif command == "search":
            if len(sys.argv) < 3:
                print("Usage: python seed_market_data.py search <symbol>")
                return
            search_term = sys.argv[2]
            search_symbols(search_term)
        else:
            print(f"Unknown command: {command}")

    # Run the seeding
    asyncio.run(main())
