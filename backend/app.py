from flask import Flask
from flask_cors import CORS
from config import Config
from models import db
from routes.bets import bp as bets_bp

app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)
CORS(app, resources={r"/api/*": {"origins": [
    "https://app.ronbets.com",
    "http://localhost:5173"  # Keep local development working
]}})

# Register original routes
app.register_blueprint(bets_bp)

# Try to register unified routes if available
try:
    from routes.unified_bets import bp as unified_bets_bp
    app.register_blueprint(unified_bets_bp)
    print("✅ Unified routes registered successfully")
except ImportError as e:
    print(f"⚠️  Unified routes not available: {e}")
except Exception as e:
    print(f"⚠️  Error registering unified routes: {e}")

if __name__ == "__main__":
    app.run(debug=True, port=5007)