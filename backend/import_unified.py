# backend/import_unified.py
import os
import pandas as pd
from flask import Flask
from models_unified import UnifiedBet, db
from data_converters import (
    convert_oddsjam_to_unified, 
    convert_pikkit_to_unified, 
    should_use_pikkit_data,
    PIKKIT_SPORTSBOOKS,
    ODDSJAM_SPORTSBOOKS
)
import config

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(config.Config)
db.init_app(app)

def import_oddsjam_to_unified(csv_path):
    """Import OddsJam CSV data to unified table"""
    print(f"Loading OddsJam CSV from: {csv_path}")
    df = pd.read_csv(csv_path)
    print(f"Loaded {len(df)} rows from OddsJam CSV")
    
    # Convert NaN values properly
    df = df.where(pd.notna(df), None)
    
    # Fill numeric columns with 0
    numeric_columns = ["odds", "clv", "stake", "bet_profit"]
    for col in numeric_columns:
        if col in df.columns:
            df[col] = df[col].fillna(0)
    
    # Fill text columns with empty string
    text_columns = ["sportsbook", "sport", "league", "event_name", "bet_name", "market_name", "tags", "bet_type", "status"]
    for col in text_columns:
        if col in df.columns:
            df[col] = df[col].fillna("")
    
    new_count = 0
    updated_count = 0
    skipped_count = 0  # For Pikkit-tracked sportsbooks
    
    with app.app_context():
        for _, row in df.iterrows():
            sportsbook = row.get('sportsbook', '')
            
            # Skip if this sportsbook should be handled by Pikkit
            if should_use_pikkit_data(sportsbook):
                skipped_count += 1
                if skipped_count % 50 == 0:
                    print(f"Skipped {skipped_count} OddsJam bets from Pikkit-tracked sportsbooks...")
                continue
            
            # Convert row to dictionary for processing
            row_dict = {
                'id': row.name,  # Use DataFrame index as ID
                'sportsbook': sportsbook,
                'sport': row.get('sport', ''),
                'league': row.get('league', ''),
                'event_name': row.get('event_name', ''),
                'bet_name': row.get('bet_name', ''),
                'market_name': row.get('market_name', ''),
                'odds': row.get('odds', 0),
                'clv': row.get('clv', 0),
                'stake': row.get('stake', 0),
                'bet_profit': row.get('bet_profit', 0),
                'status': row.get('status', ''),
                'bet_type': row.get('bet_type', ''),
                'created_at': row.get('created_at', ''),
                'event_start_date': row.get('event_start_date', ''),
                'tags': row.get('tags', '')
            }
            
            # Convert to unified format
            unified_data = convert_oddsjam_to_unified(row_dict)
            
            try:
                # Check if bet already exists (based on multiple identifiers)
                existing_bet = UnifiedBet.query.filter_by(
                    source='oddsjam',
                    sportsbook=unified_data['sportsbook'],
                    bet_info=unified_data['bet_info'],
                    stake=unified_data['stake'],
                    time_placed=unified_data['time_placed']
                ).first()
                
                if not existing_bet:
                    # Create new unified bet
                    new_bet = UnifiedBet(**unified_data)
                    db.session.add(new_bet)
                    new_count += 1
                    
                    if new_count % 100 == 0:
                        print(f"Added {new_count} new OddsJam bets...")
                        db.session.commit()
                
                else:
                    # Update existing bet if needed
                    updated = False
                    update_fields = ['status', 'bet_profit', 'time_settled']
                    
                    for field in update_fields:
                        if field in unified_data and getattr(existing_bet, field) != unified_data[field]:
                            setattr(existing_bet, field, unified_data[field])
                            updated = True
                    
                    if updated:
                        updated_count += 1
                        
            except Exception as e:
                print(f"Error processing OddsJam bet: {str(e)}")
                db.session.rollback()
                continue
        
        # Final commit
        try:
            db.session.commit()
            print(f"✅ OddsJam import completed! Added {new_count} new bets, updated {updated_count} existing bets, skipped {skipped_count} Pikkit-tracked bets.")
        except Exception as e:
            print(f"❌ Error committing OddsJam transaction: {str(e)}")
            db.session.rollback()
            raise

def import_pikkit_to_unified(csv_path):
    """Import Pikkit CSV data to unified table"""
    print(f"Loading Pikkit CSV from: {csv_path}")
    df = pd.read_csv(csv_path)
    print(f"Loaded {len(df)} rows from Pikkit CSV")
    
    # Convert NaN values properly
    df = df.where(pd.notna(df), None)
    
    # Fill numeric columns with 0
    numeric_columns = ["odds", "closing_line", "ev", "amount", "profit"]
    for col in numeric_columns:
        if col in df.columns:
            df[col] = df[col].fillna(0)
    
    # Fill text columns with empty string
    text_columns = ["bet_id", "sportsbook", "type", "status", "bet_info", "tags", "sports", "leagues"]
    for col in text_columns:
        if col in df.columns:
            df[col] = df[col].fillna("")
    
    new_count = 0
    updated_count = 0
    
    with app.app_context():
        for _, row in df.iterrows():
            bet_id = row.get('bet_id', '')
            if not bet_id:
                print(f"Warning: Missing bet_id for Pikkit row")
                continue
            
            # Convert row to dictionary for processing
            row_dict = {
                'bet_id': bet_id,
                'sportsbook': row.get('sportsbook', ''),
                'type': row.get('type', ''),
                'status': row.get('status', ''),
                'odds': row.get('odds', 0),
                'closing_line': row.get('closing_line', 0),
                'ev': row.get('ev', 0),
                'amount': row.get('amount', 0),
                'profit': row.get('profit', 0),
                'time_placed': row.get('time_placed', ''),
                'time_settled': row.get('time_settled', ''),
                'bet_info': row.get('bet_info', ''),
                'tags': row.get('tags', ''),
                'sports': row.get('sports', ''),
                'leagues': row.get('leagues', '')
            }
            
            # Convert to unified format
            unified_data = convert_pikkit_to_unified(row_dict)
            
            try:
                # Check if bet already exists (use bet_id as unique identifier)
                existing_bet = UnifiedBet.query.filter_by(
                    source='pikkit',
                    original_bet_id=bet_id
                ).first()
                
                if not existing_bet:
                    # Create new unified bet
                    new_bet = UnifiedBet(**unified_data)
                    db.session.add(new_bet)
                    new_count += 1
                    
                    if new_count % 100 == 0:
                        print(f"Added {new_count} new Pikkit bets...")
                        db.session.commit()
                
                else:
                    # Update existing bet if needed
                    updated = False
                    update_fields = ['status', 'bet_profit', 'time_settled', 'clv']
                    
                    for field in update_fields:
                        if field in unified_data and getattr(existing_bet, field) != unified_data[field]:
                            setattr(existing_bet, field, unified_data[field])
                            updated = True
                    
                    if updated:
                        updated_count += 1
                        
            except Exception as e:
                print(f"Error processing Pikkit bet {bet_id}: {str(e)}")
                db.session.rollback()
                continue
        
        # Final commit
        try:
            db.session.commit()
            print(f"✅ Pikkit import completed! Added {new_count} new bets, updated {updated_count} existing bets.")
        except Exception as e:
            print(f"❌ Error committing Pikkit transaction: {str(e)}")
            db.session.rollback()
            raise

def import_both_sources():
    """Import from both OddsJam and Pikkit sources"""
    
    # Define default CSV paths
    oddsjam_csv_path = os.path.join(os.path.dirname(__file__), "../../../oddsjam-bet-tracker.csv")
    pikkit_csv_path = os.path.join(os.path.dirname(__file__), "../../../transactions.csv")
    
    # Try fallback locations
    oddsjam_fallbacks = [
        os.path.join(os.path.dirname(__file__), "oddsjam-bet-tracker.csv"),
        os.path.expanduser("~/Downloads/oddsjam-bet-tracker.csv"),
        os.path.expanduser("~/betting/oddsjam-bet-tracker.csv")
    ]
    
    pikkit_fallbacks = [
        os.path.join(os.path.dirname(__file__), "transactions.csv"),
        os.path.expanduser("~/Downloads/transactions.csv"),
        os.path.expanduser("~/betting/transactions.csv")
    ]
    
    # Find OddsJam CSV
    oddsjam_found = None
    if os.path.exists(oddsjam_csv_path):
        oddsjam_found = oddsjam_csv_path
    else:
        for path in oddsjam_fallbacks:
            if os.path.exists(path):
                oddsjam_found = path
                break
    
    # Find Pikkit CSV
    pikkit_found = None
    if os.path.exists(pikkit_csv_path):
        pikkit_found = pikkit_csv_path
    else:
        for path in pikkit_fallbacks:
            if os.path.exists(path):
                pikkit_found = path
                break
    
    # Import from available sources
    if oddsjam_found:
        print(f"Found OddsJam CSV at: {oddsjam_found}")
        import_oddsjam_to_unified(oddsjam_found)
    else:
        print("❌ OddsJam CSV file not found")
    
    if pikkit_found:
        print(f"Found Pikkit CSV at: {pikkit_found}")
        import_pikkit_to_unified(pikkit_found)
    else:
        print("❌ Pikkit CSV file not found")
    
    if not oddsjam_found and not pikkit_found:
        print("❌ No CSV files found. Please check file locations.")

# Run the script manually
if __name__ == "__main__":
    import_both_sources()