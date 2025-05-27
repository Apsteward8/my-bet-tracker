# backend/import_pikkit_csv.py
import os
import pandas as pd
from sqlalchemy import create_engine
from flask import Flask
from datetime import datetime
import pytz
import re

# Import local modules
from models import PikkitBet, db
import config

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(config.Config)
db.init_app(app)

def parse_bet_info(bet_info, bet_type="straight"):
    """
    Parse the bet_info field to extract event_name, bet_name, and market_name.
    Handle both straight bets and parlays differently.
    """
    if not bet_info or pd.isna(bet_info):
        return {'bet_name': '', 'event_name': '', 'market_name': ''}
    
    bet_info = bet_info.strip()
    
    # Handle parlays differently
    if bet_type.lower() == 'parlay':
        # For parlays, split by | and take first leg for event parsing
        legs = [leg.strip() for leg in bet_info.split('|')]
        
        if len(legs) > 1:
            # Multi-leg parlay
            event_name = f"Parlay ({len(legs)} legs)"
            bet_name = bet_info[:500] + "..." if len(bet_info) > 500 else bet_info
            market_name = "Parlay"
        else:
            # Single item, treat as regular bet
            return parse_single_bet(bet_info)
    else:
        # Regular straight bet
        return parse_single_bet(bet_info)
    
    return {
        'bet_name': bet_name,
        'event_name': event_name,
        'market_name': market_name
    }

def parse_single_bet(bet_info):
    """Parse a single bet (not a parlay)"""
    # Common patterns for team matchups
    team_patterns = [
        r'(.+)\s+at\s+(.+)$',
        r'(.+)\s+vs\.?\s+(.+)$',
        r'(.+)\s+@\s+(.+)$',
    ]
    
    event_name = ''
    bet_name = bet_info
    market_name = ''
    
    # Try to find team matchup pattern at the end
    for pattern in team_patterns:
        matches = re.search(pattern, bet_info, re.IGNORECASE)
        if matches:
            # Everything before the teams is the bet description
            bet_description = bet_info[:matches.start()].strip()
            # The teams form the event name
            event_name = f"{matches.group(1).strip()} at {matches.group(2).strip()}"
            bet_name = bet_description
            break
    
    # If no team pattern found, use the whole thing as bet_name
    if not event_name:
        event_name = "Unknown Event"
        bet_name = bet_info
    
    # Try to extract market type from bet description
    market_patterns = [
        (r'total\s+points?', 'Total Points'),
        (r'total\s+assists?', 'Total Assists'),
        (r'total\s+rebounds?', 'Total Rebounds'),
        (r'total\s+goals?', 'Total Goals'),
        (r'total\s+yards?', 'Total Yards'),
        (r'total\s+touchdowns?', 'Total Touchdowns'),
        (r'spread', 'Spread'),
        (r'moneyline', 'Moneyline'),
        (r'over/under', 'Total'),
        (r'player\s+props?', 'Player Props'),
        (r'three\s+pointers?', 'Three Pointers'),
        (r'rebounds?', 'Rebounds'),
        (r'assists?', 'Assists'),
        (r'points?', 'Points'),
    ]
    
    for pattern, market in market_patterns:
        if re.search(pattern, bet_name, re.IGNORECASE):
            market_name = market
            break
    
    return {
        'bet_name': bet_name,
        'event_name': event_name,
        'market_name': market_name
    }

def convert_pikkit_status(pikkit_status):
    """Convert Pikkit status to our standard status format."""
    if not pikkit_status:
        return 'pending'
    
    status_map = {
        'SETTLED_WIN': 'won',
        'SETTLED_LOSS': 'lost',
        'PENDING': 'pending',
        'CANCELLED': 'void',
        'VOIDED': 'void',
        'PUSHED': 'push',
        'REFUNDED': 'void',
    }
    
    return status_map.get(pikkit_status.upper(), pikkit_status.lower())

def import_pikkit_bets_from_csv(csv_path):
    """Import Pikkit bets from CSV into MySQL, updating only changed bets."""
    print(f"Loading Pikkit CSV from: {csv_path}")
    df = pd.read_csv(csv_path)
    print(f"Loaded {len(df)} rows from Pikkit CSV")

    # Define the UTC timezone (Pikkit exports in GMT/UTC)
    utc = pytz.timezone("UTC")
    cst = pytz.timezone("America/Chicago")

    # Function to clean and convert datetime columns
    def clean_datetime_column(df, column_name):
        if column_name not in df.columns:
            print(f"Warning: Column {column_name} not found in CSV")
            return df
            
        # Pikkit format: "03/11/2025 15:52:19 GMT"
        df[column_name] = df[column_name].astype(str).str.replace(r' GMT$', '', regex=True)
        df[column_name] = pd.to_datetime(df[column_name], format='%m/%d/%Y %H:%M:%S', errors="coerce")
        
        # Assign UTC timezone and convert to CST
        df[column_name] = df[column_name].dt.tz_localize(utc, ambiguous="NaT", nonexistent="NaT")
        df[column_name] = df[column_name].dt.tz_convert(cst)
        df[column_name] = df[column_name].dt.tz_localize(None)  # Remove timezone for MySQL
        
        return df

    # Apply to datetime columns
    df = clean_datetime_column(df, "time_placed")
    df = clean_datetime_column(df, "time_settled")

    # Convert NaN and NaT values properly
    df = df.where(pd.notna(df), None)
    
    # Specifically handle NaT values in datetime columns for MySQL
    for col in ["time_placed", "time_settled"]:
        if col in df.columns:
            # Replace NaT with None for MySQL compatibility
            df[col] = df[col].where(pd.notna(df[col]), None)
    
    # Fill numeric columns with 0
    numeric_columns = ["odds", "closing_line", "ev", "amount", "profit"]
    for col in numeric_columns:
        if col in df.columns:
            df[col] = df[col].fillna(0)
    
    # Fill text columns with empty string
    text_columns = ["tags", "bet_info"]
    for col in text_columns:
        if col in df.columns:
            df[col] = df[col].fillna("")

    updated_count = 0
    new_count = 0

    with app.app_context():
        for _, row in df.iterrows():
            # Use bet_id as the primary identifier since it's unique in Pikkit
            bet_id = row.get('bet_id')
            if not bet_id or pd.isna(bet_id):
                print(f"Warning: Missing bet_id for row")
                continue
                
            try:
                existing_bet = PikkitBet.query.filter_by(bet_id=bet_id).first()
            except Exception as e:
                print(f"Error querying Pikkit bet {bet_id}: {str(e)}")
                continue

            # Parse bet information with bet type context
            parsed_info = parse_bet_info(row.get('bet_info', ''), row.get('type', 'straight'))
            
            # Convert status
            status = convert_pikkit_status(row.get('status'))

            if not existing_bet:
                try:
                    # Create new Pikkit bet
                    bet_data = {
                        'bet_id': bet_id,
                        'sportsbook': row.get('sportsbook', ''),
                        'bet_type': row.get('type', ''),
                        'status': status,
                        'odds': float(row.get('odds', 0)) if row.get('odds') else None,
                        'closing_line': float(row.get('closing_line', 0)) if row.get('closing_line') else None,
                        'ev': float(row.get('ev', 0)) if row.get('ev') else None,
                        'stake': float(row.get('amount', 0)) if row.get('amount') else 0,
                        'bet_profit': float(row.get('profit', 0)) if row.get('profit') else 0,
                        'time_placed': row.get('time_placed') if pd.notna(row.get('time_placed')) else None,
                        'time_settled': row.get('time_settled') if pd.notna(row.get('time_settled')) else None,
                        'bet_info': row.get('bet_info', ''),
                        'tags': row.get('tags', ''),
                        'sport': row.get('sports', ''),
                        'league': row.get('leagues', ''),
                        # Parsed fields
                        'event_name': parsed_info['event_name'],
                        'bet_name': parsed_info['bet_name'],
                        'market_name': parsed_info['market_name']
                    }
                    
                    new_bet = PikkitBet(**bet_data)
                    db.session.add(new_bet)
                    new_count += 1
                    
                    if new_count % 10 == 0:
                        print(f"Added {new_count} new Pikkit bets so far...")
                        
                except Exception as e:
                    print(f"Error adding new Pikkit bet {bet_id}: {str(e)}")
                    # Rollback the session to clean state
                    db.session.rollback()
                    continue

            else:
                try:
                    # Check for changes in key fields
                    updated = False
                    
                    # Fields that might change
                    update_fields = {
                        'status': status,
                        'odds': float(row.get('odds', 0)) if row.get('odds') else None,
                        'closing_line': float(row.get('closing_line', 0)) if row.get('closing_line') else None,
                        'ev': float(row.get('ev', 0)) if row.get('ev') else None,
                        'stake': float(row.get('amount', 0)) if row.get('amount') else 0,
                        'bet_profit': float(row.get('profit', 0)) if row.get('profit') else 0,
                        'time_settled': row.get('time_settled') if pd.notna(row.get('time_settled')) else None,
                        'bet_info': row.get('bet_info', ''),
                        'tags': row.get('tags', ''),
                        'event_name': parsed_info['event_name'],
                        'bet_name': parsed_info['bet_name'],
                        'market_name': parsed_info['market_name']
                    }
                    
                    for field, new_value in update_fields.items():
                        current_value = getattr(existing_bet, field)
                        if current_value != new_value:
                            setattr(existing_bet, field, new_value)
                            updated = True
                            
                    if updated:
                        updated_count += 1
                        
                except Exception as e:
                    print(f"Error updating Pikkit bet {bet_id}: {str(e)}")
                    # Rollback the session to clean state
                    db.session.rollback()
                    continue

        try:
            db.session.commit()
            print(f"✅ Pikkit CSV import completed successfully! Added {new_count} new bets, updated {updated_count} existing bets.")
        except Exception as e:
            print(f"❌ Error committing transaction: {str(e)}")
            db.session.rollback()
            raise

# Run the script manually
if __name__ == "__main__":
    # Define default CSV path for Pikkit exports
    default_csv_path = os.path.join(os.path.dirname(__file__), "../../../transactions.csv")
    
    # Try a few fallback locations
    fallback_paths = [
        os.path.join(os.path.dirname(__file__), "transactions.csv"),
        os.path.expanduser("~/Downloads/transactions.csv"),
        os.path.expanduser("~/betting/transactions.csv")
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
        print(f"Found Pikkit CSV file at: {csv_path}")
        import_pikkit_bets_from_csv(csv_path)
    else:
        print("Error: Pikkit CSV file not found. Please specify the file path manually.")
        print(f"Tried: {default_csv_path}")
        for path in fallback_paths:
            print(f"       {path}")