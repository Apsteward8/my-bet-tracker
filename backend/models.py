from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Bet(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    event_name = db.Column(db.String(255))
    bet_name = db.Column(db.String(255))
    sportsbook = db.Column(db.String(100))
    bet_type = db.Column(db.String(50))
    odds = db.Column(db.Float)
    clv = db.Column(db.Float)
    stake = db.Column(db.Float)
    status = db.Column(db.String(50))
    bet_profit = db.Column(db.Float)
    event_start_date = db.Column(db.DateTime)
