# bets.py - Enhanced version with pagination and more endpoints
from flask import Blueprint, jsonify, request
from models import Bet, PikkitBet, db
from datetime import datetime, timedelta
from sqlalchemy import func, text
import math
from werkzeug.utils import secure_filename
import subprocess
import os
import sys
from import_csv import import_bets_from_csv
from import_pikkit_csv import import_pikkit_bets_from_csv
from unified_bet_mapping import UnifiedBetMapper


# Make the import dynamic to avoid circular imports
def get_import_function():
    import import_csv
    return import_csv.import_bets_from_csv

bp = Blueprint("bets", __name__, url_prefix="/api")

# Get bets with optional pagination
@bp.route("/bets")
def get_bets():
    try:
        # Parse query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        paginate = request.args.get('paginate', 'true').lower() == 'true'
        status = request.args.get('status')
        sportsbook = request.args.get('sportsbook')
        
        # Build the query
        query = Bet.query
        
        # Apply filters if provided
        if status:
            query = query.filter(Bet.status == status)
        if sportsbook:
            query = query.filter(Bet.sportsbook == sportsbook)
        
        # Order by most recent first
        query = query.order_by(Bet.event_start_date.desc())
        
        if paginate:
            # Return paginated results
            pagination = query.paginate(page=page, per_page=per_page)
            
            return jsonify({
                "current_page": pagination.page,
                "pages": pagination.pages,
                "total": pagination.total,
                "items": [
                    {
                        "id": b.id,
                        "event_name": b.event_name,
                        "bet_name": b.bet_name,
                        "sportsbook": b.sportsbook,
                        "bet_type": b.bet_type,
                        "odds": b.odds,
                        "clv": b.clv,
                        "stake": b.stake,
                        "status": b.status,
                        "bet_profit": b.bet_profit,
                        "event_start_date": b.event_start_date.isoformat() if b.event_start_date else None,
                        "confirmed_settlement": b.confirmed_settlement
                    }
                    for b in pagination.items
                ]
            })
        else:
            # Return a simple array without pagination
            bets = query.limit(per_page).all()
            
            return jsonify([
                {
                    "id": b.id,
                    "event_name": b.event_name,
                    "bet_name": b.bet_name,
                    "sportsbook": b.sportsbook,
                    "bet_type": b.bet_type,
                    "odds": b.odds,
                    "clv": b.clv,
                    "stake": b.stake,
                    "status": b.status,
                    "bet_profit": b.bet_profit,
                    "event_start_date": b.event_start_date.isoformat() if b.event_start_date else None
                }
                for b in bets
            ])
    
    except Exception as e:
        print(f"Error retrieving bets: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Get a single bet by ID
@bp.route("/bets/<int:bet_id>")
def get_bet(bet_id):
    try:
        bet = Bet.query.get_or_404(bet_id)
        return jsonify({
            "id": bet.id,
            "event_name": bet.event_name,
            "bet_name": bet.bet_name,
            "sportsbook": bet.sportsbook,
            "bet_type": bet.bet_type,
            "odds": bet.odds,
            "clv": bet.clv,
            "stake": bet.stake,
            "status": bet.status,
            "bet_profit": bet.bet_profit,
            "event_start_date": bet.event_start_date.isoformat() if bet.event_start_date else None
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Create a new bet
@bp.route("/bets", methods=["POST"])
def create_bet():
    try:
        data = request.json
        
        # Basic validation
        required_fields = ["event_name", "bet_name", "sportsbook", "odds", "stake"]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Parse date if provided
        event_start_date = None
        if "event_start_date" in data and data["event_start_date"]:
            try:
                event_start_date = datetime.fromisoformat(data["event_start_date"])
            except ValueError:
                return jsonify({"error": "Invalid date format"}), 400
        
        # Create new bet
        new_bet = Bet(
            event_name=data["event_name"],
            bet_name=data["bet_name"],
            sportsbook=data["sportsbook"],
            bet_type=data.get("bet_type", ""),
            odds=data["odds"],
            clv=data.get("clv", 0),
            stake=data["stake"],
            status=data.get("status", "pending"),
            bet_profit=data.get("bet_profit", 0),
            event_start_date=event_start_date
        )
        
        db.session.add(new_bet)
        db.session.commit()
        
        return jsonify({
            "id": new_bet.id,
            "event_name": new_bet.event_name,
            "bet_name": new_bet.bet_name,
            "sportsbook": new_bet.sportsbook,
            "bet_type": new_bet.bet_type,
            "odds": new_bet.odds,
            "clv": new_bet.clv,
            "stake": new_bet.stake,
            "status": new_bet.status,
            "bet_profit": new_bet.bet_profit,
            "event_start_date": new_bet.event_start_date.isoformat() if new_bet.event_start_date else None
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# Update an existing bet
@bp.route("/bets/<int:bet_id>", methods=["PUT"])
def update_bet(bet_id):
    try:
        bet = Bet.query.get_or_404(bet_id)
        data = request.json
        
        # Update fields if provided
        if "event_name" in data:
            bet.event_name = data["event_name"]
        if "bet_name" in data:
            bet.bet_name = data["bet_name"]
        if "sportsbook" in data:
            bet.sportsbook = data["sportsbook"]
        if "bet_type" in data:
            bet.bet_type = data["bet_type"]
        if "odds" in data:
            bet.odds = data["odds"]
        if "clv" in data:
            bet.clv = data["clv"]
        if "stake" in data:
            bet.stake = data["stake"]
        if "status" in data:
            bet.status = data["status"]
        if "bet_profit" in data:
            bet.bet_profit = data["bet_profit"]
        if "event_start_date" in data and data["event_start_date"]:
            try:
                bet.event_start_date = datetime.fromisoformat(data["event_start_date"])
            except ValueError:
                return jsonify({"error": "Invalid date format"}), 400
        
        db.session.commit()
        
        return jsonify({
            "id": bet.id,
            "event_name": bet.event_name,
            "bet_name": bet.bet_name,
            "sportsbook": bet.sportsbook,
            "bet_type": bet.bet_type,
            "odds": bet.odds,
            "clv": bet.clv,
            "stake": bet.stake,
            "status": bet.status,
            "bet_profit": bet.bet_profit,
            "event_start_date": bet.event_start_date.isoformat() if bet.event_start_date else None
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# Delete a bet
@bp.route("/bets/<int:bet_id>", methods=["DELETE"])
def delete_bet(bet_id):
    try:
        bet = Bet.query.get_or_404(bet_id)
        db.session.delete(bet)
        db.session.commit()
        return jsonify({"message": "Bet deleted successfully"}), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# Get bet statistics for dashboard
@bp.route("/bets/stats")
def get_bet_stats():
    try:
        # Get total counts
        total_bets = Bet.query.count()
        winning_bets = Bet.query.filter(Bet.bet_profit > 0).count()
        
        # Calculate profit stats
        total_profit = db.session.query(func.sum(Bet.bet_profit)).scalar() or 0
        total_stake = db.session.query(func.sum(Bet.stake)).scalar() or 0
        roi = (total_profit / total_stake * 100) if total_stake > 0 else 0
        
        # Calculate average CLV
        avg_clv = db.session.query(func.avg(Bet.clv)).scalar() or 0
        
        # Win rate
        win_rate = (winning_bets / total_bets * 100) if total_bets > 0 else 0
        
        # Sportsbook breakdown
        sportsbook_query = db.session.query(
            Bet.sportsbook,
            func.count(Bet.id),
            func.sum(Bet.bet_profit)
        ).group_by(Bet.sportsbook).all()
        
        sportsbooks = [
            {
                "name": name,
                "count": count,
                "profit": float(profit) if profit else 0
            }
            for name, count, profit in sportsbook_query
        ]
        
        return jsonify({
            "total_bets": total_bets,
            "winning_bets": winning_bets,
            "win_rate": win_rate,
            "total_profit": float(total_profit),
            "total_stake": float(total_stake),
            "roi": roi,
            "avg_clv": float(avg_clv),
            "sportsbooks": sportsbooks
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
# Functions to calculate EV metrics
def american_odds_to_implied_prob(odds):
    """Convert American odds to implied probability."""
    try:
        if odds > 0:
            return 100 / (odds + 100)
        else:
            return abs(odds) / (abs(odds) + 100)
    except (TypeError, ZeroDivisionError):
        return 0

def calculate_ev_percent(implied_prob, clv_implied_prob):
    """Calculate EV percent from implied probabilities."""
    try:
        return (clv_implied_prob / implied_prob) - 1
    except (TypeError, ZeroDivisionError):
        return 0

def categorize_ev(ev_pct):
    """Categorize EV based on percentage."""
    if ev_pct >= 0.10:  # 10% or higher
        return "High EV"
    elif ev_pct >= 0.05:  # 5-10%
        return "Medium EV"
    else:  # Under 5%
        return "Low EV"

@bp.route("/ev-analysis")
def get_ev_analysis():
    """
    Get all positive EV bets with calculated metrics.
    
    Query parameters:
    - include_pending: "true" or "false" (default: "false")
    - include_player_props: "true" or "false" (default: "false")
    - start_date: ISO format date string (default: earliest date)
    - end_date: ISO format date string (default: latest date)
    """
    try:
        # Parse query parameters
        include_pending = request.args.get('include_pending', 'false').lower() == 'true'
        include_player_props = request.args.get('include_player_props', 'false').lower() == 'true'
        
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        
        start_date = None
        end_date = None
        
        # Safely parse dates
        if start_date_str:
            try:
                start_date = datetime.fromisoformat(start_date_str)
            except ValueError:
                # Invalid date format, ignore this filter
                pass
                
        if end_date_str:
            try:
                end_date = datetime.fromisoformat(end_date_str)
            except ValueError:
                # Invalid date format, ignore this filter
                pass
        
        # Step 1: Get all positive EV bets - WITHOUT filtering out zero/null CLV
        query = Bet.query.filter(Bet.bet_type == "positive_ev")
        
        # Apply date filters if provided
        if start_date:
            query = query.filter(Bet.event_start_date >= start_date)
        
        if end_date:
            # Add 1 day to end_date and use < instead of <= to include the entire end date
            next_day = end_date + timedelta(days=1)
            query = query.filter(Bet.event_start_date < next_day)
        
        # Filter out future events
        query = query.filter(Bet.event_start_date <= datetime.now())
        
        # Filter out player props if needed
        if not include_player_props:
            query = query.filter(~Bet.market_name.ilike('%player%'))
        
        # By default, filter out pending bets unless explicitly included
        if not include_pending:
            query = query.filter(Bet.status != "pending")
        
        # Execute query and get all bets
        all_bets = query.all()
        
        # If no bets match criteria
        if not all_bets:
            return jsonify({
                "bets": [],
                "stats": None,
                "message": "No bets found matching your criteria"
            }), 200
        
        # Separate bets with valid CLV for certain calculations
        valid_clv_bets = []
        processed_bets = []
        
        # Step 2: Process bets with calculated fields
        for bet in all_bets:
            # Convert Decimal to float for JSON serialization
            bet_stake = float(bet.stake) if bet.stake is not None else 0
            bet_profit = float(bet.bet_profit) if bet.bet_profit is not None else 0
            
            # Base processed bet with null values for CLV calculations
            processed_bet = {
                "id": bet.id,
                "event_name": bet.event_name,
                "bet_name": bet.bet_name,
                "sportsbook": bet.sportsbook,
                "sport": bet.sport,
                "bet_type": bet.bet_type,
                "odds": bet.odds,
                "clv": bet.clv,
                "stake": bet_stake,
                "status": bet.status,
                "bet_profit": bet_profit,
                "event_start_date": bet.event_start_date.isoformat() if bet.event_start_date else None,
                "market_name": bet.market_name,
                # Default values for CLV fields
                "implied_prob": None,
                "clv_implied_prob": None,
                "ev_percent": None,
                "expected_profit": None,
                "beat_clv": None,
                "ev_category": "No CLV"
            }
            
            # Only calculate CLV metrics if CLV is valid
            has_valid_clv = bet.clv is not None and bet.clv != 0
            
            if has_valid_clv:
                # Calculate implied probabilities
                implied_prob = american_odds_to_implied_prob(bet.odds)
                clv_implied_prob = american_odds_to_implied_prob(bet.clv)
                
                # Only proceed if probabilities are valid
                if implied_prob and clv_implied_prob:
                    # Calculate EV metrics
                    ev_percent = calculate_ev_percent(implied_prob, clv_implied_prob)
                    expected_profit = bet_stake * ev_percent
                    
                    # Determine if bet beat closing line
                    beat_clv = bet.odds > bet.clv
                    
                    # Categorize EV quality
                    ev_category = categorize_ev(ev_percent)
                    
                    # Update processed bet with CLV calculations
                    processed_bet.update({
                        "implied_prob": implied_prob,
                        "clv_implied_prob": clv_implied_prob,
                        "ev_percent": ev_percent,
                        "expected_profit": expected_profit,
                        "beat_clv": beat_clv,
                        "ev_category": ev_category
                    })
                    
                    # Add to valid CLV bets for specific calculations
                    valid_clv_bets.append(processed_bet)
            
            # Add to all processed bets regardless of CLV
            processed_bets.append(processed_bet)
        
        # Step 3: Calculate summary statistics
        
        # Use all processed bets for general stats
        total_bets = len(processed_bets)
        
        # Get different subsets of bets
        settled_bets = [bet for bet in processed_bets if bet["status"] != "pending"]
        winning_bets = [bet for bet in settled_bets if bet["status"] == "won"]
        losing_bets = [bet for bet in settled_bets if bet["status"] == "lost"]
        pending_bets = [bet for bet in processed_bets if bet["status"] == "pending"]
        
        # Analysis bets - all non-pending bets by default
        analyze_bets = processed_bets
        
        # Calculate key metrics using all bets
        total_stake = sum(bet["stake"] for bet in analyze_bets)
        total_profit = sum(bet["bet_profit"] for bet in analyze_bets)
        roi = (total_profit / total_stake) * 100 if total_stake > 0 else 0
        
        # Calculate win rates using settled bets
        win_rate = (len(winning_bets) / len(settled_bets)) * 100 if settled_bets else 0
        
        # Calculate CLV-specific metrics using only valid CLV bets
        valid_clv_analyze_bets = valid_clv_bets
        valid_clv_settled_bets = [bet for bet in valid_clv_bets if bet["status"] != "pending"]
        
        expected_profit = sum(bet["expected_profit"] for bet in valid_clv_analyze_bets) if valid_clv_analyze_bets else 0
        expected_roi = (expected_profit / total_stake) * 100 if total_stake > 0 else 0
        clv_win_rate = (sum(1 for bet in valid_clv_settled_bets if bet["beat_clv"]) / len(valid_clv_settled_bets)) * 100 if valid_clv_settled_bets else 0
        avg_ev = sum(bet["ev_percent"] for bet in valid_clv_analyze_bets) / len(valid_clv_analyze_bets) * 100 if valid_clv_analyze_bets else 0
        
        # Calculate sportsbook stats - using all bets for general stats
        sportsbook_stats = {}
        for bet in analyze_bets:
            sb = bet["sportsbook"]
            if sb not in sportsbook_stats:
                sportsbook_stats[sb] = {
                    "name": sb,
                    "bet_count": 0,
                    "total_stake": 0,
                    "total_profit": 0,
                    "expected_profit": 0,
                    "ev_sum": 0,
                    "clv_bet_count": 0  # Count bets with valid CLV for averaging
                }
            
            stats = sportsbook_stats[sb]
            stats["bet_count"] += 1
            stats["total_stake"] += bet["stake"]
            stats["total_profit"] += bet["bet_profit"]
            
            # Only include expected profit and EV if bet has valid CLV
            if bet["ev_percent"] is not None:
                stats["expected_profit"] += bet["expected_profit"]
                stats["ev_sum"] += bet["ev_percent"]
                stats["clv_bet_count"] += 1
        
        # Calculate derived metrics for sportsbooks
        for sb in sportsbook_stats:
            stats = sportsbook_stats[sb]
            stats["roi"] = (stats["total_profit"] / stats["total_stake"]) * 100 if stats["total_stake"] > 0 else 0
            stats["expected_roi"] = (stats["expected_profit"] / stats["total_stake"]) * 100 if stats["total_stake"] > 0 else 0
            stats["avg_ev"] = (stats["ev_sum"] / stats["clv_bet_count"] * 100) if stats["clv_bet_count"] > 0 else 0
            # Remove temporary fields
            del stats["ev_sum"]
            del stats["clv_bet_count"]
        
        # Convert dict to list and sort by profit
        sportsbook_stats_list = list(sportsbook_stats.values())
        sportsbook_stats_list.sort(key=lambda x: x["total_profit"], reverse=True)
        
        # Calculate sport stats if available - similar approach
        sport_stats_list = []
        if any("sport" in bet and bet["sport"] for bet in analyze_bets):
            sport_stats = {}
            for bet in analyze_bets:
                sport = bet["sport"]
                if not sport:
                    continue
                    
                if sport not in sport_stats:
                    sport_stats[sport] = {
                        "name": sport,
                        "bet_count": 0,
                        "total_stake": 0,
                        "total_profit": 0,
                        "expected_profit": 0,
                        "ev_sum": 0,
                        "clv_bet_count": 0
                    }
                
                stats = sport_stats[sport]
                stats["bet_count"] += 1
                stats["total_stake"] += bet["stake"]
                stats["total_profit"] += bet["bet_profit"]
                
                # Only include expected profit and EV if bet has valid CLV
                if bet["ev_percent"] is not None:
                    stats["expected_profit"] += bet["expected_profit"]
                    stats["ev_sum"] += bet["ev_percent"]
                    stats["clv_bet_count"] += 1
            
            # Calculate derived metrics for sports
            for sport in sport_stats:
                stats = sport_stats[sport]
                stats["roi"] = (stats["total_profit"] / stats["total_stake"]) * 100 if stats["total_stake"] > 0 else 0
                stats["expected_roi"] = (stats["expected_profit"] / stats["total_stake"]) * 100 if stats["total_stake"] > 0 else 0
                stats["avg_ev"] = (stats["ev_sum"] / stats["clv_bet_count"] * 100) if stats["clv_bet_count"] > 0 else 0
                # Remove temporary fields
                del stats["ev_sum"]
                del stats["clv_bet_count"]
            
            # Convert dict to list and sort by profit
            sport_stats_list = list(sport_stats.values())
            sport_stats_list.sort(key=lambda x: x["total_profit"], reverse=True)
        
        # Calculate EV quality stats - only for valid CLV bets
        ev_categories = ["High EV", "Medium EV", "Low EV", "No CLV"]
        ev_quality_stats = {category: {
            "category": category,
            "bet_count": 0,
            "total_stake": 0,
            "total_profit": 0,
            "expected_profit": 0,
            "ev_sum": 0,
            "clv_bet_count": 0
        } for category in ev_categories}
        
        for bet in analyze_bets:
            category = bet["ev_category"]
            if category not in ev_quality_stats:
                continue
                
            stats = ev_quality_stats[category]
            stats["bet_count"] += 1
            stats["total_stake"] += bet["stake"]
            stats["total_profit"] += bet["bet_profit"]
            
            # Only include expected profit and EV if bet has valid CLV
            if bet["ev_percent"] is not None:
                stats["expected_profit"] += bet["expected_profit"]
                stats["ev_sum"] += bet["ev_percent"]
                stats["clv_bet_count"] += 1
        
        # Calculate derived metrics for EV categories
        for category in ev_quality_stats:
            stats = ev_quality_stats[category]
            if stats["bet_count"] > 0:
                stats["roi"] = (stats["total_profit"] / stats["total_stake"]) * 100 if stats["total_stake"] > 0 else 0
                stats["expected_roi"] = (stats["expected_profit"] / stats["total_stake"]) * 100 if stats["total_stake"] > 0 else 0
                stats["avg_ev"] = (stats["ev_sum"] / stats["clv_bet_count"] * 100) if stats["clv_bet_count"] > 0 else 0
                # Remove temporary fields
                del stats["ev_sum"]
                del stats["clv_bet_count"]
            else:
                stats["roi"] = 0
                stats["expected_roi"] = 0
                stats["avg_ev"] = 0
                # Remove temporary fields
                del stats["ev_sum"]
                del stats["clv_bet_count"]
        
        # Convert dict to list with custom order
        ev_quality_stats_list = [ev_quality_stats[cat] for cat in ["High EV", "Medium EV", "Low EV", "No CLV"] if cat in ev_quality_stats]
        
        # Construct response
        response = {
            "bets": processed_bets,
            "stats": {
                "total_bets": total_bets,
                "winning_bets": len(winning_bets),
                "losing_bets": len(losing_bets),
                "pending_bets": len(pending_bets),
                "total_stake": total_stake,
                "total_profit": total_profit,
                "expected_profit": expected_profit,
                "roi": roi,
                "expected_roi": expected_roi,
                "win_rate": win_rate,
                "clv_win_rate": clv_win_rate,
                "avg_ev": avg_ev,
                "valid_clv_bets": len(valid_clv_analyze_bets),
                "total_analyzed_bets": len(analyze_bets)
            },
            "sportsbook_stats": sportsbook_stats_list,
            "sport_stats": sport_stats_list,
            "ev_quality_stats": ev_quality_stats_list
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        print(f"Error in EV analysis: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@bp.route("/bets/unconfirmed")
def get_unconfirmed_bets():
    try:
        # Use text() to properly declare SQL queries
        sql = text("""
            SELECT id, event_name, bet_name, sportsbook, bet_type, 
                   odds, stake, status, bet_profit, event_start_date
            FROM bet 
            WHERE status != 'pending' 
            AND (confirmed_settlement IS NULL OR confirmed_settlement = 0)
            ORDER BY id DESC
        """)
        
        result = db.session.execute(sql)
        
        # Convert result to list of dictionaries
        bets = [
            {
                "id": row[0],
                "event_name": row[1],
                "bet_name": row[2],
                "sportsbook": row[3],
                "bet_type": row[4],
                "odds": row[5],
                "stake": float(row[6]) if row[6] else 0,
                "status": row[7],
                "bet_profit": float(row[8]) if row[8] else 0,
                "event_start_date": row[9].isoformat() if row[9] else None
            }
            for row in result
        ]
        
        return jsonify(bets)
    
    except Exception as e:
        print(f"Error retrieving unconfirmed bets: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route("/bets/<int:bet_id>/confirm", methods=["PUT"])
def confirm_bet_settlement(bet_id):
    try:
        # Use text() to properly declare SQL queries
        sql = text("""
            UPDATE bet
            SET confirmed_settlement = :value
            WHERE id = :bet_id
        """)
        
        db.session.execute(sql, {"bet_id": bet_id, "value": True})
        
        # Add confirmation notes if provided
        if request.is_json and request.json and "confirmation_notes" in request.json:
            notes_sql = text("""
                UPDATE bet
                SET confirmation_notes = :notes
                WHERE id = :bet_id
            """)
            
            db.session.execute(notes_sql, {
                "bet_id": bet_id,
                "notes": request.json["confirmation_notes"]
            })
        
        db.session.commit()
        
        return jsonify({
            "id": bet_id,
            "confirmed_settlement": True,
            "message": "Bet settlement confirmed successfully"
        })
    
    except Exception as e:
        db.session.rollback()
        print(f"Error confirming bet settlement: {str(e)}")
        return jsonify({"error": str(e)}), 500
    
@bp.route("/bets/import", methods=["POST"])
def import_bets():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400
            
        if file and file.filename.endswith('.csv'):
            filename = secure_filename(file.filename)
            filepath = os.path.join('/tmp', filename)
            file.save(filepath)
            
            # Import the bets
            import_bets_from_csv(filepath)
            
            # Clean up the temporary file
            os.remove(filepath)
            
            return jsonify({"message": "Import successful"}), 200
        else:
            return jsonify({"error": "Invalid file type. Please upload a CSV file"}), 400
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@bp.route("/bets/sync", methods=["POST"])
def sync_bets():
    try:
        # Path to your import_csv.py script
        script_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "import_csv.py")
        
        # Check if the script exists
        if not os.path.exists(script_path):
            return jsonify({
                "error": f"Import script not found at {script_path}"
            }), 404
        
        # Run the script in a separate process
        result = subprocess.run(
            [sys.executable, script_path],
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            return jsonify({
                "error": "Error running sync script",
                "details": result.stderr
            }), 500
        
        # Return success message with any output from the script
        return jsonify({
            "message": "Sync completed successfully!",
            "details": result.stdout
        }), 200
    
    except Exception as e:
        # Handle other errors
        return jsonify({
            "error": str(e)
        }), 500

@bp.route("/bets/expected-profit")
def get_expected_profit():
    """
    Get all pending bets with calculated expected profit metrics.
    
    Query parameters:
    - start_date: ISO format date string (default: today)
    - end_date: ISO format date string (default: future)
    - include_player_props: "true" or "false" (default: "false")
    """
    try:
        # Parse query parameters
        include_player_props = request.args.get('include_player_props', 'false').lower() == 'true'
        
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        
        # Default to today for start date if not provided
        if not start_date_str:
            start_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        else:
            try:
                start_date = datetime.fromisoformat(start_date_str)
            except ValueError:
                # Invalid date format, use today
                start_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Default to no end date limit if not provided
        if not end_date_str:
            end_date = None
        else:
            try:
                end_date = datetime.fromisoformat(end_date_str)
            except ValueError:
                # Invalid date format, use no limit
                end_date = None
        
        # Get all pending bets within the date range
        query = Bet.query.filter(Bet.status == "pending")
        
        # Apply date filters
        query = query.filter(Bet.event_start_date >= start_date)
        
        if end_date:
            # Add 1 day to end_date and use < instead of <= to include the entire end date
            next_day = end_date + timedelta(days=1)
            query = query.filter(Bet.event_start_date < next_day)
        
        # Filter out player props if needed
        if not include_player_props:
            query = query.filter(~Bet.market_name.ilike('%player%'))
        
        # Execute query and get all bets
        pending_bets = query.all()
        
        # If no bets match criteria
        if not pending_bets:
            return jsonify({
                "bets": [],
                "stats": {
                    "total_bets": 0,
                    "total_stake": 0,
                    "expected_profit": 0,
                    "expected_roi": 0,
                },
                "message": "No pending bets found matching your criteria"
            }), 200
        
        # Process bets with calculated fields
        processed_bets = []
        total_stake = 0
        total_expected_profit = 0
        
        for bet in pending_bets:
            # Convert Decimal to float for JSON serialization
            bet_stake = float(bet.stake) if bet.stake is not None else 0
            bet_profit = float(bet.bet_profit) if bet.bet_profit is not None else 0
            
            # Calculate implied probabilities and expected profit
            implied_prob = None
            expected_profit = None
            expected_roi = None
            
            # Only calculate if CLV is valid
            has_valid_clv = bet.clv is not None and bet.clv != 0
            
            if has_valid_clv:
                # Calculate implied probabilities
                implied_prob = american_odds_to_implied_prob(bet.odds)
                clv_implied_prob = american_odds_to_implied_prob(bet.clv)
                
                # Calculate EV metrics
                if implied_prob and clv_implied_prob:
                    ev_percent = calculate_ev_percent(implied_prob, clv_implied_prob)
                    expected_profit = bet_stake * ev_percent
                    
                    # Add to totals for summary stats
                    total_stake += bet_stake
                    total_expected_profit += expected_profit
            
            # Format event start time for display
            event_date = bet.event_start_date.strftime("%Y-%m-%d") if bet.event_start_date else None
            event_time = bet.event_start_date.strftime("%I:%M %p") if bet.event_start_date else None
            
            # Create processed bet object
            processed_bet = {
                "id": bet.id,
                "event_name": bet.event_name,
                "bet_name": bet.bet_name,
                "sportsbook": bet.sportsbook,
                "sport": bet.sport,
                "odds": bet.odds,
                "clv": bet.clv,
                "stake": bet_stake,
                "potential_payout": float(bet.potential_payout) if bet.potential_payout else 0,
                "event_date": event_date,
                "event_time": event_time,
                "event_start_date": bet.event_start_date.isoformat() if bet.event_start_date else None,
                "implied_prob": implied_prob,
                "expected_profit": expected_profit,
                "ev_percent": (ev_percent * 100) if 'ev_percent' in locals() else None
            }
            
            processed_bets.append(processed_bet)
        
        # Calculate expected ROI
        expected_roi = (total_expected_profit / total_stake * 100) if total_stake > 0 else 0
        
        # Group bets by date
        bets_by_date = {}
        for bet in processed_bets:
            if bet["event_date"] not in bets_by_date:
                bets_by_date[bet["event_date"]] = {
                    "date": bet["event_date"],
                    "bets": [],
                    "total_stake": 0,
                    "expected_profit": 0
                }
            
            bets_by_date[bet["event_date"]]["bets"].append(bet)
            bets_by_date[bet["event_date"]]["total_stake"] += bet["stake"]
            
            if bet["expected_profit"] is not None:
                bets_by_date[bet["event_date"]]["expected_profit"] += bet["expected_profit"]
        
        # Convert to list and sort by date
        daily_summaries = list(bets_by_date.values())
        daily_summaries.sort(key=lambda x: x["date"])
        
        # Calculate daily ROIs
        for day in daily_summaries:
            day["expected_roi"] = (day["expected_profit"] / day["total_stake"] * 100) if day["total_stake"] > 0 else 0
        
        # Group bets by sportsbook
        sportsbook_summaries = {}
        for bet in processed_bets:
            if bet["sportsbook"] not in sportsbook_summaries:
                sportsbook_summaries[bet["sportsbook"]] = {
                    "name": bet["sportsbook"],
                    "bet_count": 0,
                    "total_stake": 0,
                    "expected_profit": 0
                }
            
            sportsbook_summaries[bet["sportsbook"]]["bet_count"] += 1
            sportsbook_summaries[bet["sportsbook"]]["total_stake"] += bet["stake"]
            
            if bet["expected_profit"] is not None:
                sportsbook_summaries[bet["sportsbook"]]["expected_profit"] += bet["expected_profit"]
        
        # Calculate ROIs and convert to list
        for sb in sportsbook_summaries.values():
            sb["expected_roi"] = (sb["expected_profit"] / sb["total_stake"] * 100) if sb["total_stake"] > 0 else 0
        
        sportsbook_list = list(sportsbook_summaries.values())
        sportsbook_list.sort(key=lambda x: x["expected_profit"], reverse=True)
        
        # Construct response
        response = {
            "bets": processed_bets,
            "stats": {
                "total_bets": len(processed_bets),
                "total_stake": total_stake,
                "expected_profit": total_expected_profit,
                "expected_roi": expected_roi
            },
            "daily_summaries": daily_summaries,
            "sportsbook_summaries": sportsbook_list,
            "date_range": {
                "start": start_date.isoformat() if start_date else None,
                "end": end_date.isoformat() if end_date else None
            }
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        print(f"Error in expected profit analysis: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@bp.route("/all-bets-history")
def get_all_bets_history():
    """
    Get all bets with calculated metrics (not just positive EV).
    
    Query parameters:
    - include_pending: "true" or "false" (default: "true")
    - include_player_props: "true" or "false" (default: "true")
    - start_date: ISO format date string (default: earliest date)
    - end_date: ISO format date string (default: latest date)
    """
    try:
        # Parse query parameters - different defaults from EV analysis
        include_pending = request.args.get('include_pending', 'true').lower() == 'true'
        include_player_props = request.args.get('include_player_props', 'true').lower() == 'true'
        
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        
        start_date = None
        end_date = None
        
        # Safely parse dates
        if start_date_str:
            try:
                start_date = datetime.fromisoformat(start_date_str)
            except ValueError:
                # Invalid date format, ignore this filter
                pass
                
        if end_date_str:
            try:
                end_date = datetime.fromisoformat(end_date_str)
            except ValueError:
                # Invalid date format, ignore this filter
                pass
        
        # Step 1: Get ALL bets - NOT just positive EV bets
        # Remove the filter for bet_type == "positive_ev"
        query = Bet.query
        
        # Apply date filters if provided
        if start_date:
            query = query.filter(Bet.event_start_date >= start_date)
        
        if end_date:
            # Add 1 day to end_date and use < instead of <= to include the entire end date
            next_day = end_date + timedelta(days=1)
            query = query.filter(Bet.event_start_date < next_day)
        
        # Filter out future events
        query = query.filter(Bet.event_start_date <= datetime.now())
        
        # Filter out player props if needed
        if not include_player_props:
            query = query.filter(~Bet.market_name.ilike('%player%'))
        
        # By default, include pending bets unless explicitly excluded
        if not include_pending:
            query = query.filter(Bet.status != "pending")
        
        # Execute query and get all bets
        all_bets = query.all()
        
        # If no bets match criteria
        if not all_bets:
            return jsonify({
                "bets": [],
                "stats": None,
                "message": "No bets found matching your criteria"
            }), 200
        
        # Separate bets with valid CLV for certain calculations
        valid_clv_bets = []
        processed_bets = []
        
        # Step 2: Process bets with calculated fields
        for bet in all_bets:
            # Convert Decimal to float for JSON serialization
            bet_stake = float(bet.stake) if bet.stake is not None else 0
            bet_profit = float(bet.bet_profit) if bet.bet_profit is not None else 0
            
            # Base processed bet with null values for CLV calculations
            processed_bet = {
                "id": bet.id,
                "event_name": bet.event_name,
                "bet_name": bet.bet_name,
                "sportsbook": bet.sportsbook,
                "sport": bet.sport,
                "bet_type": bet.bet_type,
                "odds": bet.odds,
                "clv": bet.clv,
                "stake": bet_stake,
                "status": bet.status,
                "bet_profit": bet_profit,
                "event_start_date": bet.event_start_date.isoformat() if bet.event_start_date else None,
                "market_name": bet.market_name,
                # Default values for CLV fields
                "implied_prob": None,
                "clv_implied_prob": None,
                "ev_percent": None,
                "expected_profit": None,
                "beat_clv": None,
                "ev_category": "No CLV"
            }
            
            # Only calculate CLV metrics if CLV is valid
            has_valid_clv = bet.clv is not None and bet.clv != 0
            
            if has_valid_clv:
                # Calculate implied probabilities
                implied_prob = american_odds_to_implied_prob(bet.odds)
                clv_implied_prob = american_odds_to_implied_prob(bet.clv)
                
                # Only proceed if probabilities are valid
                if implied_prob and clv_implied_prob:
                    # Calculate EV metrics
                    ev_percent = calculate_ev_percent(implied_prob, clv_implied_prob)
                    expected_profit = bet_stake * ev_percent
                    
                    # Determine if bet beat closing line
                    beat_clv = bet.odds > bet.clv
                    
                    # Categorize EV quality
                    ev_category = categorize_ev(ev_percent)
                    
                    # Update processed bet with CLV calculations
                    processed_bet.update({
                        "implied_prob": implied_prob,
                        "clv_implied_prob": clv_implied_prob,
                        "ev_percent": ev_percent,
                        "expected_profit": expected_profit,
                        "beat_clv": beat_clv,
                        "ev_category": ev_category
                    })
                    
                    # Add to valid CLV bets for specific calculations
                    valid_clv_bets.append(processed_bet)
            
            # Add to all processed bets regardless of CLV
            processed_bets.append(processed_bet)
        
        # Step 3: Calculate summary statistics
        
        # Use all processed bets for general stats
        total_bets = len(processed_bets)
        
        # Get different subsets of bets
        settled_bets = [bet for bet in processed_bets if bet["status"] not in ["pending"]]
        winning_bets = [bet for bet in settled_bets if bet["status"] == "won"]
        losing_bets = [bet for bet in settled_bets if bet["status"] == "lost"]
        pending_bets = [bet for bet in processed_bets if bet["status"] == "pending"]
        push_bets = [bet for bet in processed_bets if bet["status"] == "push"]
        void_bets = [bet for bet in processed_bets if bet["status"] == "void"]
        
        # Analysis bets - all bets by default
        analyze_bets = processed_bets
        
        # Calculate key metrics using all bets
        total_stake = sum(bet["stake"] for bet in analyze_bets)
        total_profit = sum(bet["bet_profit"] for bet in analyze_bets)
        roi = (total_profit / total_stake) * 100 if total_stake > 0 else 0
        
        # Calculate win rates using settled bets (excluding pending, push, void)
        decisive_bets = winning_bets + losing_bets
        win_rate = (len(winning_bets) / len(decisive_bets)) * 100 if decisive_bets else 0
        
        # Calculate additional metrics for all bets view
        avg_odds = sum(bet["odds"] for bet in analyze_bets if bet["odds"]) / len([bet for bet in analyze_bets if bet["odds"]]) if any(bet["odds"] for bet in analyze_bets) else 0
        avg_stake = total_stake / total_bets if total_bets > 0 else 0
        
        # Calculate CLV-specific metrics using only valid CLV bets
        valid_clv_analyze_bets = valid_clv_bets
        valid_clv_settled_bets = [bet for bet in valid_clv_bets if bet["status"] not in ["pending"]]
        
        expected_profit = sum(bet["expected_profit"] for bet in valid_clv_analyze_bets) if valid_clv_analyze_bets else 0
        expected_roi = (expected_profit / total_stake) * 100 if total_stake > 0 else 0
        clv_win_rate = (sum(1 for bet in valid_clv_settled_bets if bet["beat_clv"]) / len(valid_clv_settled_bets)) * 100 if valid_clv_settled_bets else 0
        avg_ev = sum(bet["ev_percent"] for bet in valid_clv_analyze_bets) / len(valid_clv_analyze_bets) * 100 if valid_clv_analyze_bets else 0
        
        # Calculate sportsbook stats - using all bets for general stats
        sportsbook_stats = {}
        for bet in analyze_bets:
            sb = bet["sportsbook"]
            if sb not in sportsbook_stats:
                sportsbook_stats[sb] = {
                    "name": sb,
                    "bet_count": 0,
                    "total_stake": 0,
                    "total_profit": 0,
                    "expected_profit": 0,
                    "ev_sum": 0,
                    "clv_bet_count": 0  # Count bets with valid CLV for averaging
                }
            
            stats = sportsbook_stats[sb]
            stats["bet_count"] += 1
            stats["total_stake"] += bet["stake"]
            stats["total_profit"] += bet["bet_profit"]
            
            # Only include expected profit and EV if bet has valid CLV
            if bet["ev_percent"] is not None:
                stats["expected_profit"] += bet["expected_profit"]
                stats["ev_sum"] += bet["ev_percent"]
                stats["clv_bet_count"] += 1
        
        # Calculate derived metrics for sportsbooks
        for sb in sportsbook_stats:
            stats = sportsbook_stats[sb]
            stats["roi"] = (stats["total_profit"] / stats["total_stake"]) * 100 if stats["total_stake"] > 0 else 0
            stats["expected_roi"] = (stats["expected_profit"] / stats["total_stake"]) * 100 if stats["total_stake"] > 0 else 0
            stats["avg_ev"] = (stats["ev_sum"] / stats["clv_bet_count"] * 100) if stats["clv_bet_count"] > 0 else 0
            # Remove temporary fields
            del stats["ev_sum"]
            del stats["clv_bet_count"]
        
        # Convert dict to list and sort by profit
        sportsbook_stats_list = list(sportsbook_stats.values())
        sportsbook_stats_list.sort(key=lambda x: x["total_profit"], reverse=True)
        
        # Calculate sport stats if available - similar approach
        sport_stats_list = []
        if any("sport" in bet and bet["sport"] for bet in analyze_bets):
            sport_stats = {}
            for bet in analyze_bets:
                sport = bet["sport"]
                if not sport:
                    continue
                    
                if sport not in sport_stats:
                    sport_stats[sport] = {
                        "name": sport,
                        "bet_count": 0,
                        "total_stake": 0,
                        "total_profit": 0,
                        "expected_profit": 0,
                        "ev_sum": 0,
                        "clv_bet_count": 0
                    }
                
                stats = sport_stats[sport]
                stats["bet_count"] += 1
                stats["total_stake"] += bet["stake"]
                stats["total_profit"] += bet["bet_profit"]
                
                # Only include expected profit and EV if bet has valid CLV
                if bet["ev_percent"] is not None:
                    stats["expected_profit"] += bet["expected_profit"]
                    stats["ev_sum"] += bet["ev_percent"]
                    stats["clv_bet_count"] += 1
            
            # Calculate derived metrics for sports
            for sport in sport_stats:
                stats = sport_stats[sport]
                stats["roi"] = (stats["total_profit"] / stats["total_stake"]) * 100 if stats["total_stake"] > 0 else 0
                stats["expected_roi"] = (stats["expected_profit"] / stats["total_stake"]) * 100 if stats["total_stake"] > 0 else 0
                stats["avg_ev"] = (stats["ev_sum"] / stats["clv_bet_count"] * 100) if stats["clv_bet_count"] > 0 else 0
                # Remove temporary fields
                del stats["ev_sum"]
                del stats["clv_bet_count"]
            
            # Convert dict to list and sort by profit
            sport_stats_list = list(sport_stats.values())
            sport_stats_list.sort(key=lambda x: x["total_profit"], reverse=True)
        
        # Calculate status stats - NEW for all bets view
        status_stats = {}
        for bet in analyze_bets:
            status = bet["status"]
            if status not in status_stats:
                status_stats[status] = {
                    "status": status,
                    "bet_count": 0,
                    "total_stake": 0,
                    "total_profit": 0,
                    "expected_profit": 0,
                    "ev_sum": 0,
                    "clv_bet_count": 0
                }
            
            stats = status_stats[status]
            stats["bet_count"] += 1
            stats["total_stake"] += bet["stake"]
            stats["total_profit"] += bet["bet_profit"]
            
            # Only include expected profit and EV if bet has valid CLV
            if bet["ev_percent"] is not None:
                stats["expected_profit"] += bet["expected_profit"]
                stats["ev_sum"] += bet["ev_percent"]
                stats["clv_bet_count"] += 1
        
        # Calculate derived metrics for status
        for status in status_stats:
            stats = status_stats[status]
            stats["roi"] = (stats["total_profit"] / stats["total_stake"]) * 100 if stats["total_stake"] > 0 else 0
            stats["expected_roi"] = (stats["expected_profit"] / stats["total_stake"]) * 100 if stats["total_stake"] > 0 else 0
            stats["avg_ev"] = (stats["ev_sum"] / stats["clv_bet_count"] * 100) if stats["clv_bet_count"] > 0 else 0
            # Remove temporary fields
            del stats["ev_sum"]
            del stats["clv_bet_count"]
        
        # Convert dict to list and sort by bet count
        status_stats_list = list(status_stats.values())
        status_stats_list.sort(key=lambda x: x["bet_count"], reverse=True)
        
        # Calculate EV quality stats - only for valid CLV bets
        ev_categories = ["High EV", "Medium EV", "Low EV", "No CLV"]
        ev_quality_stats = {category: {
            "category": category,
            "bet_count": 0,
            "total_stake": 0,
            "total_profit": 0,
            "expected_profit": 0,
            "ev_sum": 0,
            "clv_bet_count": 0
        } for category in ev_categories}
        
        for bet in analyze_bets:
            category = bet["ev_category"]
            if category not in ev_quality_stats:
                continue
                
            stats = ev_quality_stats[category]
            stats["bet_count"] += 1
            stats["total_stake"] += bet["stake"]
            stats["total_profit"] += bet["bet_profit"]
            
            # Only include expected profit and EV if bet has valid CLV
            if bet["ev_percent"] is not None:
                stats["expected_profit"] += bet["expected_profit"]
                stats["ev_sum"] += bet["ev_percent"]
                stats["clv_bet_count"] += 1
        
        # Calculate derived metrics for EV categories
        for category in ev_quality_stats:
            stats = ev_quality_stats[category]
            if stats["bet_count"] > 0:
                stats["roi"] = (stats["total_profit"] / stats["total_stake"]) * 100 if stats["total_stake"] > 0 else 0
                stats["expected_roi"] = (stats["expected_profit"] / stats["total_stake"]) * 100 if stats["total_stake"] > 0 else 0
                stats["avg_ev"] = (stats["ev_sum"] / stats["clv_bet_count"] * 100) if stats["clv_bet_count"] > 0 else 0
                # Remove temporary fields
                del stats["ev_sum"]
                del stats["clv_bet_count"]
            else:
                stats["roi"] = 0
                stats["expected_roi"] = 0
                stats["avg_ev"] = 0
                # Remove temporary fields
                del stats["ev_sum"]
                del stats["clv_bet_count"]
        
        # Convert dict to list with custom order
        ev_quality_stats_list = [ev_quality_stats[cat] for cat in ["High EV", "Medium EV", "Low EV", "No CLV"] if cat in ev_quality_stats]
        
        # Construct response - enhanced with additional fields for all bets view
        response = {
            "bets": processed_bets,
            "stats": {
                "total_bets": total_bets,
                "winning_bets": len(winning_bets),
                "losing_bets": len(losing_bets),
                "pending_bets": len(pending_bets),
                "push_bets": len(push_bets),  # NEW
                "void_bets": len(void_bets),  # NEW
                "total_stake": total_stake,
                "total_profit": total_profit,
                "expected_profit": expected_profit,
                "roi": roi,
                "expected_roi": expected_roi,
                "win_rate": win_rate,
                "clv_win_rate": clv_win_rate,
                "avg_ev": avg_ev,
                "avg_odds": avg_odds,  # NEW
                "avg_stake": avg_stake,  # NEW
                "valid_clv_bets": len(valid_clv_analyze_bets),
                "total_analyzed_bets": len(analyze_bets)
            },
            "sportsbook_stats": sportsbook_stats_list,
            "sport_stats": sport_stats_list,
            "status_stats": status_stats_list,  # NEW
            "ev_quality_stats": ev_quality_stats_list
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        print(f"Error in all bets history: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
@bp.route("/pikkit/bets")
def get_pikkit_bets():
    """Get Pikkit bets with optional pagination"""
    try:
        # Parse query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        paginate = request.args.get('paginate', 'true').lower() == 'true'
        status = request.args.get('status')
        sportsbook = request.args.get('sportsbook')
        
        # Build the query
        query = PikkitBet.query
        
        # Apply filters if provided
        if status:
            query = query.filter(PikkitBet.status == status)
        if sportsbook:
            query = query.filter(PikkitBet.sportsbook == sportsbook)
        
        # Order by most recent first
        query = query.order_by(PikkitBet.time_placed.desc())
        
        if paginate:
            # Return paginated results
            pagination = query.paginate(page=page, per_page=per_page)
            
            return jsonify({
                "current_page": pagination.page,
                "pages": pagination.pages,
                "total": pagination.total,
                "items": [
                    {
                        "id": b.id,
                        "bet_id": b.bet_id,
                        "event_name": b.event_name,
                        "bet_name": b.bet_name,
                        "sportsbook": b.sportsbook,
                        "bet_type": b.bet_type,
                        "odds": float(b.odds) if b.odds else None,
                        "american_odds": b.american_odds,
                        "closing_line": float(b.closing_line) if b.closing_line else None,
                        "american_closing_line": b.american_closing_line,
                        "clv": b.clv_american,
                        "stake": float(b.stake) if b.stake else 0,
                        "status": b.status,
                        "bet_profit": float(b.bet_profit) if b.bet_profit else 0,
                        "time_placed": b.time_placed.isoformat() if b.time_placed else None,
                        "time_settled": b.time_settled.isoformat() if b.time_settled else None,
                        "sport": b.sport,
                        "league": b.league,
                        "confirmed_settlement": b.confirmed_settlement,
                        "source": "pikkit"
                    }
                    for b in pagination.items
                ]
            })
        else:
            # Return a simple array without pagination
            bets = query.limit(per_page).all()
            
            return jsonify([
                {
                    "id": b.id,
                    "bet_id": b.bet_id,
                    "event_name": b.event_name,
                    "bet_name": b.bet_name,
                    "sportsbook": b.sportsbook,
                    "bet_type": b.bet_type,
                    "odds": b.american_odds,  # Use American odds for consistency
                    "clv": b.clv_american,
                    "stake": float(b.stake) if b.stake else 0,
                    "status": b.status,
                    "bet_profit": float(b.bet_profit) if b.bet_profit else 0,
                    "time_placed": b.time_placed.isoformat() if b.time_placed else None,
                    "sport": b.sport,
                    "league": b.league,
                    "source": "pikkit"
                }
                for b in bets
            ])
    
    except Exception as e:
        print(f"Error retrieving Pikkit bets: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route("/pikkit/import", methods=["POST"])
def import_pikkit_bets():
    """Import Pikkit bets from uploaded CSV"""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400
            
        if file and file.filename.endswith('.csv'):
            filename = secure_filename(file.filename)
            filepath = os.path.join('/tmp', filename)
            file.save(filepath)
            
            # Import the Pikkit bets
            import_pikkit_bets_from_csv(filepath)
            
            # Clean up the temporary file
            os.remove(filepath)
            
            return jsonify({"message": "Pikkit import successful"}), 200
        else:
            return jsonify({"error": "Invalid file type. Please upload a CSV file"}), 400
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route("/pikkit/sync", methods=["POST"])
def sync_pikkit_bets():
    """Sync Pikkit bets from default CSV location"""
    try:
        # Path to your Pikkit import script
        script_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "import_pikkit_csv.py")
        
        # Check if the script exists
        if not os.path.exists(script_path):
            return jsonify({
                "error": f"Pikkit import script not found at {script_path}"
            }), 404
        
        # Run the script in a separate process
        result = subprocess.run(
            [sys.executable, script_path],
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            return jsonify({
                "error": "Error running Pikkit sync script",
                "details": result.stderr
            }), 500
        
        # Return success message with any output from the script
        return jsonify({
            "message": "Pikkit sync completed successfully!",
            "details": result.stdout
        }), 200
    
    except Exception as e:
        # Handle other errors
        return jsonify({
            "error": str(e)
        }), 500

@bp.route("/combined-bets")
def get_combined_bets():
    """
    Get combined bets from both OddsJam and Pikkit sources.
    Uses sportsbook mapping to determine which source takes priority.
    """
    try:
        # Define which sportsbooks are tracked by which system
        PIKKIT_SPORTSBOOKS = {
            'FanDuel', 'DraftKings', 'Draftkings Sportsbook', 'BetMGM', 'Caesars', 
            'BetRivers', 'WynnBET', 'PointsBet', 'FOX Bet', 'Barstool', 
            'Hard Rock', 'TwinSpires', 'Novig', 'ProphetX', 'Sporttrade'
        }
        
        # Parse query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')
        sportsbook = request.args.get('sportsbook')
        
        print(f"[DEBUG] Combined bets request - page: {page}, per_page: {per_page}, status: {status}, sportsbook: {sportsbook}")
        
        combined_bets = []
        
        # Get OddsJam bets (exclude Pikkit-tracked sportsbooks)
        oddsjam_query = Bet.query.filter(~Bet.sportsbook.in_(PIKKIT_SPORTSBOOKS))
        if status:
            oddsjam_query = oddsjam_query.filter(Bet.status == status)
        if sportsbook and sportsbook not in PIKKIT_SPORTSBOOKS:
            oddsjam_query = oddsjam_query.filter(Bet.sportsbook == sportsbook)
        
        oddsjam_bets = oddsjam_query.all()
        print(f"[DEBUG] Found {len(oddsjam_bets)} OddsJam bets")
        
        # Convert OddsJam bets to standardized format
        for bet in oddsjam_bets:
            combined_bets.append({
                "id": f"oddsjam_{bet.id}",
                "original_id": bet.id,
                "event_name": bet.event_name or "",
                "bet_name": bet.bet_name or "",
                "sportsbook": bet.sportsbook or "",
                "bet_type": bet.bet_type or "",
                "odds": bet.odds or 0,
                "clv": bet.clv,
                "stake": float(bet.stake) if bet.stake else 0,
                "status": bet.status or "unknown",
                "bet_profit": float(bet.bet_profit) if bet.bet_profit else 0,
                "event_start_date": bet.event_start_date.isoformat() if bet.event_start_date else None,
                "sport": bet.sport,
                "league": bet.league,
                "source": "oddsjam",
                "confirmed_settlement": bet.confirmed_settlement
            })
        
        # Get Pikkit bets (only Pikkit-tracked sportsbooks)
        pikkit_query = PikkitBet.query.filter(PikkitBet.sportsbook.in_(PIKKIT_SPORTSBOOKS))
        if status:
            pikkit_query = pikkit_query.filter(PikkitBet.status == status)
        if sportsbook and sportsbook in PIKKIT_SPORTSBOOKS:
            pikkit_query = pikkit_query.filter(PikkitBet.sportsbook == sportsbook)
        
        pikkit_bets = pikkit_query.all()
        print(f"[DEBUG] Found {len(pikkit_bets)} Pikkit bets")
        
        # Convert Pikkit bets to standardized format
        for bet in pikkit_bets:
            combined_bets.append({
                "id": f"pikkit_{bet.id}",
                "original_id": bet.id,
                "bet_id": bet.bet_id,
                "event_name": bet.event_name or "",
                "bet_name": bet.bet_name or "",
                "sportsbook": bet.sportsbook or "",
                "bet_type": bet.bet_type or "",
                "odds": bet.american_odds if bet.american_odds else 0,  # Convert to American odds for consistency
                "clv": bet.clv_american,
                "stake": float(bet.stake) if bet.stake else 0,
                "status": bet.status or "unknown",
                "bet_profit": float(bet.bet_profit) if bet.bet_profit else 0,
                "event_start_date": bet.time_placed.isoformat() if bet.time_placed else None,
                "sport": bet.sport,
                "league": bet.league,
                "source": "pikkit",
                "confirmed_settlement": bet.confirmed_settlement
            })
        
        print(f"[DEBUG] Total combined bets before sorting: {len(combined_bets)}")
        
        # Sort combined bets by date (most recent first)
        # Handle None dates by putting them at the end
        def sort_key(bet):
            if bet.get('event_start_date'):
                try:
                    return bet['event_start_date']
                except:
                    return "1900-01-01T00:00:00"  # Very old date for invalid dates
            return "1900-01-01T00:00:00"  # Very old date for None dates
            
        combined_bets.sort(key=sort_key, reverse=True)
        
        # Apply pagination manually
        total = len(combined_bets)
        start = (page - 1) * per_page
        end = start + per_page
        paginated_bets = combined_bets[start:end]
        
        print(f"[DEBUG] Pagination - total: {total}, start: {start}, end: {end}, returned: {len(paginated_bets)}")
        
        # Debug: Print first few bets to see what's being returned
        for i, bet in enumerate(paginated_bets[:3]):
            print(f"[DEBUG] Bet {i}: {bet['source']} - {bet['sportsbook']} - {bet['event_name'][:50]}...")
        
        return jsonify({
            "current_page": page,
            "pages": math.ceil(total / per_page) if total > 0 else 1,
            "total": total,
            "items": paginated_bets,
            "sportsbook_sources": {
                "pikkit": list(PIKKIT_SPORTSBOOKS),
                "oddsjam": "all_others"
            },
            "debug_info": {
                "oddsjam_count": len(oddsjam_bets),
                "pikkit_count": len(pikkit_bets),
                "total_combined": total,
                "page_info": f"Page {page} of {math.ceil(total / per_page) if total > 0 else 1}"
            }
        })
    
    except Exception as e:
        print(f"Error retrieving combined bets: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@bp.route("/sportsbook-mapping")
def get_sportsbook_mapping():
    """Get the mapping of which sportsbooks are tracked by which system"""
    try:
        PIKKIT_SPORTSBOOKS = {
            'FanDuel', 'DraftKings', 'BetMGM', 'Caesars', 'BetRivers', 'WynnBET',
            'PointsBet', 'FOX Bet', 'Barstool', 'Hard Rock', 'TwinSpires',
            'Novig', 'ProphetX', 'Sporttrade'  # Exchanges
        }
        
        # Get all unique sportsbooks from both systems
        oddsjam_sportsbooks = set()
        pikkit_sportsbooks = set()
        
        # Query OddsJam sportsbooks
        oddsjam_result = db.session.query(Bet.sportsbook).distinct().all()
        oddsjam_sportsbooks = {sb[0] for sb in oddsjam_result if sb[0]}
        
        # Query Pikkit sportsbooks
        pikkit_result = db.session.query(PikkitBet.sportsbook).distinct().all()
        pikkit_sportsbooks = {sb[0] for sb in pikkit_result if sb[0]}
        
        return jsonify({
            "pikkit_tracked": list(PIKKIT_SPORTSBOOKS),
            "pikkit_actual": list(pikkit_sportsbooks),
            "oddsjam_sportsbooks": list(oddsjam_sportsbooks),
            "overlap": list(oddsjam_sportsbooks.intersection(pikkit_sportsbooks)),
            "mapping_rules": {
                "pikkit_priority": list(PIKKIT_SPORTSBOOKS),
                "oddsjam_priority": "all_others"
            }
        })
    
    except Exception as e:
        print(f"Error getting sportsbook mapping: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route("/pikkit/stats")
def get_pikkit_stats():
    """Get Pikkit bet statistics"""
    try:
        # Get total counts
        total_bets = PikkitBet.query.count()
        winning_bets = PikkitBet.query.filter(PikkitBet.status == 'won').count()
        losing_bets = PikkitBet.query.filter(PikkitBet.status == 'lost').count()
        pending_bets = PikkitBet.query.filter(PikkitBet.status == 'pending').count()
        
        # Calculate profit stats
        total_profit = db.session.query(func.sum(PikkitBet.bet_profit)).scalar() or 0
        total_stake = db.session.query(func.sum(PikkitBet.stake)).scalar() or 0
        roi = (total_profit / total_stake * 100) if total_stake > 0 else 0
        
        # Win rate
        settled_bets = winning_bets + losing_bets
        win_rate = (winning_bets / settled_bets * 100) if settled_bets > 0 else 0
        
        # Average EV
        avg_ev = db.session.query(func.avg(PikkitBet.ev)).scalar() or 0
        
        # Sportsbook breakdown
        sportsbook_query = db.session.query(
            PikkitBet.sportsbook,
            func.count(PikkitBet.id),
            func.sum(PikkitBet.bet_profit)
        ).group_by(PikkitBet.sportsbook).all()
        
        sportsbooks = [
            {
                "name": name,
                "count": count,
                "profit": float(profit) if profit else 0
            }
            for name, count, profit in sportsbook_query
        ]
        
        return jsonify({
            "total_bets": total_bets,
            "winning_bets": winning_bets,
            "losing_bets": losing_bets,
            "pending_bets": pending_bets,
            "win_rate": win_rate,
            "total_profit": float(total_profit),
            "total_stake": float(total_stake),
            "roi": roi,
            "avg_ev": float(avg_ev),
            "sportsbooks": sportsbooks,
            "source": "pikkit"
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route("/combined-stats")
def get_combined_stats():
    """Get combined statistics from both OddsJam and Pikkit"""
    try:
        PIKKIT_SPORTSBOOKS = {
            'FanDuel', 'DraftKings', 'BetMGM', 'Caesars', 'BetRivers', 'WynnBET',
            'PointsBet', 'FOX Bet', 'Barstool', 'Hard Rock', 'TwinSpires',
            'Novig', 'ProphetX', 'Sporttrade'
        }
        
        # OddsJam stats (excluding Pikkit-tracked sportsbooks)
        oddsjam_total = Bet.query.filter(~Bet.sportsbook.in_(PIKKIT_SPORTSBOOKS)).count()
        oddsjam_winning = Bet.query.filter(
            ~Bet.sportsbook.in_(PIKKIT_SPORTSBOOKS),
            Bet.status == 'won'
        ).count()
        oddsjam_losing = Bet.query.filter(
            ~Bet.sportsbook.in_(PIKKIT_SPORTSBOOKS),
            Bet.status == 'lost'
        ).count()
        oddsjam_pending = Bet.query.filter(
            ~Bet.sportsbook.in_(PIKKIT_SPORTSBOOKS),
            Bet.status == 'pending'
        ).count()
        
        oddsjam_profit = db.session.query(
            func.sum(Bet.bet_profit)
        ).filter(~Bet.sportsbook.in_(PIKKIT_SPORTSBOOKS)).scalar() or 0
        
        oddsjam_stake = db.session.query(
            func.sum(Bet.stake)
        ).filter(~Bet.sportsbook.in_(PIKKIT_SPORTSBOOKS)).scalar() or 0
        
        # Pikkit stats
        pikkit_total = PikkitBet.query.count()
        pikkit_winning = PikkitBet.query.filter(PikkitBet.status == 'won').count()
        pikkit_losing = PikkitBet.query.filter(PikkitBet.status == 'lost').count()
        pikkit_pending = PikkitBet.query.filter(PikkitBet.status == 'pending').count()
        
        pikkit_profit = db.session.query(func.sum(PikkitBet.bet_profit)).scalar() or 0
        pikkit_stake = db.session.query(func.sum(PikkitBet.stake)).scalar() or 0
        
        # Combined totals
        total_bets = oddsjam_total + pikkit_total
        total_winning = oddsjam_winning + pikkit_winning
        total_losing = oddsjam_losing + pikkit_losing
        total_pending = oddsjam_pending + pikkit_pending
        total_profit = float(oddsjam_profit) + float(pikkit_profit)
        total_stake = float(oddsjam_stake) + float(pikkit_stake)
        
        # Calculate combined metrics
        roi = (total_profit / total_stake * 100) if total_stake > 0 else 0
        win_rate = (total_winning / (total_winning + total_losing) * 100) if (total_winning + total_losing) > 0 else 0
        
        return jsonify({
            "combined": {
                "total_bets": total_bets,
                "winning_bets": total_winning,
                "losing_bets": total_losing,
                "pending_bets": total_pending,
                "win_rate": win_rate,
                "total_profit": total_profit,
                "total_stake": total_stake,
                "roi": roi
            },
            "breakdown": {
                "oddsjam": {
                    "total_bets": oddsjam_total,
                    "winning_bets": oddsjam_winning,
                    "losing_bets": oddsjam_losing,
                    "pending_bets": oddsjam_pending,
                    "total_profit": float(oddsjam_profit),
                    "total_stake": float(oddsjam_stake),
                    "roi": (float(oddsjam_profit) / float(oddsjam_stake) * 100) if oddsjam_stake > 0 else 0
                },
                "pikkit": {
                    "total_bets": pikkit_total,
                    "winning_bets": pikkit_winning,
                    "losing_bets": pikkit_losing,
                    "pending_bets": pikkit_pending,
                    "total_profit": float(pikkit_profit),
                    "total_stake": float(pikkit_stake),
                    "roi": (float(pikkit_profit) / float(pikkit_stake) * 100) if pikkit_stake > 0 else 0
                }
            }
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route("/debug/data-sources")
def debug_data_sources():
    """Debug endpoint to check what data we have in each source"""
    try:
        PIKKIT_SPORTSBOOKS = {
            'FanDuel', 'DraftKings', 'Draftkings Sportsbook', 'BetMGM', 'Caesars', 
            'BetRivers', 'WynnBET', 'PointsBet', 'FOX Bet', 'Barstool', 
            'Hard Rock', 'TwinSpires', 'Novig', 'ProphetX', 'Sporttrade'
        }
        
        # Check OddsJam data
        oddsjam_total = Bet.query.count()
        oddsjam_sportsbooks = db.session.query(Bet.sportsbook, func.count(Bet.id)).group_by(Bet.sportsbook).all()
        oddsjam_recent = Bet.query.order_by(Bet.event_start_date.desc()).limit(5).all()
        
        # Check Pikkit data
        pikkit_total = PikkitBet.query.count()
        pikkit_sportsbooks = db.session.query(PikkitBet.sportsbook, func.count(PikkitBet.id)).group_by(PikkitBet.sportsbook).all()
        pikkit_recent = PikkitBet.query.order_by(PikkitBet.time_placed.desc()).limit(5).all()
        
        # Check for overlap
        oddsjam_sb_set = set([sb[0] for sb in oddsjam_sportsbooks])
        pikkit_sb_set = set([sb[0] for sb in pikkit_sportsbooks])
        overlap = oddsjam_sb_set.intersection(pikkit_sb_set)
        
        return jsonify({
            "oddsjam": {
                "total_bets": oddsjam_total,
                "sportsbooks": dict(oddsjam_sportsbooks),
                "recent_bets": [
                    {
                        "id": bet.id,
                        "sportsbook": bet.sportsbook,
                        "event_name": bet.event_name[:50] if bet.event_name else "",
                        "date": bet.event_start_date.isoformat() if bet.event_start_date else None
                    }
                    for bet in oddsjam_recent
                ]
            },
            "pikkit": {
                "total_bets": pikkit_total,
                "sportsbooks": dict(pikkit_sportsbooks),
                "recent_bets": [
                    {
                        "id": bet.id,
                        "bet_id": bet.bet_id,
                        "sportsbook": bet.sportsbook,
                        "event_name": bet.event_name[:50] if bet.event_name else "",
                        "date": bet.time_placed.isoformat() if bet.time_placed else None
                    }
                    for bet in pikkit_recent
                ]
            },
            "mapping": {
                "pikkit_configured": list(PIKKIT_SPORTSBOOKS),
                "overlap_detected": list(overlap),
                "oddsjam_exclusive": list(oddsjam_sb_set - PIKKIT_SPORTSBOOKS),
                "pikkit_exclusive": list(pikkit_sb_set.intersection(PIKKIT_SPORTSBOOKS))
            }
        })
        
    except Exception as e:
        print(f"Error in debug endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
@bp.route("/unified-bets")
def get_unified_bets():
    """
    Get unified bets from both OddsJam and Pikkit using smart source prioritization.
    This endpoint uses the UnifiedBetMapper to create consistent data structure.
    """
    try:
        # Parse query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')
        sportsbook = request.args.get('sportsbook')
        source_filter = request.args.get('source')  # 'oddsjam', 'pikkit', or 'all'
        
        print(f"[DEBUG] Unified bets request - page: {page}, per_page: {per_page}, status: {status}, sportsbook: {sportsbook}")
        
        unified_bets = []
        mapper = UnifiedBetMapper()
        
        # Define precise sportsbook mapping based on your specifications
        PIKKIT_BOOKS = {
            'BetMGM', 'Caesars Sportsbook', 'Caesars', 'Draftkings Sportsbook', 'DraftKings',
            'ESPN BET', 'ESPNBet', 'Fanatics', 'Fanduel Sportsbook', 'FanDuel', 
            'Fliff', 'Novig', 'Onyx', 'Onyx Odds', 'PrizePicks', 'ProphetX', 
            'Prophet X', 'Rebet', 'Thrillzz', 'Underdog Fantasy'
        }
        
        ODDSJAM_BOOKS = {
            'BetNow', 'BetOnline', 'BetUS', 'BookMaker', 'Bovada', 
            'Everygame', 'MyBookie', 'Sportzino', 'Xbet', 'bet105', 'betwhale'
        }
        
        # Determine which sportsbooks to query from each source
        if sportsbook and sportsbook != "all":
            # Specific sportsbook requested - use manual mapping
            if sportsbook in PIKKIT_BOOKS and (not source_filter or source_filter == 'pikkit'):
                # Query Pikkit for this sportsbook
                pikkit_query = PikkitBet.query.filter(PikkitBet.sportsbook == sportsbook)
                if status:
                    normalized_status = mapper._normalize_status(status)
                    # Convert back to Pikkit format for query
                    pikkit_status_map = {'won': 'SETTLED_WIN', 'lost': 'SETTLED_LOSS', 'pending': 'PENDING'}
                    pikkit_status = pikkit_status_map.get(normalized_status, status)
                    pikkit_query = pikkit_query.filter(PikkitBet.status == pikkit_status)
                
                pikkit_bets = pikkit_query.all()
                
                for bet in pikkit_bets:
                    unified_bet = mapper.map_pikkit_to_unified({
                        'id': bet.id,
                        'bet_id': bet.bet_id,
                        'sportsbook': bet.sportsbook,
                        'type': bet.bet_type,
                        'status': bet.status,
                        'odds': float(bet.odds) if bet.odds else 0,
                        'closing_line': float(bet.closing_line) if bet.closing_line else 0,
                        'amount': float(bet.stake) if bet.stake else 0,
                        'profit': float(bet.bet_profit) if bet.bet_profit else 0,
                        'bet_info': bet.bet_info,
                        'sports': bet.sport,
                        'leagues': bet.league,
                        'tags': bet.tags,
                        'time_placed': bet.time_placed.strftime('%m/%d/%Y %H:%M:%S GMT') if bet.time_placed else None,
                        'time_settled': bet.time_settled.strftime('%m/%d/%Y %H:%M:%S GMT') if bet.time_settled else None,
                    })
                    unified_bets.append(unified_bet)
                    
            elif sportsbook in ODDSJAM_BOOKS and (not source_filter or source_filter == 'oddsjam'):
                # Query OddsJam for this sportsbook
                oddsjam_query = Bet.query.filter(Bet.sportsbook == sportsbook)
                if status:
                    oddsjam_query = oddsjam_query.filter(Bet.status == status)
                
                oddsjam_bets = oddsjam_query.all()
                
                for bet in oddsjam_bets:
                    unified_bet = mapper.map_oddsjam_to_unified({
                        'id': bet.id,
                        'sportsbook': bet.sportsbook,
                        'sport': bet.sport,
                        'league': bet.league,
                        'event_name': bet.event_name,
                        'market_name': bet.market_name,
                        'bet_name': bet.bet_name,
                        'odds': bet.odds,
                        'clv': bet.clv,
                        'stake': float(bet.stake) if bet.stake else 0,
                        'bet_profit': float(bet.bet_profit) if bet.bet_profit else 0,
                        'status': bet.status,
                        'bet_type': bet.bet_type,
                        'tags': bet.tags,
                        'created_at': bet.created_at.strftime('%m/%d/%Y, %H:%M EDT') if bet.created_at else None,
                        'event_start_date': bet.event_start_date.strftime('%m/%d/%Y, %H:%M EDT') if bet.event_start_date else None,
                        'potential_payout': float(bet.potential_payout) if bet.potential_payout else None,
                        'is_live_bet': bet.is_live_bet,
                        'is_free_bet': bet.is_free_bet,
                        'is_odds_boost': bet.is_odds_boost,
                    })
                    unified_bets.append(unified_bet)
        else:
            # Get all bets using source prioritization
            
            # Get Pikkit bets (for manually specified sportsbooks)
            if not source_filter or source_filter == 'pikkit':
                pikkit_query = PikkitBet.query.filter(PikkitBet.sportsbook.in_(PIKKIT_BOOKS))
                if status:
                    normalized_status = mapper._normalize_status(status)
                    pikkit_status_map = {'won': 'SETTLED_WIN', 'lost': 'SETTLED_LOSS', 'pending': 'PENDING'}
                    pikkit_status = pikkit_status_map.get(normalized_status, status)
                    pikkit_query = pikkit_query.filter(PikkitBet.status == pikkit_status)
                
                pikkit_bets = pikkit_query.all()
                
                for bet in pikkit_bets:
                    unified_bet = mapper.map_pikkit_to_unified({
                        'id': bet.id,
                        'bet_id': bet.bet_id,
                        'sportsbook': bet.sportsbook,
                        'type': bet.bet_type,
                        'status': bet.status,
                        'odds': float(bet.odds) if bet.odds else 0,
                        'closing_line': float(bet.closing_line) if bet.closing_line else 0,
                        'amount': float(bet.stake) if bet.stake else 0,
                        'profit': float(bet.bet_profit) if bet.bet_profit else 0,
                        'bet_info': bet.bet_info,
                        'sports': bet.sport,
                        'leagues': bet.league,
                        'tags': bet.tags,
                        'time_placed': bet.time_placed.strftime('%m/%d/%Y %H:%M:%S GMT') if bet.time_placed else None,
                        'time_settled': bet.time_settled.strftime('%m/%d/%Y %H:%M:%S GMT') if bet.time_settled else None,
                    })
                    unified_bets.append(unified_bet)
            
            # Get OddsJam bets (for manually specified sportsbooks)
            if not source_filter or source_filter == 'oddsjam':
                oddsjam_query = Bet.query.filter(Bet.sportsbook.in_(ODDSJAM_BOOKS))
                if status:
                    oddsjam_query = oddsjam_query.filter(Bet.status == status)
                
                oddsjam_bets = oddsjam_query.all()
                
                for bet in oddsjam_bets:
                    unified_bet = mapper.map_oddsjam_to_unified({
                        'id': bet.id,
                        'sportsbook': bet.sportsbook,
                        'sport': bet.sport,
                        'league': bet.league,
                        'event_name': bet.event_name,
                        'market_name': bet.market_name,
                        'bet_name': bet.bet_name,
                        'odds': bet.odds,
                        'clv': bet.clv,
                        'stake': float(bet.stake) if bet.stake else 0,
                        'bet_profit': float(bet.bet_profit) if bet.bet_profit else 0,
                        'status': bet.status,
                        'bet_type': bet.bet_type,
                        'tags': bet.tags,
                        'created_at': bet.created_at.strftime('%m/%d/%Y, %H:%M EDT') if bet.created_at else None,
                        'event_start_date': bet.event_start_date.strftime('%m/%d/%Y, %H:%M EDT') if bet.event_start_date else None,
                        'potential_payout': float(bet.potential_payout) if bet.potential_payout else None,
                        'is_live_bet': bet.is_live_bet,
                        'is_free_bet': bet.is_free_bet,
                        'is_odds_boost': bet.is_odds_boost,
                    })
                    unified_bets.append(unified_bet)
        
        print(f"[DEBUG] Total unified bets before sorting: {len(unified_bets)}")
        
        # Sort by time_placed (most recent first)
        def sort_key(bet):
            if bet.get('time_placed'):
                try:
                    return bet['time_placed']
                except:
                    return "1900-01-01 00:00:00"
            return "1900-01-01 00:00:00"
        
        unified_bets.sort(key=sort_key, reverse=True)
        
        # Apply pagination
        total = len(unified_bets)
        start = (page - 1) * per_page
        end = start + per_page
        paginated_bets = unified_bets[start:end]
        
        print(f"[DEBUG] Pagination - total: {total}, start: {start}, end: {end}, returned: {len(paginated_bets)}")
        
        return jsonify({
            "current_page": page,
            "pages": math.ceil(total / per_page) if total > 0 else 1,
            "total": total,
            "items": paginated_bets,
            "mapping_info": {
                "pikkit_sportsbooks": list(PIKKIT_BOOKS),
                "oddsjam_sportsbooks": list(ODDSJAM_BOOKS),
                "prioritization": "manual_mapping_based_on_specifications"
            },
            "unified_fields": {
                "description": "All bets use consistent field structure",
                "key_fields": [
                    "source", "sportsbook", "bet_type", "status", "odds", "clv",
                    "stake", "bet_profit", "sport", "league", "bet_info",
                    "event_name", "bet_name", "market_name", "time_placed"
                ]
            }
        })
    
    except Exception as e:
        print(f"Error retrieving unified bets: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@bp.route("/unified-stats")
def get_unified_stats():
    """Get unified statistics across both data sources."""
    try:
        mapper = UnifiedBetMapper()
        
        # Get Pikkit stats
        pikkit_bets = PikkitBet.query.all()
        pikkit_unified = []
        
        for bet in pikkit_bets:
            unified_bet = mapper.map_pikkit_to_unified({
                'id': bet.id,
                'bet_id': bet.bet_id,
                'sportsbook': bet.sportsbook,
                'type': bet.bet_type,
                'status': bet.status,
                'odds': float(bet.odds) if bet.odds else 0,
                'amount': float(bet.stake) if bet.stake else 0,
                'profit': float(bet.bet_profit) if bet.bet_profit else 0,
                'sports': bet.sport,
                'leagues': bet.league,
            })
            pikkit_unified.append(unified_bet)
        
        # Get OddsJam stats (excluding Pikkit sportsbooks)
        oddsjam_bets = Bet.query.filter(~Bet.sportsbook.in_(mapper.PIKKIT_SPORTSBOOKS)).all()
        oddsjam_unified = []
        
        for bet in oddsjam_bets:
            unified_bet = mapper.map_oddsjam_to_unified({
                'id': bet.id,
                'sportsbook': bet.sportsbook,
                'status': bet.status,
                'stake': float(bet.stake) if bet.stake else 0,
                'bet_profit': float(bet.bet_profit) if bet.bet_profit else 0,
                'sport': bet.sport,
                'league': bet.league,
            })
            oddsjam_unified.append(unified_bet)
        
        # Combine and calculate unified stats
        all_unified_bets = pikkit_unified + oddsjam_unified
        
        # Calculate combined metrics
        total_bets = len(all_unified_bets)
        total_stake = sum(bet['stake'] for bet in all_unified_bets)
        total_profit = sum(bet['bet_profit'] for bet in all_unified_bets)
        
        winning_bets = len([bet for bet in all_unified_bets if bet['status'] == 'won'])
        losing_bets = len([bet for bet in all_unified_bets if bet['status'] == 'lost'])
        pending_bets = len([bet for bet in all_unified_bets if bet['status'] == 'pending'])
        
        # Calculate rates
        roi = (total_profit / total_stake * 100) if total_stake > 0 else 0
        win_rate = (winning_bets / (winning_bets + losing_bets) * 100) if (winning_bets + losing_bets) > 0 else 0
        
        # Sportsbook breakdown
        sportsbook_stats = {}
        for bet in all_unified_bets:
            sb = bet['sportsbook']
            if sb not in sportsbook_stats:
                sportsbook_stats[sb] = {
                    'name': sb,
                    'source': bet['source'],
                    'bet_count': 0,
                    'total_stake': 0,
                    'total_profit': 0
                }
            
            sportsbook_stats[sb]['bet_count'] += 1
            sportsbook_stats[sb]['total_stake'] += bet['stake']
            sportsbook_stats[sb]['total_profit'] += bet['bet_profit']
        
        # Calculate ROI for each sportsbook
        for sb_data in sportsbook_stats.values():
            sb_data['roi'] = (sb_data['total_profit'] / sb_data['total_stake'] * 100) if sb_data['total_stake'] > 0 else 0
        
        sportsbook_list = list(sportsbook_stats.values())
        sportsbook_list.sort(key=lambda x: x['total_profit'], reverse=True)
        
        return jsonify({
            "unified_stats": {
                "total_bets": total_bets,
                "winning_bets": winning_bets,
                "losing_bets": losing_bets,
                "pending_bets": pending_bets,
                "total_stake": total_stake,
                "total_profit": total_profit,
                "roi": roi,
                "win_rate": win_rate
            },
            "source_breakdown": {
                "pikkit": {
                    "bet_count": len(pikkit_unified),
                    "sportsbooks_tracked": len(set(bet['sportsbook'] for bet in pikkit_unified))
                },
                "oddsjam": {
                    "bet_count": len(oddsjam_unified),
                    "sportsbooks_tracked": len(set(bet['sportsbook'] for bet in oddsjam_unified))
                }
            },
            "sportsbook_stats": sportsbook_list,
            "mapping_rules": {
                "pikkit_priority": list(mapper.PIKKIT_SPORTSBOOKS),
                "oddsjam_priority": "all_others"
            }
        })
    
    except Exception as e:
        print(f"Error calculating unified stats: {str(e)}")
        return jsonify({"error": str(e)}), 500