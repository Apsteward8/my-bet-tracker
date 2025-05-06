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
app.register_blueprint(bets_bp)

if __name__ == "__main__":
    app.run(debug=True, port=5007)
