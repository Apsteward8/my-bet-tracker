# backend/consolidate_time_fields.py
"""
Migration script to consolidate event_start_date and time_settled into a single time_settled field
"""
from flask import Flask
from models_unified import db
from sqlalchemy import text
import config

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(config.Config)
db.init_app(app)

def consolidate_time_fields():
    """Consolidate event_start_date and time_settled into a single time_settled field"""
    
    with app.app_context():
        try:
            print("🔄 Starting time field consolidation...")
            
            # Step 1: Check current data distribution
            print("📊 Analyzing current data...")
            
            # Count records with each type of time data
            total_records = db.session.execute(text("SELECT COUNT(*) FROM unified_bets")).scalar()
            
            oddsjam_with_event_start = db.session.execute(text("""
                SELECT COUNT(*) FROM unified_bets 
                WHERE source = 'oddsjam' AND event_start_date IS NOT NULL
            """)).scalar()
            
            oddsjam_with_time_settled = db.session.execute(text("""
                SELECT COUNT(*) FROM unified_bets 
                WHERE source = 'oddsjam' AND time_settled IS NOT NULL
            """)).scalar()
            
            pikkit_with_time_settled = db.session.execute(text("""
                SELECT COUNT(*) FROM unified_bets 
                WHERE source = 'pikkit' AND time_settled IS NOT NULL
            """)).scalar()
            
            print(f"   Total records: {total_records}")
            print(f"   OddsJam with event_start_date: {oddsjam_with_event_start}")
            print(f"   OddsJam with time_settled: {oddsjam_with_time_settled}")
            print(f"   Pikkit with time_settled: {pikkit_with_time_settled}")
            
            # Step 2: Update OddsJam records to use event_start_date as time_settled
            print("\n🔄 Moving OddsJam event_start_date to time_settled...")
            
            update_result = db.session.execute(text("""
                UPDATE unified_bets 
                SET time_settled = event_start_date 
                WHERE source = 'oddsjam' 
                  AND event_start_date IS NOT NULL 
                  AND time_settled IS NULL
            """))
            
            updated_count = update_result.rowcount
            print(f"   Updated {updated_count} OddsJam records")
            
            # Step 3: Handle cases where both fields exist (shouldn't happen, but let's be safe)
            print("\n🔄 Checking for conflicts...")
            
            conflicts = db.session.execute(text("""
                SELECT COUNT(*) FROM unified_bets 
                WHERE source = 'oddsjam' 
                  AND event_start_date IS NOT NULL 
                  AND time_settled IS NOT NULL
                  AND event_start_date != time_settled
            """)).scalar()
            
            if conflicts > 0:
                print(f"   Found {conflicts} records with conflicting dates")
                print("   Keeping time_settled and ignoring event_start_date for these records")
            else:
                print("   No conflicts found")
            
            # Step 4: Verify the consolidation
            print("\n📊 Verifying consolidation...")
            
            after_oddsjam_settled = db.session.execute(text("""
                SELECT COUNT(*) FROM unified_bets 
                WHERE source = 'oddsjam' AND time_settled IS NOT NULL
            """)).scalar()
            
            after_pikkit_settled = db.session.execute(text("""
                SELECT COUNT(*) FROM unified_bets 
                WHERE source = 'pikkit' AND time_settled IS NOT NULL
            """)).scalar()
            
            total_with_time_settled = db.session.execute(text("""
                SELECT COUNT(*) FROM unified_bets 
                WHERE time_settled IS NOT NULL
            """)).scalar()
            
            print(f"   OddsJam records with time_settled: {after_oddsjam_settled}")
            print(f"   Pikkit records with time_settled: {after_pikkit_settled}")
            print(f"   Total records with time_settled: {total_with_time_settled}")
            
            # Commit the changes
            db.session.commit()
            print("\n✅ Time field consolidation completed successfully!")
            
            return True
            
        except Exception as e:
            print(f"❌ Error during time field consolidation: {str(e)}")
            db.session.rollback()
            return False

def drop_event_start_date_column():
    """Drop the event_start_date column since we've moved its data to time_settled"""
    
    with app.app_context():
        try:
            print("\n🗑️  Dropping event_start_date column...")
            
            # Check if column exists first
            column_check = db.session.execute(text("""
                SELECT COUNT(*) 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                  AND TABLE_NAME = 'unified_bets' 
                  AND COLUMN_NAME = 'event_start_date'
            """)).scalar()
            
            if column_check > 0:
                # Drop the column
                db.session.execute(text("ALTER TABLE unified_bets DROP COLUMN event_start_date"))
                db.session.commit()
                print("✅ Successfully dropped event_start_date column")
                return True
            else:
                print("ℹ️  event_start_date column doesn't exist (already dropped?)")
                return True
                
        except Exception as e:
            print(f"❌ Error dropping event_start_date column: {str(e)}")
            db.session.rollback()
            return False

def show_sample_data():
    """Show sample data to verify the consolidation worked"""
    
    with app.app_context():
        try:
            print("\n📋 Sample data after consolidation:")
            
            # Show some OddsJam records
            oddsjam_samples = db.session.execute(text("""
                SELECT id, source, sportsbook, time_placed, time_settled, bet_info
                FROM unified_bets 
                WHERE source = 'oddsjam' AND time_settled IS NOT NULL
                LIMIT 3
            """)).fetchall()
            
            print("\n🌐 OddsJam samples:")
            for row in oddsjam_samples:
                bet_info_short = row[5][:50] + "..." if row[5] and len(row[5]) > 50 else row[5] or "No info"
                print(f"   ID {row[0]}: {row[2]} | Placed: {row[3]} | Settled: {row[4]} | {bet_info_short}")
            
            # Show some Pikkit records
            pikkit_samples = db.session.execute(text("""
                SELECT id, source, sportsbook, time_placed, time_settled, bet_info
                FROM unified_bets 
                WHERE source = 'pikkit' AND time_settled IS NOT NULL
                LIMIT 3
            """)).fetchall()
            
            print("\n🏛️ Pikkit samples:")
            for row in pikkit_samples:
                bet_info_short = row[5][:50] + "..." if row[5] and len(row[5]) > 50 else row[5] or "No info"
                print(f"   ID {row[0]}: {row[2]} | Placed: {row[3]} | Settled: {row[4]} | {bet_info_short}")
                
        except Exception as e:
            print(f"❌ Error showing sample data: {str(e)}")

def run_full_consolidation():
    """Run the complete time field consolidation process"""
    
    print("🚀 Starting time field consolidation process...")
    print("This will:")
    print("1. Move OddsJam event_start_date data to time_settled")
    print("2. Keep Pikkit time_settled as-is")
    print("3. Drop the event_start_date column")
    print("4. Verify the changes")
    
    # Get user confirmation
    response = input("\nDo you want to continue? (y/N): ").strip().lower()
    if response not in ['y', 'yes']:
        print("❌ Operation cancelled by user")
        return
    
    try:
        # Step 1: Consolidate the data
        if not consolidate_time_fields():
            print("❌ Data consolidation failed. Stopping.")
            return
        
        # Step 2: Drop the old column
        if not drop_event_start_date_column():
            print("⚠️  Column drop failed, but data consolidation succeeded.")
            print("You can manually drop the column later with:")
            print("ALTER TABLE unified_bets DROP COLUMN event_start_date;")
        
        # Step 3: Show sample data
        show_sample_data()
        
        print("\n🎉 Time field consolidation completed successfully!")
        print("\nWhat changed:")
        print("✅ OddsJam bets now use time_settled (from event_start_date)")
        print("✅ Pikkit bets still use time_settled (unchanged)")
        print("✅ event_start_date column removed")
        print("✅ All time-based queries can now use a single field")
        
        print("\nNext steps:")
        print("1. Update your data converters to use time_settled")
        print("2. Update any API endpoints that referenced event_start_date")
        print("3. Test your queries to ensure they work with the consolidated field")
        
    except Exception as e:
        print(f"❌ Consolidation process failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run_full_consolidation()