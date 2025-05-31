# backend/create_unified_table.py
from flask import Flask
from models_unified import db, UnifiedBet
from sqlalchemy import text
import config

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(config.Config)
db.init_app(app)

def create_unified_table():
    """Create the unified bet table"""
    with app.app_context():
        try:
            # Drop table if it exists (for fresh start)
            print("Dropping existing unified_bets table if it exists...")
            db.session.execute(text("DROP TABLE IF EXISTS unified_bets"))
            db.session.commit()
            
            # Create the table
            print("Creating unified_bets table...")
            db.create_all()
            
            print("✅ Successfully created unified bet table!")
            
            # Verify the table was created
            try:
                result = db.session.execute(text("SHOW CREATE TABLE unified_bets"))
                table_definition = result.fetchone()[1]
                print("\n📋 Table structure:")
                print(table_definition)
            except Exception as show_error:
                print(f"Note: Could not display table structure: {show_error}")
                # Alternative verification - just count to see if table exists
                count_result = db.session.execute(text("SELECT COUNT(*) FROM unified_bets"))
                count = count_result.scalar()
                print(f"✅ Table verified - contains {count} records")
            
        except Exception as e:
            print(f"❌ Error creating unified table: {str(e)}")
            db.session.rollback()

if __name__ == "__main__":
    create_unified_table()