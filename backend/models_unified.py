# backend/models_unified.py
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import enum

db = SQLAlchemy()

class SourceEnum(enum.Enum):
    oddsjam = "oddsjam"
    pikkit = "pikkit"

class BetTypeEnum(enum.Enum):
    straight = "straight"
    parlay = "parlay"

class StatusEnum(enum.Enum):
    pending = "pending"
    won = "won"
    lost = "lost"
    refunded = "refunded"

class UnifiedBet(db.Model):
    __tablename__ = 'unified_bets'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Source tracking
    source = db.Column(db.Enum(SourceEnum), nullable=False)
    original_bet_id = db.Column(db.String(255))  # Pikkit bet_id or OddsJam id
    
    # Core bet information
    sportsbook = db.Column(db.String(100))
    bet_type = db.Column(db.Enum(BetTypeEnum))
    status = db.Column(db.Enum(StatusEnum))
    
    # Odds and financial data (all in American format and 2 decimal places)
    odds = db.Column(db.Integer)  # American odds
    clv = db.Column(db.Integer)   # American odds for closing line
    stake = db.Column(db.Numeric(10,2))
    bet_profit = db.Column(db.Numeric(10,2))
    
    # Timing information (all in CST)
    time_placed = db.Column(db.DateTime)     # When bet was placed
    time_settled = db.Column(db.DateTime)    # When bet was settled (OddsJam: event_start_date, Pikkit: time_settled)
    
    # Descriptive information
    bet_info = db.Column(db.Text)           # Combined description of the bet
    tags = db.Column(db.Text)
    sport = db.Column(db.String(100))
    league = db.Column(db.String(100))
    
    # Verification tracking
    verified = db.Column(db.Boolean, default=False)  # Manual verification of settlement accuracy
    
    # Metadata
    created_at_db = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at_db = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    
    def __repr__(self):
        return f'<UnifiedBet {self.id}: {self.source.value if self.source else "unknown"} - {self.sportsbook} - {self.bet_info[:50] if self.bet_info else ""}>'