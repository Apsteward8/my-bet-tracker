# backend/create_pikkit_table.py
from flask import Flask
from models import db, PikkitBet
import config

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(config.Config)
db.init_app(app)

def create_pikkit_table():
    """Create the Pikkit bet table"""
    with app.app_context():
        try:
            # Create the table
            db.create_all()
            print("✅ Successfully created Pikkit bet table!")
            
            # Verify the table was created
            pikkit_count = PikkitBet.query.count()
            print(f"📊 Pikkit bet table created with {pikkit_count} records")
            
        except Exception as e:
            print(f"❌ Error creating Pikkit table: {str(e)}")

if __name__ == "__main__":
    create_pikkit_table()