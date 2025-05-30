# backend/unified_bet_mapping.py
"""
Unified betting system that maps fields between OddsJam and Pikkit exports
to create consistent data structure across both sources.
"""

from datetime import datetime
import re
from typing import Dict, Any, Optional

class UnifiedBetMapper:
    """Maps fields between OddsJam and Pikkit to create unified bet records."""
    
    # Manual mapping based on your specifications
    # These sportsbooks will use Pikkit as the data source
    PIKKIT_SPORTSBOOKS = {
        'BetMGM', 'Caesars Sportsbook', 'Caesars', 'Draftkings Sportsbook', 'DraftKings',
        'ESPN BET', 'ESPNBet', 'Fanatics', 'Fanduel Sportsbook', 'FanDuel', 
        'Fliff', 'Novig', 'Onyx', 'Onyx Odds', 'PrizePicks', 'ProphetX', 
        'Prophet X', 'Rebet', 'Thrillzz', 'Underdog Fantasy'
    }
    
    # These sportsbooks will use OddsJam as the data source
    ODDSJAM_SPORTSBOOKS = {
        'BetNow', 'BetOnline', 'BetUS', 'BookMaker', 'Bovada', 
        'Everygame', 'MyBookie', 'Sportzino', 'Xbet', 'bet105', 'betwhale'
    }
    
    @staticmethod
    def map_oddsjam_to_unified(oddsjam_row: Dict[str, Any]) -> Dict[str, Any]:
        """Convert OddsJam row to unified format."""
        
        # Create unified bet_info field by combining OddsJam fields
        bet_info = UnifiedBetMapper._create_unified_bet_info(
            bet_name=oddsjam_row.get('bet_name', ''),
            market_name=oddsjam_row.get('market_name', ''),
            event_name=oddsjam_row.get('event_name', '')
        )
        
        # Convert status
        status = UnifiedBetMapper._normalize_status(oddsjam_row.get('status', ''))
        
        # Convert odds format (OddsJam uses American odds directly)
        odds = oddsjam_row.get('odds', 0)
        clv = oddsjam_row.get('clv', 0)
        
        return {
            # Core identification
            'source': 'oddsjam',
            'original_id': oddsjam_row.get('id'),
            'bet_id': None,  # OddsJam doesn't have bet_id
            
            # Unified fields
            'sportsbook': oddsjam_row.get('sportsbook', ''),
            'bet_type': UnifiedBetMapper._normalize_bet_type(oddsjam_row.get('bet_type', '')),
            'status': status,
            'odds': odds,
            'clv': clv,
            'stake': float(oddsjam_row.get('stake', 0)) if oddsjam_row.get('stake') else 0,
            'bet_profit': float(oddsjam_row.get('bet_profit', 0)) if oddsjam_row.get('bet_profit') else 0,
            'sport': oddsjam_row.get('sport', ''),
            'league': oddsjam_row.get('league', ''),
            'tags': oddsjam_row.get('tags', ''),
            
            # Datetime fields
            'time_placed': UnifiedBetMapper._parse_oddsjam_datetime(oddsjam_row.get('created_at')),
            'time_settled': None,  # OddsJam doesn't track settlement time
            'event_start_date': UnifiedBetMapper._parse_oddsjam_datetime(oddsjam_row.get('event_start_date')),
            
            # Unified bet description
            'bet_info': bet_info,
            
            # Parsed components (from original OddsJam structure)
            'event_name': oddsjam_row.get('event_name', ''),
            'bet_name': oddsjam_row.get('bet_name', ''),
            'market_name': oddsjam_row.get('market_name', ''),
            
            # Additional OddsJam-specific fields (optional)
            'potential_payout': float(oddsjam_row.get('potential_payout', 0)) if oddsjam_row.get('potential_payout') else None,
            'is_live_bet': oddsjam_row.get('is_live_bet', False),
            'is_free_bet': oddsjam_row.get('is_free_bet', False),
            'is_odds_boost': oddsjam_row.get('is_odds_boost', False),
        }
    
    @staticmethod
    def map_pikkit_to_unified(pikkit_row: Dict[str, Any]) -> Dict[str, Any]:
        """Convert Pikkit row to unified format."""
        
        # Parse bet_info to extract components
        parsed_info = UnifiedBetMapper._parse_pikkit_bet_info(
            pikkit_row.get('bet_info', ''),
            pikkit_row.get('type', 'straight')
        )
        
        # Convert status
        status = UnifiedBetMapper._normalize_status(pikkit_row.get('status', ''))
        
        # Convert decimal odds to American odds for consistency
        american_odds = UnifiedBetMapper._decimal_to_american_odds(pikkit_row.get('odds', 0))
        american_clv = UnifiedBetMapper._decimal_to_american_odds(pikkit_row.get('closing_line', 0))
        
        return {
            # Core identification
            'source': 'pikkit',
            'original_id': pikkit_row.get('id'),
            'bet_id': pikkit_row.get('bet_id'),
            
            # Unified fields
            'sportsbook': pikkit_row.get('sportsbook', ''),
            'bet_type': UnifiedBetMapper._normalize_bet_type(pikkit_row.get('type', '')),
            'status': status,
            'odds': american_odds,
            'clv': american_clv,
            'stake': float(pikkit_row.get('amount', 0)) if pikkit_row.get('amount') else 0,
            'bet_profit': float(pikkit_row.get('profit', 0)) if pikkit_row.get('profit') else 0,
            'sport': pikkit_row.get('sports', ''),
            'league': pikkit_row.get('leagues', ''),
            'tags': pikkit_row.get('tags', ''),
            
            # Datetime fields
            'time_placed': UnifiedBetMapper._parse_pikkit_datetime(pikkit_row.get('time_placed')),
            'time_settled': UnifiedBetMapper._parse_pikkit_datetime(pikkit_row.get('time_settled')),
            'event_start_date': None,  # Pikkit doesn't track event start date
            
            # Unified bet description
            'bet_info': pikkit_row.get('bet_info', ''),
            
            # Parsed components (extracted from bet_info)
            'event_name': parsed_info['event_name'],
            'bet_name': parsed_info['bet_name'],
            'market_name': parsed_info['market_name'],
            
            # Additional Pikkit-specific fields
            'ev': float(pikkit_row.get('ev', 0)) if pikkit_row.get('ev') else None,
        }
    
    @staticmethod
    def _create_unified_bet_info(bet_name: str, market_name: str, event_name: str) -> str:
        """
        Create unified bet_info field from OddsJam components.
        Format similar to Pikkit: [bet_name] [market_name] [event_name]
        Example: "Hunter Greene Over 1.5 Player Walks Chicago Cubs vs Cincinnati Reds"
        """
        parts = []
        
        # Always include bet_name if available
        if bet_name and bet_name.strip():
            parts.append(bet_name.strip())
        
        # Add market_name if it's not already contained in bet_name
        if market_name and market_name.strip():
            market_clean = market_name.strip()
            # Only add if it's not already in the bet_name
            if not bet_name or market_clean.lower() not in bet_name.lower():
                parts.append(market_clean)
        
        # Always add event_name at the end
        if event_name and event_name.strip():
            parts.append(event_name.strip())
        
        return ' '.join(parts)
    
    @staticmethod
    def _parse_pikkit_bet_info(bet_info: str, bet_type: str = "straight") -> Dict[str, str]:
        """
        Parse Pikkit's bet_info field to extract components.
        
        Examples:
        - "Phoenix Suns Moneyline Phoenix Suns @ Houston Rockets"
        - "under 14.5 Bryce Thompson Total Points Cincinnati Bearcats at Oklahoma State Cowboys"
        """
        if not bet_info:
            return {'bet_name': '', 'event_name': '', 'market_name': ''}
        
        bet_info = bet_info.strip()
        
        # Handle parlays differently
        if bet_type.lower() == 'parlay':
            legs = [leg.strip() for leg in bet_info.split('|')]
            if len(legs) > 1:
                return {
                    'bet_name': f"Parlay ({len(legs)} legs)",
                    'event_name': "Multiple Events",
                    'market_name': "Parlay"
                }
        
        # Common patterns to identify event names at the end
        event_patterns = [
            r'(.+)\s+at\s+(.+)$',
            r'(.+)\s+vs\.?\s+(.+)$',
            r'(.+)\s+@\s+(.+)$',
        ]
        
        event_name = ''
        bet_description = bet_info
        
        # Try to find team matchup at the end
        for pattern in event_patterns:
            match = re.search(pattern, bet_info, re.IGNORECASE)
            if match:
                # Extract event name
                team1 = match.group(1).strip()
                team2 = match.group(2).strip()
                event_name = f"{team1} vs {team2}"
                # Everything before the event is the bet description
                bet_description = bet_info[:match.start()].strip()
                break
        
        # Extract market type from bet description
        market_name = UnifiedBetMapper._extract_market_from_description(bet_description)
        
        return {
            'bet_name': bet_description,
            'event_name': event_name or "Unknown Event",
            'market_name': market_name
        }
    
    @staticmethod
    def _extract_market_from_description(description: str) -> str:
        """Extract market type from bet description."""
        if not description:
            return ''
        
        description_lower = description.lower()
        
        # Market patterns (order matters - more specific first)
        market_patterns = [
            (r'total\s+points?', 'Total Points'),
            (r'total\s+assists?', 'Total Assists'),
            (r'total\s+rebounds?', 'Total Rebounds'),
            (r'total\s+goals?', 'Total Goals'),
            (r'total\s+yards?', 'Total Yards'),
            (r'total\s+touchdowns?', 'Total Touchdowns'),
            (r'moneyline', 'Moneyline'),
            (r'spread', 'Spread'),
            (r'over/under', 'Total'),
            (r'under\s+\d+\.?\d*', 'Total'),
            (r'over\s+\d+\.?\d*', 'Total'),
            (r'three\s+pointers?', 'Three Pointers'),
            (r'rebounds?', 'Rebounds'),
            (r'assists?', 'Assists'),
            (r'points?', 'Points'),
        ]
        
        for pattern, market in market_patterns:
            if re.search(pattern, description_lower):
                return market
        
        return 'Other'
    
    @staticmethod
    def _normalize_status(status: str) -> str:
        """Normalize status values across both systems."""
        if not status:
            return 'pending'
        
        status_map = {
            # Pikkit statuses
            'SETTLED_WIN': 'won',
            'SETTLED_LOSS': 'lost',
            'PENDING': 'pending',
            'CANCELLED': 'void',
            'VOIDED': 'void',
            'PUSHED': 'push',
            'REFUNDED': 'void',
            
            # OddsJam statuses (already normalized)
            'won': 'won',
            'lost': 'lost',
            'pending': 'pending',
            'void': 'void',
            'push': 'push',
        }
        
        return status_map.get(status.upper(), status.lower())
    
    @staticmethod
    def _normalize_bet_type(bet_type: str) -> str:
        """Normalize bet type values."""
        if not bet_type:
            return 'straight'
        
        type_map = {
            'straight': 'straight',
            'parlay': 'parlay',
            'normal': 'straight',
            'positive_ev': 'positive_ev',
        }
        
        return type_map.get(bet_type.lower(), bet_type.lower())
    
    @staticmethod
    def _decimal_to_american_odds(decimal_odds: float) -> Optional[int]:
        """Convert decimal odds to American odds."""
        if not decimal_odds or decimal_odds <= 1:
            return None
        
        if decimal_odds >= 2.0:
            return int((decimal_odds - 1) * 100)
        else:
            return int(-100 / (decimal_odds - 1))
    
    @staticmethod
    def _parse_oddsjam_datetime(date_str: str) -> Optional[datetime]:
        """Parse OddsJam datetime format."""
        if not date_str:
            return None
        
        try:
            # OddsJam format: "05/23/2025, 09:41 EDT"
            # Remove timezone and parse
            clean_date = re.sub(r'\s+(EDT|EST|CST|CDT|PST|PDT)$', '', date_str)
            return datetime.strptime(clean_date, '%m/%d/%Y, %H:%M')
        except:
            return None
    
    @staticmethod
    def _parse_pikkit_datetime(date_str: str) -> Optional[datetime]:
        """Parse Pikkit datetime format."""
        if not date_str:
            return None
        
        try:
            # Pikkit format: "03/11/2025 15:52:19 GMT"
            clean_date = re.sub(r'\s+GMT$', '', date_str)
            return datetime.strptime(clean_date, '%m/%d/%Y %H:%M:%S')
        except:
            return None
    
    @staticmethod
    def determine_source_priority(sportsbook: str) -> str:
        """Determine which system should be used for a given sportsbook."""
        # Normalize sportsbook name for comparison
        normalized_sb = sportsbook.strip()
        
        # Check Pikkit sportsbooks first
        if normalized_sb in UnifiedBetMapper.PIKKIT_SPORTSBOOKS:
            return 'pikkit'
        
        # Check OddsJam sportsbooks
        if normalized_sb in UnifiedBetMapper.ODDSJAM_SPORTSBOOKS:
            return 'oddsjam'
        
        # Default fallback logic for unmapped sportsbooks
        # You can adjust this based on your preference
        return 'oddsjam'  # Default to OddsJam for unknown sportsbooks


# Example usage and testing
if __name__ == "__main__":
    # Test OddsJam mapping
    oddsjam_example = {
        'id': 1,
        'sportsbook': 'Novig',
        'sport': 'baseball',
        'league': 'MLB',
        'event_name': 'Chicago Cubs vs Cincinnati Reds',
        'market_name': 'Player Walks',
        'bet_name': 'Hunter Greene Over 1.5',
        'odds': 118,
        'clv': 119,
        'stake': 30,
        'bet_profit': 35.4,
        'status': 'won',
        'bet_type': 'normal',
        'created_at': '05/23/2025, 09:41 EDT',
    }
    
    # Test Pikkit mapping
    pikkit_example = {
        'id': 1,
        'bet_id': 'f3283aa5-2229-4ff9-81ea-c5093b98ccfd',
        'sportsbook': 'ProphetX',
        'type': 'straight',
        'status': 'SETTLED_WIN',
        'odds': 1.79,
        'amount': 7.5,
        'profit': 5.92,
        'bet_info': 'under 14.5 Bryce Thompson Total Points Cincinnati Bearcats at Oklahoma State Cowboys',
        'sports': 'Basketball',
        'leagues': 'NCAAM',
        'time_placed': '03/11/2025 15:52:19 GMT',
    }
    
    mapper = UnifiedBetMapper()
    
    print("OddsJam mapped:")
    print(mapper.map_oddsjam_to_unified(oddsjam_example))
    print("\nPikkit mapped:")
    print(mapper.map_pikkit_to_unified(pikkit_example))