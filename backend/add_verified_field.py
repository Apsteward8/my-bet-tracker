# backend/add_verified_field.py
"""
Add verified field to unified_bets table and set appropriate default values
"""
from flask import Flask
from models_unified import db
from sqlalchemy import text
import config

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(config.Config)
db.init_app(app)

def add_verified_field():
    """Add verified field to unified_bets table"""
    
    with app.app_context():
        try:
            print("🔄 Adding verified field to unified_bets table...")
            
            # Step 1: Check if field already exists
            field_check = db.session.execute(text("""
                SELECT COUNT(*) 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                  AND TABLE_NAME = 'unified_bets' 
                  AND COLUMN_NAME = 'verified'
            """)).scalar()
            
            if field_check > 0:
                print("ℹ️  Verified field already exists")
            else:
                # Add the verified field
                print("➕ Adding verified field...")
                db.session.execute(text("""
                    ALTER TABLE unified_bets 
                    ADD COLUMN verified BOOLEAN DEFAULT FALSE
                """))
                print("✅ Verified field added successfully")
            
            # Step 2: Set default values based on source
            print("\n🔄 Setting default verified values...")
            
            # Automatically verify all Pikkit bets (they're from verified tracker)
            pikkit_updated = db.session.execute(text("""
                UPDATE unified_bets 
                SET verified = TRUE 
                WHERE source = 'pikkit'
            """)).rowcount
            
            print(f"   ✅ Auto-verified {pikkit_updated} Pikkit bets")
            
            # Set OddsJam bets as unverified (require manual verification)
            oddsjam_updated = db.session.execute(text("""
                UPDATE unified_bets 
                SET verified = FALSE 
                WHERE source = 'oddsjam'
            """)).rowcount
            
            print(f"   📋 Marked {oddsjam_updated} OddsJam bets as requiring verification")
            
            # Step 3: Add index for better performance on verification queries
            print("\n📊 Adding index for verification queries...")
            try:
                db.session.execute(text("""
                    CREATE INDEX idx_verified_status 
                    ON unified_bets (verified, status, source)
                """))
                print("✅ Added verification index")
            except Exception as e:
                if "Duplicate key name" in str(e):
                    print("ℹ️  Verification index already exists")
                else:
                    print(f"⚠️  Could not add index: {e}")
            
            # Commit all changes
            db.session.commit()
            print("\n✅ Verified field implementation completed!")
            
            return True
            
        except Exception as e:
            print(f"❌ Error adding verified field: {str(e)}")
            db.session.rollback()
            return False

def show_verification_stats():
    """Show verification statistics"""
    
    with app.app_context():
        try:
            print("\n📊 Verification Statistics:")
            
            # Overall stats
            total_bets = db.session.execute(text("SELECT COUNT(*) FROM unified_bets")).scalar()
            verified_bets = db.session.execute(text("SELECT COUNT(*) FROM unified_bets WHERE verified = TRUE")).scalar()
            unverified_bets = db.session.execute(text("SELECT COUNT(*) FROM unified_bets WHERE verified = FALSE")).scalar()
            
            print(f"   Total bets: {total_bets}")
            print(f"   Verified bets: {verified_bets}")
            print(f"   Unverified bets: {unverified_bets}")
            
            # By source
            source_stats = db.session.execute(text("""
                SELECT 
                    source,
                    COUNT(*) as total,
                    SUM(CASE WHEN verified = TRUE THEN 1 ELSE 0 END) as verified,
                    SUM(CASE WHEN verified = FALSE THEN 1 ELSE 0 END) as unverified
                FROM unified_bets 
                GROUP BY source
            """)).fetchall()
            
            print(f"\n📋 By Source:")
            for row in source_stats:
                source, total, verified, unverified = row
                print(f"   {source.upper()}: {total} total | {verified} verified | {unverified} unverified")
            
            # Settled bets needing verification (for confirmation page)
            unverified_settled = db.session.execute(text("""
                SELECT COUNT(*) 
                FROM unified_bets 
                WHERE verified = FALSE 
                  AND status IN ('won', 'lost', 'refunded')
                  AND source = 'oddsjam'
            """)).scalar()
            
            print(f"\n🔍 Bets needing verification: {unverified_settled}")
            print("   (Settled OddsJam bets that haven't been manually verified)")
            
        except Exception as e:
            print(f"❌ Error showing verification stats: {str(e)}")

def show_sample_unverified():
    """Show sample unverified bets that would appear on confirmation page"""
    
    with app.app_context():
        try:
            print("\n📋 Sample bets needing verification:")
            
            samples = db.session.execute(text("""
                SELECT id, sportsbook, status, bet_profit, time_settled, bet_info
                FROM unified_bets 
                WHERE verified = FALSE 
                  AND status IN ('won', 'lost', 'refunded')
                  AND source = 'oddsjam'
                ORDER BY time_settled DESC
                LIMIT 5
            """)).fetchall()
            
            if samples:
                print("   ID  | Sportsbook | Status | Profit | Settled | Bet Info")
                print("   " + "-" * 70)
                for row in samples:
                    bet_id, sportsbook, status, profit, settled, bet_info = row
                    profit_str = f"${profit:.2f}" if profit else "$0.00"
                    settled_str = settled.strftime("%m/%d") if settled else "N/A"
                    bet_info_short = bet_info[:30] + "..." if bet_info and len(bet_info) > 30 else bet_info or "No info"
                    print(f"   {bet_id:3} | {sportsbook:10} | {status:6} | {profit_str:6} | {settled_str:7} | {bet_info_short}")
            else:
                print("   🎉 No unverified bets found! All settlements have been confirmed.")
                
        except Exception as e:
            print(f"❌ Error showing sample unverified bets: {str(e)}")

def run_verification_setup():
    """Run the complete verification field setup"""
    
    print("🚀 Setting up bet verification system...")
    print("\nThis will:")
    print("1. Add 'verified' field to unified_bets table")
    print("2. Auto-verify all Pikkit bets (verified tracker)")
    print("3. Mark OddsJam bets as requiring manual verification") 
    print("4. Add database indexes for performance")
    print("5. Show verification statistics")
    
    try:
        # Add the verified field and set defaults
        if not add_verified_field():
            print("❌ Failed to add verified field. Stopping.")
            return
        
        # Show stats
        show_verification_stats()
        
        # Show sample data
        show_sample_unverified()
        
        print("\n🎉 Verification system setup completed!")
        print("\nWhat's ready:")
        print("✅ Pikkit bets are auto-verified (no manual confirmation needed)")
        print("✅ OddsJam bets require manual verification")
        print("✅ Database optimized for verification queries")
        print("✅ Ready for confirmation page implementation")
        
        print("\nNext steps:")
        print("1. Update your unified model to include verified field")
        print("2. Update API endpoints to handle verification")
        print("3. Update frontend confirmation page to use new endpoints")
        
    except Exception as e:
        print(f"❌ Verification setup failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run_verification_setup()