// components/BetDisplay.tsx
interface BetDisplayProps {
    bet: any;
    formatMoney: (amount: number) => string;
    getColorClass: (value: number) => string;
  }
  
  export default function BetDisplay({ bet, formatMoney, getColorClass }: BetDisplayProps) {
    // Function to format odds
    const formatOdds = (odds: number): string => {
      return odds > 0 ? `+${odds}` : odds.toString();
    };
  
    // Mobile view (card style)
    const MobileView = () => (
      <div className="mobile-card">
        <div className="font-medium mb-2 text-blue-600">{bet.event_name}</div>
        
        <div className="data-row-mobile">
          <span className="data-label">Bet</span>
          <span className="data-value">{bet.bet_name}</span>
        </div>
        
        <div className="data-row-mobile">
          <span className="data-label">Sportsbook</span>
          <span className="data-value">{bet.sportsbook}</span>
        </div>
        
        <div className="data-row-mobile">
          <span className="data-label">Odds</span>
          <span className="data-value">{formatOdds(bet.odds)}</span>
        </div>
        
        <div className="data-row-mobile">
          <span className="data-label">Stake</span>
          <span className="data-value">{formatMoney(bet.stake)}</span>
        </div>
        
        <div className="data-row-mobile">
          <span className="data-label">Profit</span>
          <span className={`data-value ${getColorClass(bet.bet_profit)}`}>
            {formatMoney(bet.bet_profit)}
          </span>
        </div>
        
        <div className="data-row-mobile border-0">
          <span className="data-label">Status</span>
          <span className="data-value">
            <span className={`status-badge ${bet.status.toLowerCase()}`}>
              {bet.status}
            </span>
          </span>
        </div>
        
        <div className="text-xs text-gray-500 mt-3">
          {new Date(bet.event_start_date).toLocaleDateString()}
        </div>
      </div>
    );
  
    return (
      <>
        {/* Show mobile view on small screens, hidden on md+ */}
        <div className="md:hidden">
          <MobileView />
        </div>
        
        {/* No desktop view needed here as it's provided in the parent component's table */}
      </>
    );
  }