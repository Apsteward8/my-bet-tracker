# backend/import_csv.py
import os
import pandas as pd
from sqlalchemy import create_engine
from flask import Flask
from datetime import datetime
import pytz
import re

# Import local modules - adjust imports to match your project structure
from models import Bet, db
import config

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(config.Config)
db.init_app(app)

# Database connection string
engine = create_engine(app.config["SQLALCHEMY_DATABASE_URI"])

def import_bets_from_csv(csv_path):
    """Import bets from CSV into MySQL, updating only changed bets and keeping manual fields."""
    print(f"Loading CSV from: {csv_path}")
    df = pd.read_csv(csv_path)
    print(f"Loaded {len(df)} rows from CSV")

    # Define the CST timezone
    cst = pytz.timezone("America/Chicago")

    # Function to clean and convert datetime columns
    def clean_datetime_column(df, column_name):
        if column_name not in df.columns:
            print(f"Warning: Column {column_name} not found in CSV")
            return df
            
        df[column_name] = df[column_name].astype(str).str.replace(r' [A-Z]{3,4}$', '', regex=True)  # Remove timezone abbreviation
        df[column_name] = pd.to_datetime(df[column_name], errors="coerce")  # Convert to datetime
        df[column_name] = df[column_name].dt.tz_localize("America/New_York", ambiguous="NaT", nonexistent="NaT")  # Assign original timezone (Eastern)
        df[column_name] = df[column_name].dt.tz_convert(cst)  # Convert to Central Time (CST/CDT)
        return df

    # Apply to the relevant columns
    df = clean_datetime_column(df, "created_at")
    df = clean_datetime_column(df, "event_start_date")

    # If MySQL does not support timezone-aware timestamps, convert to naive datetime before inserting:
    if "created_at" in df.columns:
        df["created_at"] = df["created_at"].dt.tz_localize(None)
    if "event_start_date" in df.columns:
        df["event_start_date"] = df["event_start_date"].dt.tz_localize(None)

    # Convert NaN values properly
    df = df.where(pd.notna(df), None)  # Convert NaN to None for MySQL
    
    # Fill numeric columns with 0
    numeric_columns = ["market_width", "stake", "potential_payout", "bet_profit", "odds", "clv", "percentage"]
    for col in numeric_columns:
        if col in df.columns:
            df[col] = df[col].fillna(0)
    
    # Fill text columns with empty string
    text_columns = ["notes", "saved_filter_name", "parlay_id", "tags"]
    for col in text_columns:
        if col in df.columns:
            df[col] = df[col].fillna("")

    updated_count = 0
    new_count = 0

    with app.app_context():
        for _, row in df.iterrows():
            # Create filter dict with only available columns
            filter_dict = {}
            for field in ["created_at", "event_name", "bet_name", "sportsbook"]:
                if field in row and pd.notna(row[field]):
                    filter_dict[field] = row[field]
            
            if len(filter_dict) < 3:  # Need at least 3 identifiers
                print(f"Warning: Insufficient identifiers for row: {row}")
                continue
                
            try:
                existing_bet = Bet.query.filter_by(**filter_dict).first()
            except Exception as e:
                print(f"Error querying bet: {str(e)}")
                continue

            if not existing_bet:
                try:
                    # Prepare data for new bet, only using columns that exist in the DataFrame
                    bet_data = {}
                    for column in Bet.__table__.columns.keys():
                        if column in row and pd.notna(row[column]):
                            # Handle boolean conversions
                            if column in ["is_live_bet", "is_free_bet", "is_odds_boost"]:
                                bet_data[column] = bool(row[column])
                            else:
                                bet_data[column] = row[column]
                    
                    # Create new bet using only available fields
                    new_bet = Bet(**bet_data)
                    db.session.add(new_bet)
                    new_count += 1
                    
                    if new_count % 10 == 0:
                        print(f"Added {new_count} new bets so far...")
                        
                except Exception as e:
                    print(f"Error adding new bet: {str(e)}")
                    continue

            else:
                try:
                    # Check for changes in key fields (e.g., settlement status)
                    fields_to_check = [
                        "status", "bet_profit", "potential_payout", "clv"
                    ]
                    
                    updated = False
                    for field in fields_to_check:
                        if field in row and pd.notna(row[field]) and getattr(existing_bet, field) != row[field]:
                            setattr(existing_bet, field, row[field])
                            updated = True
                            
                    if updated:
                        updated_count += 1
                except Exception as e:
                    print(f"Error updating bet: {str(e)}")
                    continue

        db.session.commit()
        print(f"✅ CSV import completed successfully! Added {new_count} new bets, updated {updated_count} existing bets.")

# Run the script manually
if __name__ == "__main__":
    # Define default CSV path
    default_csv_path = os.path.join(os.path.dirname(__file__), "../../../oddsjam-bet-tracker.csv")
    
    # Try a few fallback locations if the default doesn't exist
    fallback_paths = [
        os.path.join(os.path.dirname(__file__), "oddsjam-bet-tracker.csv"),
        os.path.expanduser("~/Downloads/oddsjam-bet-tracker.csv"),
        os.path.expanduser("~/betting/oddsjam-bet-tracker.csv")
    ]
    
    csv_path = None
    
    # Try default path first
    if os.path.exists(default_csv_path):
        csv_path = default_csv_path
    else:
        # Try fallbacks
        for path in fallback_paths:
            if os.path.exists(path):
                csv_path = path
                break
    
    if csv_path:
        print(f"Found CSV file at: {csv_path}")
        import_bets_from_csv(csv_path)
    else:
        print("Error: CSV file not found. Please specify the file path manually.")
        print(f"Tried: {default_csv_path}")
        for path in fallback_paths:
            print(f"       {path}")