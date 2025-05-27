# backend/fix_pikkit_columns.py
from flask import Flask
from sqlalchemy import text
from models import db
import config

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(config.Config)
db.init_app(app)

def fix_pikkit_table_columns():
    """Fix the Pikkit table columns to handle longer text and NULL datetime values"""
    with app.app_context():
        try:
            # Alter the table to change column types
            sql_commands = [
                "ALTER TABLE pikkit_bet MODIFY COLUMN event_name TEXT;",
                "ALTER TABLE pikkit_bet MODIFY COLUMN bet_name TEXT;",
                "ALTER TABLE pikkit_bet MODIFY COLUMN bet_info TEXT;",
                "ALTER TABLE pikkit_bet MODIFY COLUMN time_settled DATETIME NULL;"
            ]
            
            for sql in sql_commands:
                print(f"Executing: {sql}")
                db.session.execute(text(sql))
            
            db.session.commit()
            print("✅ Successfully updated Pikkit table columns to handle longer text and NULL datetime values!")
            
        except Exception as e:
            print(f"❌ Error updating Pikkit table columns: {str(e)}")
            db.session.rollback()

if __name__ == "__main__":
    fix_pikkit_table_columns()