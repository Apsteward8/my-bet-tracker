# backend/migrate_to_unified_fixed.py
from flask import Flask
from models_unified import UnifiedBet, db  # Only use the unified db instance
from data_converters import convert_oddsjam_to_unified, convert_pikkit_to_unified, should_use_pikkit_data
from sqlalchemy import text
import config

# Initialize Flask app with unified model only
app = Flask(__name__)
app.config.from_object(config.Config)
db.init_app(app)

def migrate_oddsjam_bets():
    """Migrate existing OddsJam bets to unified table using raw SQL queries"""
    print("🔄 Migrating OddsJam bets...")
    
    with app.app_context():
        try:
            # Query old bet table directly using raw SQL
            oddsjam_query = text("""
                SELECT id, sportsbook, sport, league, event_name, bet_name, market_name,
                       odds, clv, stake, bet_profit, status, bet_type, created_at, 
                       event_start_date, tags
                FROM bet
                ORDER BY id
            """)
            
            result = db.session.execute(oddsjam_query)
            oddsjam_bets = result.fetchall()
            
            print(f"Found {len(oddsjam_bets)} OddsJam bets to migrate")
            
            migrated_count = 0
            skipped_count = 0
            
            for bet_row in oddsjam_bets:
                # Convert row to dictionary
                bet = {
                    'id': bet_row[0],
                    'sportsbook': bet_row[1],
                    'sport': bet_row[2],
                    'league': bet_row[3],
                    'event_name': bet_row[4],
                    'bet_name': bet_row[5],
                    'market_name': bet_row[6],
                    'odds': bet_row[7],
                    'clv': bet_row[8],
                    'stake': float(bet_row[9]) if bet_row[9] else 0,
                    'bet_profit': float(bet_row[10]) if bet_row[10] else 0,
                    'status': bet_row[11],
                    'bet_type': bet_row[12],
                    'created_at': bet_row[13].strftime('%m/%d/%Y, %H:%M EDT') if bet_row[13] else None,
                    'event_start_date': bet_row[14].strftime('%m/%d/%Y, %H:%M EDT') if bet_row[14] else None,
                    'tags': bet_row[15]
                }
                
                # Skip if this sportsbook should be handled by Pikkit
                if should_use_pikkit_data(bet['sportsbook']):
                    skipped_count += 1
                    continue
                
                try:
                    # Convert to unified format
                    unified_data = convert_oddsjam_to_unified(bet)
                    
                    # Check if already migrated
                    existing = UnifiedBet.query.filter_by(
                        source='oddsjam',
                        original_bet_id=str(bet['id'])
                    ).first()
                    
                    if not existing:
                        new_unified_bet = UnifiedBet(**unified_data)
                        db.session.add(new_unified_bet)
                        migrated_count += 1
                        
                        if migrated_count % 100 == 0:
                            print(f"Migrated {migrated_count} OddsJam bets...")
                            db.session.commit()
                    
                except Exception as e:
                    print(f"Error migrating OddsJam bet {bet['id']}: {str(e)}")
                    db.session.rollback()
                    continue
            
            # Final commit
            db.session.commit()
            print(f"✅ OddsJam migration completed! Migrated {migrated_count} bets, skipped {skipped_count} Pikkit-tracked bets.")
            
        except Exception as e:
            print(f"❌ Error during OddsJam migration: {str(e)}")
            print("This might be because the 'bet' table doesn't exist yet.")
            print("If you haven't imported any OddsJam data, this is normal.")

def migrate_pikkit_bets():
    """Migrate existing Pikkit bets to unified table using raw SQL queries"""
    print("🔄 Migrating Pikkit bets...")
    
    with app.app_context():
        try:
            # Query old pikkit_bet table directly using raw SQL
            pikkit_query = text("""
                SELECT id, bet_id, sportsbook, bet_type, status, odds, closing_line,
                       ev, stake, bet_profit, time_placed, time_settled, bet_info,
                       tags, sport, league
                FROM pikkit_bet
                ORDER BY id
            """)
            
            result = db.session.execute(pikkit_query)
            pikkit_bets = result.fetchall()
            
            print(f"Found {len(pikkit_bets)} Pikkit bets to migrate")
            
            migrated_count = 0
            
            for bet_row in pikkit_bets:
                # Convert row to dictionary
                bet = {
                    'bet_id': bet_row[1],
                    'sportsbook': bet_row[2],
                    'type': bet_row[3],
                    'status': bet_row[4],
                    'odds': float(bet_row[5]) if bet_row[5] else 0,
                    'closing_line': float(bet_row[6]) if bet_row[6] else 0,
                    'ev': float(bet_row[7]) if bet_row[7] else 0,
                    'amount': float(bet_row[8]) if bet_row[8] else 0,
                    'profit': float(bet_row[9]) if bet_row[9] else 0,
                    'time_placed': bet_row[10].strftime('%m/%d/%Y %H:%M:%S GMT') if bet_row[10] else None,
                    'time_settled': bet_row[11].strftime('%m/%d/%Y %H:%M:%S GMT') if bet_row[11] else None,
                    'bet_info': bet_row[12],
                    'tags': bet_row[13],
                    'sports': bet_row[14],
                    'leagues': bet_row[15]
                }
                
                try:
                    # Convert to unified format
                    unified_data = convert_pikkit_to_unified(bet)
                    
                    # Check if already migrated
                    existing = UnifiedBet.query.filter_by(
                        source='pikkit',
                        original_bet_id=bet['bet_id']
                    ).first()
                    
                    if not existing:
                        new_unified_bet = UnifiedBet(**unified_data)
                        db.session.add(new_unified_bet)
                        migrated_count += 1
                        
                        if migrated_count % 100 == 0:
                            print(f"Migrated {migrated_count} Pikkit bets...")
                            db.session.commit()
                    
                except Exception as e:
                    print(f"Error migrating Pikkit bet {bet['bet_id']}: {str(e)}")
                    db.session.rollback()
                    continue
            
            # Final commit
            db.session.commit()
            print(f"✅ Pikkit migration completed! Migrated {migrated_count} bets.")
            
        except Exception as e:
            print(f"❌ Error during Pikkit migration: {str(e)}")
            print("This might be because the 'pikkit_bet' table doesn't exist yet.")
            print("If you haven't imported any Pikkit data, this is normal.")

def verify_migration():
    """Verify the migration was successful"""
    print("🔍 Verifying migration...")
    
    with app.app_context():
        try:
            # Count records in unified table
            total_unified = UnifiedBet.query.count()
            oddsjam_unified = UnifiedBet.query.filter_by(source='oddsjam').count()
            pikkit_unified = UnifiedBet.query.filter_by(source='pikkit').count()
            
            # Try to count original records
            try:
                original_oddsjam_result = db.session.execute(text("SELECT COUNT(*) FROM bet"))
                original_oddsjam = original_oddsjam_result.scalar()
            except:
                original_oddsjam = 0
                
            try:
                original_pikkit_result = db.session.execute(text("SELECT COUNT(*) FROM pikkit_bet"))
                original_pikkit = original_pikkit_result.scalar()
            except:
                original_pikkit = 0
            
            print(f"📊 Migration Summary:")
            print(f"   Total unified bets: {total_unified}")
            print(f"   OddsJam bets migrated: {oddsjam_unified}")
            print(f"   Pikkit bets migrated: {pikkit_unified}")
            print(f"   Original OddsJam bets: {original_oddsjam}")
            print(f"   Original Pikkit bets: {original_pikkit}")
            
            # Sample some records
            sample_oddsjam = UnifiedBet.query.filter_by(source='oddsjam').limit(3).all()
            sample_pikkit = UnifiedBet.query.filter_by(source='pikkit').limit(3).all()
            
            if sample_oddsjam:
                print(f"\n📋 Sample OddsJam records:")
                for bet in sample_oddsjam:
                    print(f"   {bet.id}: {bet.sportsbook} - {bet.bet_info[:50] if bet.bet_info else 'No info'}...")
            
            if sample_pikkit:
                print(f"\n📋 Sample Pikkit records:")
                for bet in sample_pikkit:
                    print(f"   {bet.id}: {bet.sportsbook} - {bet.bet_info[:50] if bet.bet_info else 'No info'}...")
                    
            # Check for any potential issues
            if total_unified == 0:
                print("\n⚠️  Warning: No bets were migrated. This could mean:")
                print("   - The original tables (bet, pikkit_bet) don't exist yet")
                print("   - The tables are empty")
                print("   - There was an error during migration")
            elif total_unified < (original_oddsjam + original_pikkit):
                print(f"\n⚠️  Note: Migrated {total_unified} bets but found {original_oddsjam + original_pikkit} original bets.")
                print("   This might be due to sportsbook prioritization (Pikkit books excluded from OddsJam).")
            else:
                print(f"\n✅ Migration looks successful!")
                
        except Exception as e:
            print(f"❌ Error during verification: {str(e)}")

def run_full_migration():
    """Run the complete migration process"""
    print("🚀 Starting full migration to unified table...")
    
    try:
        # Verify unified table exists
        with app.app_context():
            try:
                # Test if unified table exists
                test_query = db.session.execute(text("SELECT COUNT(*) FROM unified_bets"))
                test_query.scalar()
                print("✅ Unified table exists and is accessible")
            except Exception as e:
                print(f"❌ Unified table not found or not accessible: {str(e)}")
                print("Please run 'python create_unified_table.py' first")
                return
        
        # Migrate data from both sources
        migrate_oddsjam_bets()
        migrate_pikkit_bets()
        
        # Verify migration
        verify_migration()
        
        print("\n🎉 Migration completed!")
        print("\nNext steps:")
        print("1. Test the unified API endpoints")
        print("2. Update your frontend to use /api/unified/ endpoints")
        print("3. Import new data using the unified import system")
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run_full_migration()