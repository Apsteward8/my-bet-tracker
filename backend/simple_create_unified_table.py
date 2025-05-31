# backend/simple_create_unified_table.py
"""
Simple script to create the unified bets table without complex dependencies
"""
import os
import sys
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text

# Add the current directory to Python path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    import config
    database_uri = config.Config.SQLALCHEMY_DATABASE_URI
except ImportError:
    # Fallback if config import fails
    import os
    from dotenv import load_dotenv
    load_dotenv()
    database_uri = os.getenv("DATABASE_URI", "mysql+pymysql://bet_admin:securepassword@localhost/bet_tracking")

# Initialize Flask app
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = database_uri
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize SQLAlchemy
db = SQLAlchemy(app)

def create_unified_table_sql():
    """Create the unified_bets table using raw SQL"""
    
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS unified_bets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        
        -- Source tracking
        source ENUM('oddsjam', 'pikkit') NOT NULL,
        original_bet_id VARCHAR(255),
        
        -- Core bet information
        sportsbook VARCHAR(100),
        bet_type ENUM('straight', 'parlay'),
        status ENUM('pending', 'won', 'lost', 'refunded'),
        
        -- Odds and financial data (American format, 2 decimal places)
        odds INT,
        clv INT,
        stake DECIMAL(10,2),
        bet_profit DECIMAL(10,2),
        
        -- Timing information (all in CST)
        time_placed DATETIME,
        time_settled DATETIME,  -- OddsJam: event_start_date, Pikkit: actual settlement time
        
        -- Descriptive information
        bet_info TEXT,
        tags TEXT,
        sport VARCHAR(100),
        league VARCHAR(100),
        
        -- Metadata
        created_at_db TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at_db TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        -- Indexes for better performance
        INDEX idx_source (source),
        INDEX idx_sportsbook (sportsbook),
        INDEX idx_status (status),
        INDEX idx_time_placed (time_placed),
        INDEX idx_original_bet_id (original_bet_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """
    
    with app.app_context():
        try:
            print("🗑️  Dropping existing unified_bets table if it exists...")
            db.session.execute(text("DROP TABLE IF EXISTS unified_bets"))
            
            print("🔨 Creating unified_bets table...")
            db.session.execute(text(create_table_sql))
            
            db.session.commit()
            print("✅ Successfully created unified_bets table!")
            
            # Verify table creation
            result = db.session.execute(text("DESCRIBE unified_bets"))
            columns = result.fetchall()
            
            print("\n📋 Table structure:")
            print("+-" + "-"*20 + "-+-" + "-"*15 + "-+-" + "-"*6 + "-+-" + "-"*8 + "-+")
            print("| {:20} | {:15} | {:6} | {:8} |".format("Field", "Type", "Null", "Key"))
            print("+-" + "-"*20 + "-+-" + "-"*15 + "-+-" + "-"*6 + "-+-" + "-"*8 + "-+")
            
            for column in columns:
                field_name = column[0][:20]
                field_type = column[1][:15] 
                null_val = column[2][:6]
                key_val = column[3][:8] if column[3] else ""
                print("| {:20} | {:15} | {:6} | {:8} |".format(field_name, field_type, null_val, key_val))
            
            print("+-" + "-"*20 + "-+-" + "-"*15 + "-+-" + "-"*6 + "-+-" + "-"*8 + "-+")
            
            # Count records (should be 0 for new table)
            count_result = db.session.execute(text("SELECT COUNT(*) as count FROM unified_bets"))
            count = count_result.scalar()
            print(f"\n📊 Table contains {count} records")
            
            return True
            
        except Exception as e:
            print(f"❌ Error creating unified table: {str(e)}")
            print(f"Error type: {type(e).__name__}")
            db.session.rollback()
            return False

if __name__ == "__main__":
    print("🚀 Creating unified bets table...")
    print(f"📍 Database URI: {database_uri}")
    
    success = create_unified_table_sql()
    
    if success:
        print("\n🎉 Table creation completed successfully!")
        print("\nNext steps:")
        print("1. Run migration script: python migrate_to_unified.py")
        print("2. Or import fresh data: python import_unified.py")
    else:
        print("\n💥 Table creation failed. Please check the error messages above.")
        print("\nTroubleshooting tips:")
        print("- Verify database connection settings in .env file")
        print("- Ensure MySQL server is running")
        print("- Check that the database 'bet_tracking' exists")
        print("- Verify user permissions for DDL operations")