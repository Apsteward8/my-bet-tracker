import pandas as pd
from sqlalchemy import create_engine, text
from database import db
from models import Bet
from flask import Flask
from datetime import datetime
import pytz
import re
import config

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(config.Config)
db.init_app(app)

# Database connection string
engine = create_engine(app.config["SQLALCHEMY_DATABASE_URI"])

def import_bets_from_csv(csv_path):
    """Import bets from CSV into MySQL, updating only changed bets and keeping manual fields."""
    df = pd.read_csv(csv_path)

    # Define the CST timezone
    cst = pytz.timezone("America/Chicago")

    # Function to clean and convert datetime columns
    def clean_datetime_column(df, column_name):
        df[column_name] = df[column_name].astype(str).str.replace(r' [A-Z]{3,4}$', '', regex=True)  # Remove timezone abbreviation
        df[column_name] = pd.to_datetime(df[column_name], errors="coerce")  # Convert to datetime
        df[column_name] = df[column_name].dt.tz_localize("America/New_York", ambiguous="NaT", nonexistent="NaT")  # Assign original timezone (Eastern)
        df[column_name] = df[column_name].dt.tz_convert(cst)  # Convert to Central Time (CST/CDT)
        return df

    # Apply to the relevant columns
    df = clean_datetime_column(df, "created_at")
    df = clean_datetime_column(df, "event_start_date")

    # If MySQL does not support timezone-aware timestamps, convert to naive datetime before inserting:
    df["created_at"] = df["created_at"].dt.tz_localize(None)
    df["event_start_date"] = df["event_start_date"].dt.tz_localize(None)

    # Convert NaN values properly
    df = df.where(pd.notna(df), None)  # Convert NaN to None for MySQL
    df.fillna({
        "market_width": 0, 
        "stake": 0, 
        "potential_payout": 0, 
        "bet_profit": 0, 
        "odds": 0,
        "clv": 0,
        "percentage": 0.0
    }, inplace=True)

    df.fillna({
        "notes": "", 
        "saved_filter_name": "", 
        "parlay_id": "", 
        "tags": ""
    }, inplace=True)

    with app.app_context():
        for _, row in df.iterrows():
            # Check if the bet already exists
            existing_bet = Bet.query.filter_by(
                created_at=row["created_at"],
                event_name=row["event_name"], 
                bet_name=row["bet_name"], 
                sportsbook=row["sportsbook"]
            ).first()

            if not existing_bet:
                # Insert new bet
                new_bet = Bet(
                    created_at=row["created_at"],
                    sportsbook=row["sportsbook"],
                    sport=row["sport"],
                    league=row["league"],
                    event_name=row["event_name"],
                    game_id=row["game_id"],
                    event_start_date=row["event_start_date"],
                    market_name=row["market_name"],
                    bet_name=row["bet_name"],
                    odds=row["odds"],
                    clv=row["clv"],
                    clv_source=row["clv_source"],
                    stake=row["stake"],
                    potential_payout=row["potential_payout"],
                    status=row["status"],
                    bet_type=row["bet_type"],
                    bet_profit=row["bet_profit"],
                    notes=row["notes"],
                    is_live_bet=bool(row["is_live_bet"]),
                    is_free_bet=bool(row["is_free_bet"]),
                    is_odds_boost=bool(row["is_odds_boost"]),
                    percentage=row["percentage"],
                    market_width=row["market_width"],
                    saved_filter_name=row["saved_filter_name"],
                    parlay_id=row["parlay_id"],
                    tags=row["tags"]
                )
                db.session.add(new_bet)

            else:
                # Check for changes in key fields (e.g., settlement status)
                fields_to_check = [
                    "status", "bet_profit", "potential_payout", "clv"
                ]
                
                updated = False
                for field in fields_to_check:
                    if getattr(existing_bet, field) != row[field]:
                        setattr(existing_bet, field, row[field])
                        updated = True

                if updated:
                    print(f"🔄 Updating {row['bet_name']} (Game: {row['event_name']})")
                    db.session.commit()

        db.session.commit()
        print("✅ CSV import completed successfully!")

# Run the script manually
if __name__ == "__main__":
    csv_file = "../oddsjam-bet-tracker.csv"  # Update with your file path
    import_bets_from_csv(csv_file)