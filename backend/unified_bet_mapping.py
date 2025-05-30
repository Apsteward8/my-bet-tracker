# backend/unified_bet_mapping.py
from datetime import datetime
import re

class UnifiedBetMapper:
    """Maps bets from different sources (OddsJam, Pikkit) to a unified format."""
    
    def __init__(self):
        # Define which sportsbooks are tracked by which system
        self.PIKKIT_SPORTSBOOKS = {
            'BetMGM', 'Caesars Sportsbook', 'Caesars', 'Draftkings Sportsbook', 'DraftKings',
            'ESPN BET', 'ESPNBet', 'Fanatics', 'Fanduel Sportsbook', 'FanDuel', 
            'Fliff', 'Novig', 'Onyx', 'Onyx Odds', 'PrizePicks', 'ProphetX', 
            'Prophet X', 'Rebet', 'Thrillzz', 'Underdog Fantasy'
        }
        
        self.ODDSJAM_SPORTSBOOKS = {
            'BetNow', 'BetOnline', 'BetUS', 'BookMaker', 'Bovada', 
            'Everygame', 'MyBookie', 'Sportzino', 'Xbet', 'bet105', 'betwhale'
        }
    
    def get_source_for_sportsbook(self, sportsbook):
        """Determine which source should be used for a given sportsbook."""
        if sportsbook in self.PIKKIT_SPORTSBOOKS:
            return 'pikkit'
        elif sportsbook in self.ODDSJAM_SPORTSBOOKS:
            return 'oddsjam'
        else:
            # Default fallback - could be configured based on your preferences
            return 'oddsjam'  # or 'pikkit' based on your preference
    
    def _normalize_status(self, status):
        """Normalize bet status across different sources."""
        if not status:
            return 'unknown'
        
        status_lower = status.lower()
        
        # Handle Pikkit status format
        if status_lower in ['settled_win', 'settled-win']:
            return 'won'
        elif status_lower in ['settled_loss', 'settled-loss']:
            return 'lost'
        elif status_lower == 'pending':
            return 'pending'
        elif status_lower in ['cancelled', 'voided', 'refunded']:
            return 'void'
        elif status_lower == 'pushed':
            return 'push'
        
        # Handle OddsJam status format (already normalized)
        elif status_lower in ['won', 'lost', 'pending', 'void', 'push']:
            return status_lower
        
        return status_lower
    
    def _decimal_to_american_odds(self, decimal_odds):
        """Convert decimal odds to American odds."""
        if not decimal_odds or decimal_odds <= 1:
            return 0
        
        if decimal_odds >= 2.0:
            return int((decimal_odds - 1) * 100)
        else:
            return int(-100 / (decimal_odds - 1))
    
    def _parse_pikkit_time(self, time_str):
        """Parse Pikkit time format."""
        if not time_str:
            return None
        
        try:
            # Handle format: "03/11/2025 15:52:19 GMT"
            clean_time = time_str.replace(' GMT', '')
            return clean_time
        except:
            return time_str
    
    def _parse_oddsjam_time(self, time_str):
        """Parse OddsJam time format."""
        if not time_str:
            return None
        
        try:
            # Handle format: "03/11/2025, 15:52 EDT"
            clean_time = re.sub(r' [A-Z]{3,4}$', '', time_str)
            return clean_time
        except:
            return time_str
    
    def map_pikkit_to_unified(self, pikkit_bet):
        """Map a Pikkit bet to unified format."""
        return {
            'source': 'pikkit',
            'original_id': pikkit_bet.get('id'),
            'bet_id': pikkit_bet.get('bet_id'),
            'sportsbook': pikkit_bet.get('sportsbook', ''),
            'bet_type': pikkit_bet.get('type', ''),
            'status': self._normalize_status(pikkit_bet.get('status')),
            'odds': self._decimal_to_american_odds(pikkit_bet.get('odds', 0)),
            'clv': self._decimal_to_american_odds(pikkit_bet.get('closing_line', 0)) - self._decimal_to_american_odds(pikkit_bet.get('odds', 0)) if pikkit_bet.get('closing_line') else None,
            'stake': pikkit_bet.get('amount', 0),
            'bet_profit': pikkit_bet.get('profit', 0),
            'sport': pikkit_bet.get('sports', ''),
            'league': pikkit_bet.get('leagues', ''),
            'tags': pikkit_bet.get('tags', ''),
            'time_placed': self._parse_pikkit_time(pikkit_bet.get('time_placed')),
            'time_settled': self._parse_pikkit_time(pikkit_bet.get('time_settled')),
            'event_start_date': self._parse_pikkit_time(pikkit_bet.get('time_placed')),  # Use time_placed as event date
            'bet_info': pikkit_bet.get('bet_info', ''),
            'event_name': self._extract_event_name_from_bet_info(pikkit_bet.get('bet_info', '')),
            'bet_name': self._extract_bet_name_from_bet_info(pikkit_bet.get('bet_info', '')),
            'market_name': self._extract_market_name_from_bet_info(pikkit_bet.get('bet_info', '')),
            'potential_payout': None,
            'is_live_bet': False,
            'is_free_bet': False,
            'is_odds_boost': False,
            'ev': pikkit_bet.get('ev')
        }
    
    def map_oddsjam_to_unified(self, oddsjam_bet):
        """Map an OddsJam bet to unified format."""
        return {
            'source': 'oddsjam',
            'original_id': oddsjam_bet.get('id'),
            'bet_id': None,
            'sportsbook': oddsjam_bet.get('sportsbook', ''),
            'bet_type': oddsjam_bet.get('bet_type', ''),
            'status': self._normalize_status(oddsjam_bet.get('status')),
            'odds': oddsjam_bet.get('odds', 0),
            'clv': oddsjam_bet.get('clv'),
            'stake': oddsjam_bet.get('stake', 0),
            'bet_profit': oddsjam_bet.get('bet_profit', 0),
            'sport': oddsjam_bet.get('sport', ''),
            'league': oddsjam_bet.get('league', ''),
            'tags': oddsjam_bet.get('tags', ''),
            'time_placed': self._parse_oddsjam_time(oddsjam_bet.get('created_at')),
            'time_settled': None,  # OddsJam doesn't track settlement time separately
            'event_start_date': self._parse_oddsjam_time(oddsjam_bet.get('event_start_date')),
            'bet_info': self._create_bet_info_from_oddsjam(oddsjam_bet),
            'event_name': oddsjam_bet.get('event_name', ''),
            'bet_name': oddsjam_bet.get('bet_name', ''),
            'market_name': oddsjam_bet.get('market_name', ''),
            'potential_payout': oddsjam_bet.get('potential_payout'),
            'is_live_bet': oddsjam_bet.get('is_live_bet', False),
            'is_free_bet': oddsjam_bet.get('is_free_bet', False),
            'is_odds_boost': oddsjam_bet.get('is_odds_boost', False),
            'ev': None
        }
    
    def _extract_event_name_from_bet_info(self, bet_info):
        """Extract event name from Pikkit bet_info."""
        if not bet_info:
            return 'Unknown Event'
        
        # Common patterns for team matchups
        team_patterns = [
            r'(.+)\s+at\s+(.+)$',
            r'(.+)\s+vs\.?\s+(.+)$',
            r'(.+)\s+@\s+(.+)$'
        ]
        
        for pattern in team_patterns:
            matches = re.search(pattern, bet_info, re.IGNORECASE)
            if matches:
                return f"{matches.group(1).strip()} at {matches.group(2).strip()}"
        
        # If no pattern found, take first part before common bet descriptors
        bet_descriptors = ['total points', 'total assists', 'total rebounds', 'moneyline', 'spread', 'over', 'under']
        for descriptor in bet_descriptors:
            if descriptor in bet_info.lower():
                parts = bet_info.lower().split(descriptor)
                if parts[0].strip():
                    return parts[0].strip().title()
        
        return 'Unknown Event'
    
    def _extract_bet_name_from_bet_info(self, bet_info):
        """Extract bet name from Pikkit bet_info."""
        if not bet_info:
            return 'Unknown Bet'
        
        # For parlays, return the full info (truncated)
        if '|' in bet_info:
            return bet_info[:100] + '...' if len(bet_info) > 100 else bet_info
        
        # For single bets, return the bet description part
        team_patterns = [
            r'(.+)\s+at\s+(.+)$',
            r'(.+)\s+vs\.?\s+(.+)$',
            r'(.+)\s+@\s+(.+)$'
        ]
        
        for pattern in team_patterns:
            matches = re.search(pattern, bet_info, re.IGNORECASE)
            if matches:
                # Everything before the teams is the bet description
                bet_description = bet_info[:matches.start()].strip()
                return bet_description if bet_description else bet_info
        
        return bet_info
    
    def _extract_market_name_from_bet_info(self, bet_info):
        """Extract market name from Pikkit bet_info."""
        if not bet_info:
            return 'Unknown Market'
        
        # Try to extract market type from bet description
        market_patterns = [
            (r'total\s+points?', 'Total Points'),
            (r'total\s+assists?', 'Total Assists'),
            (r'total\s+rebounds?', 'Total Rebounds'),
            (r'total\s+goals?', 'Total Goals'),
            (r'total\s+yards?', 'Total Yards'),
            (r'total\s+touchdowns?', 'Total Touchdowns'),
            (r'spread', 'Spread'),
            (r'moneyline', 'Moneyline'),
            (r'over/under', 'Total'),
            (r'player\s+props?', 'Player Props'),
            (r'three\s+pointers?', 'Three Pointers'),
            (r'rebounds?', 'Rebounds'),
            (r'assists?', 'Assists'),
            (r'points?', 'Points')
        ]
        
        bet_info_lower = bet_info.lower()
        for pattern, market in market_patterns:
            if re.search(pattern, bet_info_lower):
                return market
        
        return 'Unknown Market'
    
    def _create_bet_info_from_oddsjam(self, oddsjam_bet):
        """Create a bet_info string from OddsJam bet fields."""
        parts = []
        
        if oddsjam_bet.get('bet_name'):
            parts.append(oddsjam_bet['bet_name'])
        
        if oddsjam_bet.get('event_name'):
            parts.append(f"- {oddsjam_bet['event_name']}")
        
        if oddsjam_bet.get('market_name'):
            parts.append(f"({oddsjam_bet['market_name']})")
        
        return ' '.join(parts) if parts else 'Unknown Bet'
    
    def unify_bet_list(self, oddsjam_bets, pikkit_bets):
        """
        Combine bets from both sources, applying smart prioritization to avoid duplicates.
        """
        unified_bets = []
        
        # Map OddsJam bets (only for non-Pikkit sportsbooks)
        for bet in oddsjam_bets:
            if bet.get('sportsbook') not in self.PIKKIT_SPORTSBOOKS:
                unified_bet = self.map_oddsjam_to_unified(bet)
                unified_bets.append(unified_bet)
        
        # Map Pikkit bets (only for Pikkit-tracked sportsbooks)
        for bet in pikkit_bets:
            if bet.get('sportsbook') in self.PIKKIT_SPORTSBOOKS:
                unified_bet = self.map_pikkit_to_unified(bet)
                unified_bets.append(unified_bet)
        
        return unified_bets
    
    def get_unified_stats(self, oddsjam_bets, pikkit_bets):
        """
        Calculate unified statistics across both data sources.
        """
        # Filter bets based on source prioritization
        relevant_oddsjam = [bet for bet in oddsjam_bets if bet.get('sportsbook') not in self.PIKKIT_SPORTSBOOKS]
        relevant_pikkit = [bet for bet in pikkit_bets if bet.get('sportsbook') in self.PIKKIT_SPORTSBOOKS]
        
        # Calculate combined metrics
        total_bets = len(relevant_oddsjam) + len(relevant_pikkit)
        
        # Sum profits and stakes
        oddsjam_profit = sum(float(bet.get('bet_profit', 0)) for bet in relevant_oddsjam)
        pikkit_profit = sum(float(bet.get('profit', 0)) for bet in relevant_pikkit)
        total_profit = oddsjam_profit + pikkit_profit
        
        oddsjam_stake = sum(float(bet.get('stake', 0)) for bet in relevant_oddsjam)
        pikkit_stake = sum(float(bet.get('amount', 0)) for bet in relevant_pikkit)
        total_stake = oddsjam_stake + pikkit_stake
        
        # Calculate win rates
        oddsjam_wins = len([bet for bet in relevant_oddsjam if bet.get('status') == 'won'])
        pikkit_wins = len([bet for bet in relevant_pikkit if bet.get('status') in ['SETTLED_WIN', 'won']])
        total_wins = oddsjam_wins + pikkit_wins
        
        oddsjam_losses = len([bet for bet in relevant_oddsjam if bet.get('status') == 'lost'])
        pikkit_losses = len([bet for bet in relevant_pikkit if bet.get('status') in ['SETTLED_LOSS', 'lost']])
        total_losses = oddsjam_losses + pikkit_losses
        
        # Calculate rates
        total_settled = total_wins + total_losses
        win_rate = (total_wins / total_settled * 100) if total_settled > 0 else 0
        roi = (total_profit / total_stake * 100) if total_stake > 0 else 0
        
        return {
            'total_bets': total_bets,
            'total_profit': total_profit,
            'total_stake': total_stake,
            'win_rate': win_rate,
            'roi': roi,
            'winning_bets': total_wins,
            'losing_bets': total_losses,
            'source_breakdown': {
                'oddsjam': {
                    'bet_count': len(relevant_oddsjam),
                    'profit': oddsjam_profit,
                    'stake': oddsjam_stake
                },
                'pikkit': {
                    'bet_count': len(relevant_pikkit),
                    'profit': pikkit_profit,
                    'stake': pikkit_stake
                }
            }
        }
    
    def should_use_pikkit_for_sportsbook(self, sportsbook):
        """Check if Pikkit should be the primary source for this sportsbook."""
        return sportsbook in self.PIKKIT_SPORTSBOOKS
    
    def should_use_oddsjam_for_sportsbook(self, sportsbook):
        """Check if OddsJam should be the primary source for this sportsbook."""
        return sportsbook in self.ODDSJAM_SPORTSBOOKS or sportsbook not in self.PIKKIT_SPORTSBOOKS
    
    def get_all_tracked_sportsbooks(self):
        """Get all sportsbooks tracked by either system."""
        return {
            'pikkit': list(self.PIKKIT_SPORTSBOOKS),
            'oddsjam': list(self.ODDSJAM_SPORTSBOOKS),
            'all': list(self.PIKKIT_SPORTSBOOKS | self.ODDSJAM_SPORTSBOOKS)
        }
    
    def validate_bet_data(self, bet_data, source):
        """Validate that bet data has required fields for mapping."""
        required_fields = {
            'pikkit': ['id', 'sportsbook', 'status', 'amount'],
            'oddsjam': ['id', 'sportsbook', 'status', 'stake']
        }
        
        if source not in required_fields:
            return False, f"Unknown source: {source}"
        
        missing_fields = []
        for field in required_fields[source]:
            if field not in bet_data or bet_data[field] is None:
                missing_fields.append(field)
        
        if missing_fields:
            return False, f"Missing required fields: {missing_fields}"
        
        return True, "Valid"