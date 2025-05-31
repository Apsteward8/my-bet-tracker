# backend/data_converters.py
from datetime import datetime
import pytz
import re
from decimal import Decimal, ROUND_HALF_UP

# Define timezones
EST = pytz.timezone("America/New_York")
CST = pytz.timezone("America/Chicago")
GMT = pytz.timezone("GMT")

# Sportsbook categorization
PIKKIT_SPORTSBOOKS = {
    'BetMGM', 'Caesars Sportsbook', 'Caesars', 'Draftkings Sportsbook', 'DraftKings',
    'ESPN BET', 'ESPNBet', 'Fanatics', 'Fanduel Sportsbook', 'FanDuel', 
    'Fliff', 'Novig', 'Onyx', 'Onyx Odds', 'PrizePicks', 'ProphetX', 
    'Prophet X', 'Rebet', 'Thrillzz', 'Underdog Fantasy'
}

ODDSJAM_SPORTSBOOKS = {
    'BetNow', 'BetOnline', 'BetUS', 'BookMaker', 'Bovada', 
    'Everygame', 'MyBookie', 'Sportzino', 'Xbet', 'bet105', 'betwhale'
}

def should_use_pikkit_data(sportsbook):
    """Determine if we should prioritize Pikkit data for this sportsbook"""
    return sportsbook in PIKKIT_SPORTSBOOKS

def decimal_to_american_odds(decimal_odds):
    """Convert decimal odds to American odds format"""
    if not decimal_odds or decimal_odds <= 0:
        return 0
    
    decimal_odds = float(decimal_odds)
    
    if decimal_odds >= 2.0:
        # Positive American odds
        return int((decimal_odds - 1) * 100)
    else:
        # Negative American odds
        return int(-100 / (decimal_odds - 1))

def american_to_decimal_odds(american_odds):
    """Convert American odds to decimal odds format"""
    if not american_odds:
        return 0
    
    american_odds = int(american_odds)
    
    if american_odds > 0:
        return (american_odds / 100) + 1
    else:
        return (100 / abs(american_odds)) + 1

def round_currency(amount):
    """Round amount to 2 decimal places using standard rounding"""
    if amount is None:
        return None
    
    decimal_amount = Decimal(str(amount))
    return float(decimal_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))

def normalize_bet_type(bet_type, source):
    """Normalize bet types to unified format (straight or parlay)"""
    if not bet_type:
        return 'straight'
    
    bet_type = bet_type.lower()
    
    if source == 'oddsjam':
        # OddsJam types: arbitrage, free_bet, low_hold, middle, no_sweat_bet, normal, parlay, positive_ev
        return 'parlay' if bet_type == 'parlay' else 'straight'
    elif source == 'pikkit':
        # Pikkit types: parlay, straight
        return 'parlay' if bet_type == 'parlay' else 'straight'
    
    return 'straight'

def normalize_status(status, source):
    """Normalize status to unified format (pending, won, lost, refunded)"""
    if not status:
        return 'pending'
    
    status = status.upper()
    
    if source == 'oddsjam':
        # OddsJam statuses: pending, won, lost, refunded
        status_map = {
            'PENDING': 'pending',
            'WON': 'won',
            'LOST': 'lost',
            'REFUNDED': 'refunded'
        }
        return status_map.get(status, 'pending')
    elif source == 'pikkit':
        # Pikkit statuses: SETTLED_LOSS, SETTLED_WIN, SETTLED_PUSH, SETTLED_VOID, PLACED
        status_map = {
            'PLACED': 'pending',
            'SETTLED_WIN': 'won',
            'SETTLED_LOSS': 'lost',
            'SETTLED_PUSH': 'refunded',
            'SETTLED_VOID': 'refunded'
        }
        return status_map.get(status, 'pending')
    
    return 'pending'

def parse_oddsjam_date(date_str):
    """Parse OddsJam date format: '03/16/2025, 22:13 EDT' and convert to CST"""
    if not date_str:
        return None
    
    try:
        # Remove timezone abbreviation and parse
        date_clean = re.sub(r' [A-Z]{3,4}$', '', date_str.strip())
        parsed_date = datetime.strptime(date_clean, '%m/%d/%Y, %H:%M')
        
        # Assume EDT/EST timezone for OddsJam dates
        parsed_date = EST.localize(parsed_date)
        
        # Convert to CST
        cst_date = parsed_date.astimezone(CST)
        
        # Return as naive datetime for MySQL compatibility
        return cst_date.replace(tzinfo=None)
    except Exception as e:
        print(f"Error parsing OddsJam date '{date_str}': {e}")
        return None

def parse_pikkit_date(date_str):
    """Parse Pikkit date format: '05/29/2025 21:56:40 GMT' and convert to CST"""
    if not date_str:
        return None
    
    try:
        # Remove timezone abbreviation and parse
        date_clean = re.sub(r' GMT$', '', date_str.strip())
        parsed_date = datetime.strptime(date_clean, '%m/%d/%Y %H:%M:%S')
        
        # Assume GMT timezone for Pikkit dates
        parsed_date = GMT.localize(parsed_date)
        
        # Convert to CST
        cst_date = parsed_date.astimezone(CST)
        
        # Strip seconds to match OddsJam format (hour:minute only)
        cst_date = cst_date.replace(second=0, microsecond=0)
        
        # Return as naive datetime for MySQL compatibility
        return cst_date.replace(tzinfo=None)
    except Exception as e:
        print(f"Error parsing Pikkit date '{date_str}': {e}")
        return None

def create_bet_info_from_oddsjam(bet_name, market_name, event_name):
    """Create unified bet_info field from OddsJam fields to match Pikkit format"""
    # Example Pikkit format: "Quentin Halys +5.5 Game Spread Holger Rune @ Quentin Halys"
    # OddsJam fields: bet_name = "Quentin Halys", market_name = "+5.5 Game Spread", event_name = "Holger Rune @ Quentin Halys"
    
    parts = []
    
    if bet_name and bet_name.strip():
        parts.append(bet_name.strip())
    
    if market_name and market_name.strip():
        parts.append(market_name.strip())
    
    if event_name and event_name.strip():
        parts.append(event_name.strip())
    
    return ' '.join(parts) if parts else ''

def convert_oddsjam_to_unified(oddsjam_data):
    """Convert OddsJam bet data to unified format"""
    return {
        'source': 'oddsjam',  # String value, SQLAlchemy will convert to enum
        'original_bet_id': str(oddsjam_data.get('id', '')),
        'sportsbook': oddsjam_data.get('sportsbook', ''),
        'bet_type': normalize_bet_type(oddsjam_data.get('bet_type'), 'oddsjam'),
        'status': normalize_status(oddsjam_data.get('status'), 'oddsjam'),
        'odds': oddsjam_data.get('odds', 0),  # Already in American format
        'clv': oddsjam_data.get('clv', 0),    # Already in American format
        'stake': round_currency(oddsjam_data.get('stake', 0)),
        'bet_profit': round_currency(oddsjam_data.get('bet_profit', 0)),
        'time_placed': parse_oddsjam_date(oddsjam_data.get('created_at')),
        'time_settled': parse_oddsjam_date(oddsjam_data.get('event_start_date')),  # Use event_start_date as time_settled
        'bet_info': create_bet_info_from_oddsjam(
            oddsjam_data.get('bet_name', ''),
            oddsjam_data.get('market_name', ''),
            oddsjam_data.get('event_name', '')
        ),
        'tags': oddsjam_data.get('tags', ''),
        'sport': oddsjam_data.get('sport', ''),
        'league': oddsjam_data.get('league', '')
    }

def convert_pikkit_to_unified(pikkit_data):
    """Convert Pikkit bet data to unified format"""
    return {
        'source': 'pikkit',  # String value, SQLAlchemy will convert to enum
        'original_bet_id': pikkit_data.get('bet_id', ''),
        'sportsbook': pikkit_data.get('sportsbook', ''),
        'bet_type': normalize_bet_type(pikkit_data.get('type'), 'pikkit'),
        'status': normalize_status(pikkit_data.get('status'), 'pikkit'),
        'odds': decimal_to_american_odds(pikkit_data.get('odds')),
        'clv': decimal_to_american_odds(pikkit_data.get('closing_line')),
        'stake': round_currency(pikkit_data.get('amount', 0)),
        'bet_profit': round_currency(pikkit_data.get('profit', 0)),
        'time_placed': parse_pikkit_date(pikkit_data.get('time_placed')),
        'time_settled': parse_pikkit_date(pikkit_data.get('time_settled')),
        'event_start_date': None,  # Pikkit doesn't have event start date
        'bet_info': pikkit_data.get('bet_info', ''),
        'tags': pikkit_data.get('tags', ''),
        'sport': pikkit_data.get('sports', ''),
        'league': pikkit_data.get('leagues', '')
    }