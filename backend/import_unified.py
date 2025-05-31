# backend/import_unified.py - IMPROVED VERSION
#
# KEY FEATURES:
# 1. Uses immutable fields as unique identifiers:
#    - OddsJam: time_placed + bet_info (these should never change)
#    - Pikkit: original bet_id (Pikkit's unique identifier)
# 2. Updates ALL fields when a match is found (except immutable identifiers)
#    - This allows correction of initially incorrect data like wrong odds, stakes, sportsbooks
# 3. Proper MySQL datetime comparison using TIMESTAMPDIFF()
#
import os
import pandas as pd
from flask import Flask
from models import db  # Use same db instance as main app
from data_converters import (
    convert_oddsjam_to_unified, 
    convert_pikkit_to_unified, 
    should_use_pikkit_data,
    PIKKIT_SPORTSBOOKS,
    ODDSJAM_SPORTSBOOKS
)
from sqlalchemy import text
import config

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(config.Config)
db.init_app(app)

def check_unified_table_exists():
    """Check if unified_bets table exists"""
    with app.app_context():
        try:
            result = db.session.execute(text("""
                SELECT COUNT(*) 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_SCHEMA = DATABASE() 
                  AND TABLE_NAME = 'unified_bets'
            """))
            return result.scalar() > 0
        except Exception:
            return False

def ensure_verified_field():
    """Ensure verified field exists in unified table"""
    with app.app_context():
        try:
            # Check if verified field exists
            result = db.session.execute(text("""
                SELECT COUNT(*) 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                  AND TABLE_NAME = 'unified_bets' 
                  AND COLUMN_NAME = 'verified'
            """))
            
            if result.scalar() == 0:
                print("➕ Adding verified field to unified_bets table...")
                db.session.execute(text("""
                    ALTER TABLE unified_bets 
                    ADD COLUMN verified BOOLEAN DEFAULT FALSE
                """))
                
                # Set defaults
                db.session.execute(text("""
                    UPDATE unified_bets 
                    SET verified = CASE 
                        WHEN source = 'pikkit' THEN TRUE 
                        WHEN source = 'oddsjam' THEN FALSE 
                        ELSE FALSE 
                    END
                """))
                
                db.session.commit()
                print("✅ Verified field added successfully")
            
            return True
        except Exception as e:
            print(f"⚠️  Could not ensure verified field: {e}")
            return False

def import_oddsjam_to_unified(csv_path):
    """Import OddsJam CSV data to unified table"""
    print(f"📥 Loading OddsJam CSV from: {csv_path}")
    
    try:
        df = pd.read_csv(csv_path)
        print(f"📊 Loaded {len(df)} rows from OddsJam CSV")
    except Exception as e:
        print(f"❌ Error reading OddsJam CSV: {e}")
        return {"success": False, "error": str(e), "new_count": 0, "updated_count": 0}
    
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
    skipped_count = 0
    error_count = 0
    
    with app.app_context():
        for index, row in df.iterrows():
            try:
                sportsbook = row.get('sportsbook', '')
                
                # Skip if this sportsbook should be handled by Pikkit
                if should_use_pikkit_data(sportsbook):
                    skipped_count += 1
                    continue
                
                # Convert row to dictionary for processing
                row_dict = {
                    'id': index,
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
                
                # IMPROVED: Use only time_placed and bet_info as unique identifiers
                identifier_query = text("""
                    SELECT id FROM unified_bets 
                    WHERE source = 'oddsjam'
                      AND bet_info = :bet_info
                      AND (
                          (time_placed IS NULL AND :time_placed IS NULL)
                          OR 
                          (time_placed IS NOT NULL AND :time_placed IS NOT NULL 
                           AND ABS(TIMESTAMPDIFF(MINUTE, time_placed, :time_placed)) <= 1)
                      )
                    LIMIT 1
                """)
                
                existing_result = db.session.execute(identifier_query, {
                    'bet_info': unified_data['bet_info'],
                    'time_placed': unified_data['time_placed']
                })
                
                existing_bet = existing_result.fetchone()
                
                if not existing_bet:
                    # Insert new bet using raw SQL
                    insert_query = text("""
                        INSERT INTO unified_bets 
                        (source, original_bet_id, sportsbook, bet_type, status, odds, clv, 
                         stake, bet_profit, time_placed, time_settled, bet_info, tags, 
                         sport, league, verified)
                        VALUES 
                        (:source, :original_bet_id, :sportsbook, :bet_type, :status, :odds, :clv,
                         :stake, :bet_profit, :time_placed, :time_settled, :bet_info, :tags,
                         :sport, :league, FALSE)
                    """)
                    
                    db.session.execute(insert_query, unified_data)
                    new_count += 1
                    
                    if new_count % 100 == 0:
                        print(f"   📥 Added {new_count} new OddsJam bets...")
                        db.session.commit()
                
                else:
                    # Update ALL fields except the immutable identifiers (time_placed, bet_info, source)
                    # This allows correction of initially wrong data like odds, stakes, sportsbook names, etc.
                    update_query = text("""
                        UPDATE unified_bets 
                        SET original_bet_id = :original_bet_id,
                            sportsbook = :sportsbook,
                            bet_type = :bet_type,
                            status = :status,
                            odds = :odds,
                            clv = :clv,
                            stake = :stake,
                            bet_profit = :bet_profit,
                            time_settled = :time_settled,
                            tags = :tags,
                            sport = :sport,
                            league = :league,
                            updated_at_db = CURRENT_TIMESTAMP
                        WHERE id = :bet_id
                    """)
                    
                    # Create update parameters (excluding immutable fields)
                    update_params = {key: value for key, value in unified_data.items() 
                                   if key not in ['time_placed', 'bet_info', 'source']}
                    update_params['bet_id'] = existing_bet[0]
                    
                    result = db.session.execute(update_query, update_params)
                    
                    if result.rowcount > 0:
                        updated_count += 1
                        if updated_count <= 5:  # Show first 5 updates for debugging
                            print(f"   🔄 Updated Pikkit bet: {unified_data['bet_info'][:50]}...")
                        if updated_count <= 5:  # Show first 5 updates for debugging
                            print(f"   🔄 Updated OddsJam bet: {unified_data['bet_info'][:50]}...")
                        
            except Exception as e:
                error_count += 1
                if error_count <= 5:  # Only show first 5 errors
                    print(f"⚠️  Error processing OddsJam row {index}: {str(e)}")
                continue
        
        # Final commit
        try:
            db.session.commit()
            result_msg = f"✅ OddsJam import completed! Added {new_count} new bets, updated {updated_count} existing bets"
            if skipped_count > 0:
                result_msg += f", skipped {skipped_count} Pikkit-tracked bets"
            if error_count > 0:
                result_msg += f", encountered {error_count} errors"
            print(result_msg)
            
            return {
                "success": True,
                "new_count": new_count,
                "updated_count": updated_count,
                "skipped_count": skipped_count,
                "error_count": error_count
            }
        except Exception as e:
            print(f"❌ Error committing OddsJam transaction: {str(e)}")
            db.session.rollback()
            return {"success": False, "error": str(e), "new_count": 0, "updated_count": 0}

def import_pikkit_to_unified(csv_path):
    """Import Pikkit CSV data to unified table"""
    print(f"📥 Loading Pikkit CSV from: {csv_path}")
    
    try:
        df = pd.read_csv(csv_path)
        print(f"📊 Loaded {len(df)} rows from Pikkit CSV")
    except Exception as e:
        print(f"❌ Error reading Pikkit CSV: {e}")
        return {"success": False, "error": str(e), "new_count": 0, "updated_count": 0}
    
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
    error_count = 0
    
    with app.app_context():
        for index, row in df.iterrows():
            try:
                bet_id = row.get('bet_id', '')
                if not bet_id:
                    error_count += 1
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
                
                # Check if bet already exists (use bet_id as unique identifier)
                existing_result = db.session.execute(text("""
                    SELECT id FROM unified_bets 
                    WHERE source = 'pikkit' AND original_bet_id = :bet_id
                    LIMIT 1
                """), {'bet_id': bet_id})
                
                existing_bet = existing_result.fetchone()
                
                if not existing_bet:
                    # Insert new bet
                    insert_query = text("""
                        INSERT INTO unified_bets 
                        (source, original_bet_id, sportsbook, bet_type, status, odds, clv, 
                         stake, bet_profit, time_placed, time_settled, bet_info, tags, 
                         sport, league, verified)
                        VALUES 
                        (:source, :original_bet_id, :sportsbook, :bet_type, :status, :odds, :clv,
                         :stake, :bet_profit, :time_placed, :time_settled, :bet_info, :tags,
                         :sport, :league, TRUE)
                    """)
                    
                    db.session.execute(insert_query, unified_data)
                    new_count += 1
                    
                    if new_count % 100 == 0:
                        print(f"   📥 Added {new_count} new Pikkit bets...")
                        db.session.commit()
                
                else:
                    # Update ALL fields except the immutable identifier (original_bet_id, source)
                    # This allows correction of any data that may have changed in Pikkit
                    update_query = text("""
                        UPDATE unified_bets 
                        SET sportsbook = :sportsbook,
                            bet_type = :bet_type,
                            status = :status,
                            odds = :odds,
                            clv = :clv,
                            stake = :stake,
                            bet_profit = :bet_profit,
                            time_placed = :time_placed,
                            time_settled = :time_settled,
                            bet_info = :bet_info,
                            tags = :tags,
                            sport = :sport,
                            league = :league,
                            updated_at_db = CURRENT_TIMESTAMP
                        WHERE id = :bet_id
                    """)
                    
                    # Create update parameters (excluding immutable fields)
                    update_params = {key: value for key, value in unified_data.items() 
                                   if key not in ['original_bet_id', 'source']}
                    update_params['bet_id'] = existing_bet[0]
                    
                    result = db.session.execute(update_query, update_params)
                    
                    if result.rowcount > 0:
                        updated_count += 1
                        
            except Exception as e:
                error_count += 1
                if error_count <= 5:  # Only show first 5 errors
                    print(f"⚠️  Error processing Pikkit row {index}: {str(e)}")
                continue
        
        # Final commit
        try:
            db.session.commit()
            result_msg = f"✅ Pikkit import completed! Added {new_count} new bets, updated {updated_count} existing bets"
            if error_count > 0:
                result_msg += f", encountered {error_count} errors"
            print(result_msg)
            
            return {
                "success": True,
                "new_count": new_count,
                "updated_count": updated_count,
                "error_count": error_count
            }
        except Exception as e:
            print(f"❌ Error committing Pikkit transaction: {str(e)}")
            db.session.rollback()
            return {"success": False, "error": str(e), "new_count": 0, "updated_count": 0}

def import_both_sources():
    """Import from both OddsJam and Pikkit sources to unified table"""
    
    print("🚀 Starting unified import from both sources...")
    
    # Check if unified table exists
    if not check_unified_table_exists():
        print("❌ Unified table not found! Please create it first with:")
        print("   python simple_create_unified_table.py")
        return False
    
    # Ensure verified field exists
    ensure_verified_field()
    
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
    
    # Track results
    results = []
    overall_success = True
    
    # Import from available sources
    if oddsjam_found:
        print(f"\n📍 Found OddsJam CSV at: {oddsjam_found}")
        oddsjam_result = import_oddsjam_to_unified(oddsjam_found)
        results.append(("OddsJam", oddsjam_result))
        if not oddsjam_result["success"]:
            overall_success = False
    else:
        print("⚠️  OddsJam CSV file not found")
        results.append(("OddsJam", {"success": False, "error": "CSV file not found"}))
        overall_success = False
    
    if pikkit_found:
        print(f"\n📍 Found Pikkit CSV at: {pikkit_found}")
        pikkit_result = import_pikkit_to_unified(pikkit_found)
        results.append(("Pikkit", pikkit_result))
        if not pikkit_result["success"]:
            overall_success = False
    else:
        print("⚠️  Pikkit CSV file not found")
        results.append(("Pikkit", {"success": False, "error": "CSV file not found"}))
        overall_success = False
    
    # Summary
    print(f"\n🎯 Import Summary:")
    total_new = 0
    total_updated = 0
    
    for source, result in results:
        if result["success"]:
            new_count = result.get("new_count", 0)
            updated_count = result.get("updated_count", 0)
            total_new += new_count
            total_updated += updated_count
            print(f"   ✅ {source}: {new_count} new, {updated_count} updated")
        else:
            print(f"   ❌ {source}: Failed - {result.get('error', 'Unknown error')}")
    
    print(f"\n📊 Overall: {total_new} new bets, {total_updated} updated bets")
    
    if overall_success:
        print("🎉 Unified import completed successfully!")
    else:
        print("⚠️  Import completed with some errors")
    
    return overall_success

# Run the script manually
if __name__ == "__main__":
    success = import_both_sources()
    exit(0 if success else 1)