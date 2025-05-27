from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Bet(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime)
    sportsbook = db.Column(db.String(100))
    sport = db.Column(db.String(50))
    league = db.Column(db.String(100))
    event_name = db.Column(db.String(255))
    game_id = db.Column(db.String(100))
    event_start_date = db.Column(db.DateTime)
    market_name = db.Column(db.String(255))
    bet_name = db.Column(db.String(255))
    odds = db.Column(db.Integer)
    clv = db.Column(db.Integer)
    clv_source = db.Column(db.String(100))
    stake = db.Column(db.Numeric(10,2))
    potential_payout = db.Column(db.Numeric(10,2))
    status = db.Column(db.String(50))
    bet_type = db.Column(db.String(50))
    bet_profit = db.Column(db.Numeric(10,2))
    notes = db.Column(db.Text)
    is_live_bet = db.Column(db.Boolean)
    is_free_bet = db.Column(db.Boolean)
    is_odds_boost = db.Column(db.Boolean)
    percentage = db.Column(db.Numeric(5,2))
    market_width = db.Column(db.Integer)
    saved_filter_name = db.Column(db.String(255))
    parlay_id = db.Column(db.String(100))
    tags = db.Column(db.Text)
    confirmed_settlement = db.Column(db.Boolean, default=None)
    created_at_db = db.Column(db.DateTime, default=db.func.current_timestamp())

class PikkitBet(db.Model):
    __tablename__ = 'pikkit_bet'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    bet_id = db.Column(db.String(255), unique=True, nullable=False)  # Pikkit's UUID
    sportsbook = db.Column(db.String(100), nullable=False)
    bet_type = db.Column(db.String(50))  # Maps to 'type' in Pikkit (straight, parlay, etc.)
    status = db.Column(db.String(50))  # SETTLED_WIN, SETTLED_LOSS, PENDING, etc.
    odds = db.Column(db.Numeric(10,2))  # Decimal odds from Pikkit
    closing_line = db.Column(db.Numeric(10,2))  # Closing line in decimal format
    ev = db.Column(db.Numeric(10,4))  # Expected value if provided
    stake = db.Column(db.Numeric(10,2))  # Maps to 'amount' in Pikkit
    bet_profit = db.Column(db.Numeric(10,2))  # Maps to 'profit' in Pikkit
    time_placed = db.Column(db.DateTime)  # When bet was placed
    time_settled = db.Column(db.DateTime, nullable=True)  # When bet was settled (if applicable)
    bet_info = db.Column(db.Text)  # Full bet description from Pikkit
    tags = db.Column(db.Text)  # Tags from Pikkit
    sport = db.Column(db.String(50))  # Maps to 'sports' in Pikkit
    league = db.Column(db.String(100))  # Maps to 'leagues' in Pikkit
    
    # Additional fields for compatibility with existing system
    event_name = db.Column(db.Text)  # Parsed from bet_info - changed to TEXT for long parlays
    bet_name = db.Column(db.Text)  # Parsed from bet_info - changed to TEXT for long descriptions
    market_name = db.Column(db.String(255))  # Parsed from bet_info
    
    # Tracking fields
    confirmed_settlement = db.Column(db.Boolean, default=None)
    created_at_db = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at_db = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    
    # Convert decimal odds to American odds for compatibility
    @property
    def american_odds(self):
        if self.odds is None:
            return None
        decimal_odds = float(self.odds)
        if decimal_odds >= 2.0:
            return int((decimal_odds - 1) * 100)
        else:
            return int(-100 / (decimal_odds - 1))
    
    # Convert closing line to American odds
    @property
    def american_closing_line(self):
        if self.closing_line is None:
            return None
        decimal_odds = float(self.closing_line)
        if decimal_odds >= 2.0:
            return int((decimal_odds - 1) * 100)
        else:
            return int(-100 / (decimal_odds - 1))
    
    # Calculate CLV in American odds format for compatibility
    @property
    def clv_american(self):
        if self.american_closing_line is None or self.american_odds is None:
            return None
        return self.american_closing_line - self.american_odds