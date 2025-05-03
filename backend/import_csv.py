import pandas as pd
from sqlalchemy import create_engine, text
from models import db, Bet
from flask import Flask
from datetime import datetime
import pytz
import re
from config import Config

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)
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
    if "created_at" in df.columns:
        df = clean_datetime_column(df, "created_at")
    if "event_start_date" in df.columns:
        df = clean_datetime_column(df, "event_start_date")

    # If MySQL does not support timezone-aware timestamps, convert to naive datetime before inserting:
    if "created_at" in df.columns:
        df["created_at"] = df["created_at"].dt.tz_localize(None)
    if "event_start_date" in df.columns:
        df["event_start_date"] = df["event_start_date"].dt.tz_localize(None)

    # Convert NaN values properly
    df = df.where(pd.notna(df), None)  # Convert NaN to None for MySQL
    numeric_columns = ["market_width", "stake", "potential_payout", "bet_profit", "odds", "clv", "percentage"]
    text_columns = ["notes", "saved_filter_name", "parlay_id", "tags"]
    
    # Fill numeric columns with 0
    for col in numeric_columns:
        if col in df.columns:
            df[col] = df[col].fillna(0)
    
    # Fill text columns with empty string
    for col in text_columns:
        if col in df.columns:
            df[col] = df[col].fillna("")

    with app.app_context():
        for _, row in df.iterrows():
            # Check if the bet already exists - use a more robust approach with try/except
            try:
                # Create a filter dictionary with only the columns that exist
                filter_dict = {}
                for field in ["created_at", "event_name", "bet_name", "sportsbook"]:
                    if field in row and not pd.isna(row[field]):
                        filter_dict[field] = row[field]
                
                if not filter_dict:
                    print(f"Warning: Cannot identify bet with row: {row}")
                    continue
                    
                existing_bet = Bet.query.filter_by(**filter_dict).first()
            except Exception as e:
                print(f"Error filtering bet: {str(e)}")
                print(f"Row data: {row}")
                continue

            if not existing_bet:
                try:
                    # Prepare data for new bet, only using columns that exist in the DataFrame
                    bet_data = {}
                    for column in Bet.__table__.columns.keys():
                        if column in row and not pd.isna(row[column]):
                            # Handle boolean conversions
                            if column in ["is_live_bet", "is_free_bet", "is_odds_boost"]:
                                bet_data[column] = bool(row[column])
                            else:
                                bet_data[column] = row[column]
                    
                    # Create new bet using only available fields
                    new_bet = Bet(**bet_data)
                    db.session.add(new_bet)
                    print(f"➕ Adding {row.get('bet_name', 'Unknown bet')} (Game: {row.get('event_name', 'Unknown event')})")
                except Exception as e:
                    print(f"Error adding new bet: {str(e)}")
                    print(f"Row data: {row}")
                    continue

            else:
                try:
                    # Check for changes in key fields (e.g., settlement status)
                    fields_to_check = [
                        "status", "bet_profit", "potential_payout", "clv"
                    ]
                    
                    updated = False
                    for field in fields_to_check:
                        if field in row and not pd.isna(row[field]) and getattr(existing_bet, field) != row[field]:
                            setattr(existing_bet, field, row[field])
                            updated = True

                    if updated:
                        print(f"🔄 Updating {row.get('bet_name', 'Unknown bet')} (Game: {row.get('event_name', 'Unknown event')})")
                except Exception as e:
                    print(f"Error updating bet: {str(e)}")
                    print(f"Row data: {row}")
                    continue

        db.session.commit()
        print("✅ CSV import completed successfully!")

# Run the script manually
if __name__ == "__main__":
    csv_file = "../../oddsjam-bet-tracker.csv"  # Update with your file path
    import_bets_from_csv(csv_file)