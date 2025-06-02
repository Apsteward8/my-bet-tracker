# backend/routes/unified_bets.py
from flask import Blueprint, jsonify, request
from models import db  # Use the same db instance as main app
from datetime import datetime, timedelta
from sqlalchemy import func, text
import math

bp = Blueprint("unified_bets", __name__, url_prefix="/api/unified")

def check_unified_table_exists():
    """Check if unified_bets table exists"""
    try:
        result = db.session.execute(text("""
            SELECT COUNT(*) 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'unified_bets'
        """))
        return result.scalar() > 0
    except Exception:
        return False

@bp.route("/unverified-bets")
def get_unverified_bets():
    """Get settled bets that need manual verification (for confirmation page)"""
    try:
        # Check if unified table exists
        if not check_unified_table_exists():
            return jsonify({
                "error": "Unified table not found. Please run the unified migration first.",
                "items": [],
                "total": 0,
                "pages": 0,
                "current_page": 1
            }), 404
        
        # Parse query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        sportsbook = request.args.get('sportsbook')
        status = request.args.get('status')
        
        # Build base query for unverified settled OddsJam bets
        base_query = """
            SELECT id, original_bet_id, sportsbook, status, odds, stake, bet_profit, 
                   time_settled, bet_info, sport, league, verified, source, bet_type
            FROM unified_bets 
            WHERE source = 'oddsjam' 
              AND verified = FALSE 
              AND status IN ('won', 'lost', 'refunded')
        """
        
        count_query = """
            SELECT COUNT(*) 
            FROM unified_bets 
            WHERE source = 'oddsjam' 
              AND verified = FALSE 
              AND status IN ('won', 'lost', 'refunded')
        """
        
        # Add filters
        filter_conditions = []
        filter_params = {}
        
        if sportsbook:
            filter_conditions.append("AND sportsbook = :sportsbook")
            filter_params['sportsbook'] = sportsbook
            
        if status:
            filter_conditions.append("AND status = :status")
            filter_params['status'] = status
        
        filter_clause = " ".join(filter_conditions)
        
        # Get total count
        total_query = count_query + " " + filter_clause
        total_result = db.session.execute(text(total_query), filter_params)
        total = total_result.scalar()
        
        # Calculate pagination
        total_pages = math.ceil(total / per_page) if total > 0 else 1
        offset = (page - 1) * per_page
        
        # Get paginated results
        data_query = base_query + " " + filter_clause + " ORDER BY time_settled DESC LIMIT :limit OFFSET :offset"
        filter_params.update({'limit': per_page, 'offset': offset})
        
        result = db.session.execute(text(data_query), filter_params)
        rows = result.fetchall()
        
        # Format results
        items = []
        for row in rows:
            items.append({
                "id": row[0],
                "original_bet_id": row[1],
                "sportsbook": row[2],
                "status": row[3],
                "odds": row[4],
                "stake": float(row[5]) if row[5] else 0,
                "bet_profit": float(row[6]) if row[6] else 0,
                "time_settled": row[7].isoformat() if row[7] else None,
                "bet_info": row[8],
                "sport": row[9],
                "league": row[10],
                "verified": bool(row[11]),
                "source": row[12],
                "bet_type": row[13]
            })
        
        return jsonify({
            "current_page": page,
            "pages": total_pages,
            "total": total,
            "items": items,
            "verification_info": {
                "description": "These OddsJam bets have been settled but not manually verified",
                "action_needed": "Check each bet against sportsbook records and mark as verified",
                "auto_verified": "Pikkit bets are automatically verified and don't appear here"
            }
        })
    
    except Exception as e:
        print(f"Error retrieving unverified bets: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@bp.route("/verify-bet/<int:bet_id>", methods=["PUT"])
def verify_bet(bet_id):
    """Mark a bet as verified after manual confirmation"""
    try:
        if not check_unified_table_exists():
            return jsonify({"error": "Unified table not found"}), 404
        
        # Get bet info
        result = db.session.execute(text("""
            SELECT source, verified 
            FROM unified_bets 
            WHERE id = :bet_id
        """), {"bet_id": bet_id})
        
        bet_row = result.fetchone()
        if not bet_row:
            return jsonify({"error": "Bet not found"}), 404
        
        source, verified = bet_row
        
        # Verify it's an OddsJam bet
        if source != 'oddsjam':
            return jsonify({
                "error": "Only OddsJam bets can be manually verified. Pikkit bets are auto-verified."
            }), 400
        
        # Check if already verified
        if verified:
            return jsonify({
                "message": "Bet is already verified",
                "bet_id": bet_id,
                "verified": True
            }), 200
        
        # Mark as verified
        db.session.execute(text("""
            UPDATE unified_bets 
            SET verified = TRUE, updated_at_db = CURRENT_TIMESTAMP 
            WHERE id = :bet_id
        """), {"bet_id": bet_id})
        
        db.session.commit()
        
        return jsonify({
            "message": "Bet successfully verified",
            "bet_id": bet_id,
            "verified": True,
            "verified_at": datetime.now().isoformat()
        }), 200
    
    except Exception as e:
        db.session.rollback()
        print(f"Error verifying bet {bet_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route("/verify-multiple", methods=["PUT"])
def verify_multiple_bets():
    """Mark multiple bets as verified (for bulk confirmation)"""
    try:
        if not check_unified_table_exists():
            return jsonify({"error": "Unified table not found"}), 404
        
        data = request.get_json()
        bet_ids = data.get('bet_ids', [])
        
        if not bet_ids:
            return jsonify({"error": "No bet IDs provided"}), 400
        
        if len(bet_ids) > 100:
            return jsonify({"error": "Maximum 100 bets can be verified at once"}), 400
        
        # Convert to comma-separated string for SQL IN clause
        id_placeholders = ','.join([':id' + str(i) for i in range(len(bet_ids))])
        id_params = {f'id{i}': bet_id for i, bet_id in enumerate(bet_ids)}
        
        # Get eligible bets
        result = db.session.execute(text(f"""
            SELECT id 
            FROM unified_bets 
            WHERE id IN ({id_placeholders})
              AND source = 'oddsjam' 
              AND verified = FALSE
        """), id_params)
        
        eligible_ids = [row[0] for row in result.fetchall()]
        
        if not eligible_ids:
            return jsonify({
                "error": "No unverified OddsJam bets found with provided IDs"
            }), 404
        
        # Update all eligible bets
        eligible_placeholders = ','.join([':eid' + str(i) for i in range(len(eligible_ids))])
        eligible_params = {f'eid{i}': bet_id for i, bet_id in enumerate(eligible_ids)}
        
        db.session.execute(text(f"""
            UPDATE unified_bets 
            SET verified = TRUE, updated_at_db = CURRENT_TIMESTAMP 
            WHERE id IN ({eligible_placeholders})
        """), eligible_params)
        
        db.session.commit()
        
        return jsonify({
            "message": f"Successfully verified {len(eligible_ids)} bets",
            "verified_count": len(eligible_ids),
            "verified_bet_ids": eligible_ids,
            "verified_at": datetime.now().isoformat()
        }), 200
    
    except Exception as e:
        db.session.rollback()
        print(f"Error verifying multiple bets: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route("/verification-stats")
def get_verification_stats():
    """Get verification statistics for dashboard"""
    try:
        if not check_unified_table_exists():
            return jsonify({
                "error": "Unified table not found",
                "overall_stats": {"total_bets": 0, "verified_bets": 0, "unverified_bets": 0}
            }), 404
        
        # Overall verification stats
        stats_result = db.session.execute(text("""
            SELECT 
                COUNT(*) as total_bets,
                SUM(CASE WHEN verified = TRUE THEN 1 ELSE 0 END) as verified_bets,
                SUM(CASE WHEN verified = FALSE THEN 1 ELSE 0 END) as unverified_bets
            FROM unified_bets
        """))
        
        total_bets, verified_bets, unverified_bets = stats_result.fetchone()
        
        # Unverified settled bets (the ones that need attention)
        unverified_settled_result = db.session.execute(text("""
            SELECT COUNT(*) 
            FROM unified_bets 
            WHERE verified = FALSE 
              AND status IN ('won', 'lost', 'refunded')
              AND source = 'oddsjam'
        """))
        
        unverified_settled = unverified_settled_result.scalar()
        
        # Source breakdown
        source_result = db.session.execute(text("""
            SELECT 
                source,
                COUNT(*) as total,
                SUM(CASE WHEN verified = TRUE THEN 1 ELSE 0 END) as verified
            FROM unified_bets 
            GROUP BY source
        """))
        
        source_breakdown = {}
        for row in source_result.fetchall():
            source, total, verified = row
            source_breakdown[source] = {
                "total_bets": total,
                "verified_bets": int(verified) if verified else 0,
                "unverified_bets": total - (int(verified) if verified else 0),
                "verification_rate": (int(verified) / total * 100) if total > 0 and verified else 0
            }
        
        return jsonify({
            "overall_stats": {
                "total_bets": total_bets,
                "verified_bets": verified_bets,
                "unverified_bets": unverified_bets,
                "verification_rate": (verified_bets / total_bets * 100) if total_bets > 0 else 0
            },
            "action_needed": {
                "unverified_settled_bets": unverified_settled,
                "description": "OddsJam bets that are settled but not manually verified"
            },
            "source_breakdown": source_breakdown,
            "system_info": {
                "auto_verified_sources": ["pikkit"],
                "manual_verification_sources": ["oddsjam"],
                "reason": "Pikkit data comes directly from sportsbooks, OddsJam requires manual verification"
            }
        })
    
    except Exception as e:
        print(f"Error getting verification stats: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route("/sync", methods=["POST"])
def sync_unified_data():
    """Sync data from both CSV sources into unified table"""
    import subprocess
    import sys
    import os
    
    try:
        if not check_unified_table_exists():
            return jsonify({
                "overall_success": False,
                "error": "Unified table not found. Please create it first.",
                "message": "Run: python simple_create_unified_table.py"
            }), 404
        
        # Path to improved unified import script
        script_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "import_unified.py")
        
        # Fallback to original script if improved version doesn't exist
        if not os.path.exists(script_path):
            script_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "import_unified.py")
        
        if not os.path.exists(script_path):
            return jsonify({
                "overall_success": False,
                "error": f"No unified import script found. Tried: import_unified.py, import_unified.py",
                "message": "Please ensure import script exists in backend directory"
            }), 404
        
        print(f"[SYNC] Running unified import script: {script_path}")
        
        # Run the unified import script
        result = subprocess.run(
            [sys.executable, script_path],
            capture_output=True,
            text=True,
            timeout=600,  # 10 minute timeout
            cwd=os.path.dirname(script_path)  # Set working directory
        )
        
        # Determine success based on return code
        success = result.returncode == 0
        
        # Parse output for more detailed info
        stdout_lines = result.stdout.split('\n') if result.stdout else []
        stderr_lines = result.stderr.split('\n') if result.stderr else []
        
        # Look for summary information in stdout
        summary_info = {
            "sources_processed": ["oddsjam", "pikkit"],
            "import_success": success,
            "table": "unified_bets"
        }
        
        # Try to extract counts from output
        for line in stdout_lines:
            if "new bets" in line and "updated" in line:
                summary_info["import_details"] = line.strip()
                break
        
        # Prepare response
        response_data = {
            "overall_success": success,
            "message": "Unified sync completed" + (" successfully!" if success else " with errors"),
            "details": {
                "unified_import": {
                    "name": "Unified Import (OddsJam + Pikkit)",
                    "success": success,
                    "stdout": result.stdout[-2000:] if result.stdout else "",  # Last 2000 chars
                    "stderr": result.stderr[-1000:] if result.stderr else "",   # Last 1000 chars
                    "returncode": result.returncode
                }
            },
            "summary": summary_info
        }
        
        # Return appropriate status code
        if success:
            return jsonify(response_data), 200
        else:
            return jsonify(response_data), 500
    
    except subprocess.TimeoutExpired:
        return jsonify({
            "overall_success": False,
            "error": "Sync operation timed out after 10 minutes",
            "message": "Import process took too long and was cancelled. Try with smaller datasets or check for issues.",
            "details": {
                "unified_import": {
                    "name": "Unified Import",
                    "success": False,
                    "stdout": "",
                    "stderr": "Process timed out",
                    "returncode": -1
                }
            },
            "summary": {
                "import_success": False,
                "sources_processed": ["oddsjam", "pikkit"],
                "table": "unified_bets"
            }
        }), 408
    
    except Exception as e:
        print(f"[SYNC] Error during unified sync: {str(e)}")
        return jsonify({
            "overall_success": False,
            "error": str(e),
            "message": "Error during unified sync operation",
            "details": {
                "unified_import": {
                    "name": "Unified Import",
                    "success": False,
                    "stdout": "",
                    "stderr": str(e),
                    "returncode": -1
                }
            },
            "summary": {
                "import_success": False,
                "sources_processed": ["oddsjam", "pikkit"],
                "table": "unified_bets"
            }
        }), 500

@bp.route("/import", methods=["POST"])
def import_unified_file():
    """Import data from uploaded files to unified table"""
    try:
        if not check_unified_table_exists():
            return jsonify({
                "error": "Unified table not found. Please create it first."
            }), 404
        
        # This endpoint can be used for manual file uploads
        # For now, we'll just run the same import process
        return sync_unified_data()
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route("/stats")
def get_unified_stats():
    """Get comprehensive statistics from unified table"""
    try:
        if not check_unified_table_exists():
            return jsonify({
                "error": "Unified table not found",
                "overall_stats": {"total_bets": 0}
            }), 404
        
        # Overall stats
        stats_result = db.session.execute(text("""
            SELECT 
                COUNT(*) as total_bets,
                SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as winning_bets,
                SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as losing_bets,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_bets,
                SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) as refunded_bets,
                SUM(bet_profit) as total_profit,
                SUM(stake) as total_stake
            FROM unified_bets
        """))
        
        stats_row = stats_result.fetchone()
        total_bets, winning_bets, losing_bets, pending_bets, refunded_bets, total_profit, total_stake = stats_row
        
        # Calculate derived metrics
        roi = (float(total_profit) / float(total_stake) * 100) if total_stake and total_stake > 0 else 0
        decisive_bets = winning_bets + losing_bets
        win_rate = (winning_bets / decisive_bets * 100) if decisive_bets > 0 else 0
        
        # Source breakdown
        source_result = db.session.execute(text("""
            SELECT 
                source,
                COUNT(*) as count,
                SUM(bet_profit) as profit,
                SUM(stake) as stake
            FROM unified_bets 
            GROUP BY source
        """))
        
        source_breakdown = {}
        for row in source_result.fetchall():
            source, count, profit, stake = row
            source_breakdown[source] = {
                "bet_count": count,
                "total_profit": float(profit) if profit else 0,
                "total_stake": float(stake) if stake else 0,
                "roi": (float(profit) / float(stake) * 100) if stake and stake > 0 else 0
            }
        
        # Sportsbook breakdown (top 10)
        sportsbook_result = db.session.execute(text("""
            SELECT 
                sportsbook,
                source,
                COUNT(*) as count,
                SUM(bet_profit) as profit,
                SUM(stake) as stake
            FROM unified_bets 
            GROUP BY sportsbook, source
            ORDER BY SUM(bet_profit) DESC
            LIMIT 10
        """))
        
        sportsbooks = []
        for row in sportsbook_result.fetchall():
            sb, source, count, profit, stake = row
            sportsbooks.append({
                "name": sb,
                "source": source,
                "bet_count": count,
                "total_profit": float(profit) if profit else 0,
                "total_stake": float(stake) if stake else 0,
                "roi": (float(profit) / float(stake) * 100) if stake and stake > 0 else 0
            })
        
        return jsonify({
            "overall_stats": {
                "total_bets": total_bets,
                "winning_bets": winning_bets,
                "losing_bets": losing_bets,
                "pending_bets": pending_bets,
                "refunded_bets": refunded_bets,
                "total_profit": float(total_profit) if total_profit else 0,
                "total_stake": float(total_stake) if total_stake else 0,
                "roi": roi,
                "win_rate": win_rate
            },
            "source_breakdown": source_breakdown,
            "sportsbook_stats": sportsbooks,
            "unified_info": {
                "description": "Statistics from unified bet table",
                "sources": ["oddsjam", "pikkit"],
                "smart_prioritization": "Pikkit for regulated US books, OddsJam for offshore"
            }
        })
    
    except Exception as e:
        print(f"Error getting unified stats: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route("/test")
def test_unified_routes():
    """Test endpoint to verify unified routes are working"""
    return jsonify({
        "message": "Unified routes are working!",
        "timestamp": datetime.now().isoformat(),
        "table_exists": check_unified_table_exists(),
        "available_endpoints": [
            "GET /api/unified/test",
            "GET /api/unified/stats", 
            "GET /api/unified/unverified-bets",
            "PUT /api/unified/verify-bet/<id>",
            "PUT /api/unified/verify-multiple",
            "POST /api/unified/sync"
        ]
    })

# Add these routes to backend/routes/unified_bets.py

@bp.route("/calendar-month", methods=["GET"])
def get_unified_calendar_month():
    """
    Get calendar data for a specific month from unified table.
    
    IMPORTANT: Uses time_settled for ALL bets (both settled and pending) because:
    - For OddsJam: time_settled = event_start_date (when the game happens)
    - For Pikkit: time_settled = actual settlement date (close to event date)
    - This ensures bets appear on their event date, not placement date
    
    Example: A bet placed today for next week's game will appear on next week, not today.
    """
    try:
        if not check_unified_table_exists():
            return jsonify({"error": "Unified table not found"}), 404
        
        # Parse query parameters
        year = request.args.get('year', datetime.now().year, type=int)
        month = request.args.get('month', datetime.now().month, type=int)
        
        print(f"[DEBUG] Getting unified calendar data for {year}-{month}")
        
        # Get first and last day of the month
        first_day = datetime(year, month, 1).date()
        if month == 12:
            last_day = datetime(year + 1, 1, 1).date() - timedelta(days=1)
        else:
            last_day = datetime(year, month + 1, 1).date() - timedelta(days=1)
        
        # For calendar display, we should use time_settled for ALL bets because:
        # - For OddsJam: time_settled = event_start_date (when game happens)
        # - For Pikkit: time_settled = actual settlement date (close to event date)
        # - For pending bets: time_settled shows when the event will happen
        
        # Get ALL bets (settled + pending) grouped by event/settlement date
        all_bets_query = text("""
            SELECT 
                DATE(time_settled) as bet_date,
                COUNT(*) as total_count,
                SUM(stake) as total_stake,
                SUM(CASE WHEN status IN ('won', 'lost', 'refunded') THEN 1 ELSE 0 END) as settled_count,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
                SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won_count,
                SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as lost_count,
                SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) as push_count,
                SUM(CASE WHEN status IN ('won', 'lost', 'refunded') THEN bet_profit ELSE 0 END) as total_profit
            FROM unified_bets 
            WHERE time_settled IS NOT NULL
              AND DATE(time_settled) >= :first_day
              AND DATE(time_settled) <= :last_day
            GROUP BY DATE(time_settled)
        """)
        
        result = db.session.execute(all_bets_query, {
            'first_day': first_day,
            'last_day': last_day
        })
        
        # Process the combined data
        calendar_data = {}
        for row in result.fetchall():
            date_str = row[0].isoformat()
            calendar_data[date_str] = {
                'date': date_str,
                'bet_count': row[1],          # total_count
                'total_stake': float(row[2]) if row[2] else 0,  # total_stake
                'settled_count': row[3],      # settled_count
                'pending_count': row[4],      # pending_count
                'won_count': row[5],          # won_count
                'lost_count': row[6],         # lost_count
                'push_count': row[7],         # push_count
                'profit': float(row[8]) if row[8] else 0,  # total_profit
            }
        
        # Fallback: Check for any bets that only have time_placed (edge case)
        fallback_query = text("""
            SELECT 
                DATE(time_placed) as bet_date,
                COUNT(*) as total_count,
                SUM(stake) as total_stake
            FROM unified_bets 
            WHERE time_settled IS NULL
              AND time_placed IS NOT NULL
              AND DATE(time_placed) >= :first_day
              AND DATE(time_placed) <= :last_day
            GROUP BY DATE(time_placed)
        """)
        
        fallback_result = db.session.execute(fallback_query, {
            'first_day': first_day,
            'last_day': last_day
        })
        
        # Add fallback data (these will show as pending with no profit)
        for row in fallback_result.fetchall():
            date_str = row[0].isoformat()
            if date_str not in calendar_data:
                calendar_data[date_str] = {
                    'date': date_str,
                    'bet_count': row[1],
                    'total_stake': float(row[2]) if row[2] else 0,
                    'settled_count': 0,
                    'pending_count': row[1],  # Assume all are pending if no time_settled
                    'won_count': 0,
                    'lost_count': 0,
                    'push_count': 0,
                    'profit': 0,
                }
        
        # Convert to list and sort
        calendar_list = list(calendar_data.values())
        calendar_list.sort(key=lambda x: x['date'])
        
        # Calculate month summary
        month_summary = {
            'total_profit': sum(day['profit'] for day in calendar_list),
            'total_bets': sum(day['bet_count'] for day in calendar_list),
            'settled_bets': sum(day['settled_count'] for day in calendar_list),
            'pending_bets': sum(day['pending_count'] for day in calendar_list),
            'days_with_bets': len(calendar_list),
            'total_stake': sum(day['total_stake'] for day in calendar_list),
            'won_bets': sum(day['won_count'] for day in calendar_list),
            'lost_bets': sum(day['lost_count'] for day in calendar_list)
        }
        
        # Calculate ROI
        if month_summary['total_stake'] > 0:
            month_summary['roi'] = (month_summary['total_profit'] / month_summary['total_stake']) * 100
        else:
            month_summary['roi'] = 0
        
        # Calculate win rate
        total_decisive = month_summary['won_bets'] + month_summary['lost_bets']
        if total_decisive > 0:
            month_summary['win_rate'] = (month_summary['won_bets'] / total_decisive) * 100
        else:
            month_summary['win_rate'] = 0
        
        print(f"[DEBUG] Generated calendar data for {len(calendar_list)} days")
        
        return jsonify({
            'calendar_data': calendar_list,
            'month_info': {
                'year': year,
                'month': month,
                'first_day': first_day.isoformat(),
                'last_day': last_day.isoformat()
            },
            'summary': month_summary
        })
    
    except Exception as e:
        print(f"Error getting unified calendar month data: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@bp.route("/calendar-day", methods=["GET"])
def get_unified_calendar_day():
    """
    Get detailed bet data for a specific day from unified table.
    
    IMPORTANT: Uses time_settled to determine which day bets appear on.
    This means bets show up on their event date, not when they were placed.
    """
    try:
        if not check_unified_table_exists():
            return jsonify({"error": "Unified table not found"}), 404
        
        # Parse query parameters
        date_str = request.args.get('date')
        
        if not date_str:
            return jsonify({"error": "Date parameter is required"}), 400
        
        try:
            target_date = datetime.fromisoformat(date_str).date()
        except ValueError:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
        
        print(f"[DEBUG] Getting unified day data for {target_date}")
        
        # Get all bets for this date using time_settled
        # This ensures bets show up on their event date, not placement date
        # In unified table: time_settled = event date for both settled and pending bets
        bets_query = text("""
            SELECT 
                id, source, original_bet_id, sportsbook, bet_type, status, 
                odds, clv, stake, bet_profit, time_placed, time_settled, 
                bet_info, sport, league, tags
            FROM unified_bets 
            WHERE time_settled IS NOT NULL
              AND DATE(time_settled) = :target_date
            ORDER BY 
                CASE WHEN status = 'pending' THEN 0 ELSE 1 END,  -- Pending bets first
                time_placed DESC  -- Then by placement time
        """)
        
        result = db.session.execute(bets_query, {'target_date': target_date})
        bet_rows = result.fetchall()
        
        # Fallback: also check for bets that only have time_placed (edge case)
        if len(bet_rows) == 0:
            fallback_query = text("""
                SELECT 
                    id, source, original_bet_id, sportsbook, bet_type, status, 
                    odds, clv, stake, bet_profit, time_placed, time_settled, 
                    bet_info, sport, league, tags
                FROM unified_bets 
                WHERE time_settled IS NULL
                  AND DATE(time_placed) = :target_date
                ORDER BY time_placed DESC
            """)
            
            fallback_result = db.session.execute(fallback_query, {'target_date': target_date})
            bet_rows = fallback_result.fetchall()
        
        # Format bets
        bets = []
        for row in bet_rows:
            bets.append({
                'id': row[0],
                'source': row[1],
                'original_bet_id': row[2],
                'sportsbook': row[3],
                'bet_type': row[4],
                'status': row[5],
                'odds': row[6],
                'clv': row[7],
                'stake': float(row[8]) if row[8] else 0,
                'bet_profit': float(row[9]) if row[9] else 0,
                'time_placed': row[10].isoformat() if row[10] else None,
                'time_settled': row[11].isoformat() if row[11] else None,
                'bet_info': row[12],
                'sport': row[13],
                'league': row[14],
                'tags': row[15],
                'event_name': '',  # Will be extracted from bet_info if needed
                'bet_name': ''     # Will be extracted from bet_info if needed
            })
        
        # Calculate day statistics
        total_bets = len(bets)
        settled_bets = len([bet for bet in bets if bet['status'] in ['won', 'lost', 'refunded']])
        pending_bets = len([bet for bet in bets if bet['status'] == 'pending'])
        won_bets = len([bet for bet in bets if bet['status'] == 'won'])
        lost_bets = len([bet for bet in bets if bet['status'] == 'lost'])
        push_bets = len([bet for bet in bets if bet['status'] == 'refunded'])
        
        total_stake = sum(bet['stake'] for bet in bets)
        # Only count profit from settled bets
        total_profit = sum(bet['bet_profit'] for bet in bets if bet['status'] in ['won', 'lost', 'refunded'])
        
        # Calculate metrics
        roi = (total_profit / total_stake * 100) if total_stake > 0 else 0
        win_rate = (won_bets / (won_bets + lost_bets) * 100) if (won_bets + lost_bets) > 0 else 0
        
        # Find biggest win/loss
        settled_profits = [bet['bet_profit'] for bet in bets if bet['status'] in ['won', 'lost']]
        biggest_win = max(settled_profits) if settled_profits else 0
        biggest_loss = min(settled_profits) if settled_profits else 0
        
        print(f"[DEBUG] Found {len(bets)} bets for {target_date}")
        
        return jsonify({
            'date': date_str,
            'bets': bets,
            'total_bets': total_bets,
            'settled_bets': settled_bets,
            'pending_bets': pending_bets,
            'won_bets': won_bets,
            'lost_bets': lost_bets,
            'push_bets': push_bets,
            'total_stake': total_stake,
            'total_profit': total_profit,
            'roi': roi,
            'win_rate': win_rate,
            'biggest_win': biggest_win,
            'biggest_loss': biggest_loss
        })
    
    except Exception as e:
        print(f"Error getting unified calendar day data: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500