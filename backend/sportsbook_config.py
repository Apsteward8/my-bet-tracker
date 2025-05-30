# backend/sportsbook_config.py
"""
Sportsbook configuration for unified betting system.
Easily modify these lists to change which sportsbooks use which data source.
"""

# Sportsbooks that will use Pikkit as the data source
# These are typically regulated US sportsbooks with automatic tracking
PIKKIT_SPORTSBOOKS = {
    # Main regulated US sportsbooks
    'BetMGM',
    'Caesars Sportsbook', 
    'Caesars',
    'Draftkings Sportsbook', 
    'DraftKings',
    'ESPN BET', 
    'ESPNBet',
    'Fanatics',
    'Fanduel Sportsbook', 
    'FanDuel',
    
    # Additional regulated platforms
    'Fliff',
    'PrizePicks',
    'Underdog Fantasy',
    
    # Exchanges and specialized platforms
    'Novig',
    'Onyx', 
    'Onyx Odds',
    'ProphetX', 
    'Prophet X',  # Handle both spellings
    'Rebet',
    'Thrillzz',
}

# Sportsbooks that will use OddsJam as the data source
# These are typically offshore or specialty sportsbooks
ODDSJAM_SPORTSBOOKS = {
    # Major offshore sportsbooks
    'BetNow',
    'BetOnline', 
    'BetUS',
    'BookMaker',
    'Bovada',
    'Everygame',
    'MyBookie',
    
    # Specialty and smaller books
    'Sportzino',
    'Xbet',
    'bet105',
    'betwhale',
}

# Mapping for sportsbooks with different spellings between systems
SPORTSBOOK_ALIASES = {
    # Pikkit name -> OddsJam name (or vice versa)
    'Prophet X': 'ProphetX',
    'ProphetX': 'Prophet X',
    'Draftkings Sportsbook': 'DraftKings',
    'DraftKings': 'Draftkings Sportsbook',
    'Fanduel Sportsbook': 'FanDuel',
    'FanDuel': 'Fanduel Sportsbook',
    'ESPN BET': 'ESPNBet',
    'ESPNBet': 'ESPN BET',
    'Onyx Odds': 'Onyx',
    'Onyx': 'Onyx Odds',
    'Caesars Sportsbook': 'Caesars',
    'Caesars': 'Caesars Sportsbook',
}

def get_normalized_sportsbook_name(sportsbook_name: str) -> str:
    """
    Normalize sportsbook names to handle spelling differences.
    Returns the canonical name for the sportsbook.
    """
    if not sportsbook_name:
        return ''
    
    normalized = sportsbook_name.strip()
    
    # Check if this is an alias and return the canonical name
    if normalized in SPORTSBOOK_ALIASES:
        return SPORTSBOOK_ALIASES[normalized]
    
    return normalized

def determine_data_source(sportsbook_name: str) -> str:
    """
    Determine which data source (pikkit or oddsjam) should be used
    for a given sportsbook based on the configuration above.
    """
    if not sportsbook_name:
        return 'oddsjam'  # Default fallback
    
    # Normalize the name first
    normalized_name = get_normalized_sportsbook_name(sportsbook_name)
    
    # Check Pikkit sportsbooks (including original name and normalized name)
    if sportsbook_name in PIKKIT_SPORTSBOOKS or normalized_name in PIKKIT_SPORTSBOOKS:
        return 'pikkit'
    
    # Check OddsJam sportsbooks (including original name and normalized name)
    if sportsbook_name in ODDSJAM_SPORTSBOOKS or normalized_name in ODDSJAM_SPORTSBOOKS:
        return 'oddsjam'
    
    # Default to OddsJam for unmapped sportsbooks
    return 'oddsjam'

def get_pikkit_sportsbooks() -> set:
    """Get the set of sportsbooks that should use Pikkit."""
    return PIKKIT_SPORTSBOOKS

def get_oddsjam_sportsbooks() -> set:
    """Get the set of sportsbooks that should use OddsJam."""
    return ODDSJAM_SPORTSBOOKS

def get_all_configured_sportsbooks() -> dict:
    """Get all configured sportsbooks organized by source."""
    return {
        'pikkit': list(PIKKIT_SPORTSBOOKS),
        'oddsjam': list(ODDSJAM_SPORTSBOOKS),
        'aliases': SPORTSBOOK_ALIASES
    }

# Validation function to check for conflicts
def validate_configuration():
    """
    Validate the sportsbook configuration to ensure no conflicts.
    Returns a dict with any issues found.
    """
    issues = {
        'overlaps': [],
        'alias_conflicts': [],
        'warnings': []
    }
    
    # Check for overlaps between Pikkit and OddsJam sets
    overlaps = PIKKIT_SPORTSBOOKS.intersection(ODDSJAM_SPORTSBOOKS)
    if overlaps:
        issues['overlaps'] = list(overlaps)
    
    # Check for alias conflicts
    for alias, canonical in SPORTSBOOK_ALIASES.items():
        if alias in PIKKIT_SPORTSBOOKS and canonical in ODDSJAM_SPORTSBOOKS:
            issues['alias_conflicts'].append(f"{alias} -> {canonical}")
        elif alias in ODDSJAM_SPORTSBOOKS and canonical in PIKKIT_SPORTSBOOKS:
            issues['alias_conflicts'].append(f"{alias} -> {canonical}")
    
    return issues

# Run validation when module is imported
if __name__ == "__main__":
    print("Sportsbook Configuration Summary:")
    print(f"Pikkit sportsbooks: {len(PIKKIT_SPORTSBOOKS)}")
    print(f"OddsJam sportsbooks: {len(ODDSJAM_SPORTSBOOKS)}")
    print(f"Aliases configured: {len(SPORTSBOOK_ALIASES)}")
    
    issues = validate_configuration()
    if any(issues.values()):
        print("\n⚠️  Configuration Issues Found:")
        if issues['overlaps']:
            print(f"  Overlapping sportsbooks: {issues['overlaps']}")
        if issues['alias_conflicts']:
            print(f"  Alias conflicts: {issues['alias_conflicts']}")
        if issues['warnings']:
            print(f"  Warnings: {issues['warnings']}")
    else:
        print("\n✅ Configuration validated successfully!")
    
    print(f"\nPikkit Sportsbooks ({len(PIKKIT_SPORTSBOOKS)}):")
    for sb in sorted(PIKKIT_SPORTSBOOKS):
        print(f"  - {sb}")
    
    print(f"\nOddsJam Sportsbooks ({len(ODDSJAM_SPORTSBOOKS)}):")
    for sb in sorted(ODDSJAM_SPORTSBOOKS):
        print(f"  - {sb}")
    
    if SPORTSBOOK_ALIASES:
        print(f"\nSportsbook Aliases ({len(SPORTSBOOK_ALIASES)}):")
        for alias, canonical in SPORTSBOOK_ALIASES.items():
            print(f"  - {alias} → {canonical}")