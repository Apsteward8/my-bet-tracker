# backend/app_unified.py
from flask import Flask, jsonify
from flask_cors import CORS
from config import Config

# Import both old and new models
from models import db as old_db
from models_unified import db as unified_db

# Import route blueprints
from routes.bets import bp as bets_bp  # Keep old routes for backward compatibility
from routes.unified_bets import bp as unified_bets_bp  # New unified routes

app = Flask(__name__)
app.config.from_object(Config)

# Initialize databases
old_db.init_app(app)  # Keep old database for migration/backup
unified_db.init_app(app)  # New unified database

# Configure CORS
CORS(app, resources={r"/api/*": {"origins": [
    "https://app.ronbets.com",
    "http://localhost:5173"  # Keep local development working
]}})

# Register route blueprints
app.register_blueprint(bets_bp)  # Old routes at /api/*
app.register_blueprint(unified_bets_bp)  # New routes at /api/unified/*

@app.route("/")
def index():
    return jsonify({
        "message": "Bet Tracking API with Unified Data Structure",
        "version": "2.0.0",
        "endpoints": {
            "legacy": {
                "description": "Original endpoints for backward compatibility",
                "base_url": "/api/",
                "endpoints": [
                    "GET /api/bets - Get OddsJam bets",
                    "GET /api/pikkit/bets - Get Pikkit bets",
                    "GET /api/combined-bets - Get combined bets with source prioritization",
                    "POST /api/bets/sync - Sync both sources"
                ]
            },
            "unified": {
                "description": "New unified endpoints with single table",
                "base_url": "/api/unified/",
                "endpoints": [
                    "GET /api/unified/bets - Get all bets from unified table",
                    "GET /api/unified/stats - Get unified statistics",
                    "GET /api/unified/daily-data - Get daily performance data",
                    "POST /api/unified/sync - Sync data to unified table",
                    "GET /api/unified/sportsbook-mapping - Get sportsbook mapping info"
                ]
            }
        },
        "data_sources": {
            "pikkit": {
                "description": "Automated tracking for US regulated sportsbooks",
                "sportsbooks": ["FanDuel", "DraftKings", "BetMGM", "Caesars", "etc."],
                "priority": "Primary source for tracked sportsbooks"
            },
            "oddsjam": {
                "description": "Manual tracking for offshore sportsbooks", 
                "sportsbooks": ["BetOnline", "Bovada", "BookMaker", "etc."],
                "priority": "Primary source for offshore sportsbooks"
            }
        }
    })

if __name__ == "__main__":
    app.run(debug=True, port=5007)