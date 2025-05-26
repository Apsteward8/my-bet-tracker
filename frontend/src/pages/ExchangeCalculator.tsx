// pages/SharpExposurePage.tsx
import { useState, useEffect } from "react";

export default function SharpExposurePage() {
  const [availableOdds, setAvailableOdds] = useState<number>(0);
  const [availableLiquidity, setAvailableLiquidity] = useState<number>(0);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [calculation, setCalculation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle odds input change
  const handleOddsChange = (value: string) => {
    const parsedValue = parseInt(value, 10) || 0;
    setAvailableOdds(parsedValue);
  };

  // Handle liquidity input change
  const handleLiquidityChange = (value: string) => {
    const parsedValue = parseFloat(value) || 0;
    setAvailableLiquidity(parsedValue);
  };

  // Calculate when inputs change
  useEffect(() => {
    try {
      if (availableOdds !== 0 && availableLiquidity > 0) {
        // Calculate sharp's position
        const sharpOdds = -availableOdds;
        let sharpStake = 0;
        
        // Calculate the sharp's stake based on American odds
        if (availableOdds > 0) {
          sharpStake = availableLiquidity * (availableOdds / 100);
        } else {
          sharpStake = availableLiquidity * (100 / Math.abs(availableOdds));
        }
        
        // Calculate sharp's potential payout
        let sharpPayout = 0;
        if (sharpOdds > 0) {
          sharpPayout = sharpStake + (sharpStake * (sharpOdds / 100));
        } else {
          sharpPayout = sharpStake + (sharpStake * (100 / Math.abs(sharpOdds)));
        }
        
        // Determine recommendation based on payout threshold
        let recommendedStake = 0;
        let recommendation = "";
        
        if (sharpPayout < 750) {
          // For payouts below $750, use OddsJam minimum
          recommendedStake = 5;
          recommendation = "OddsJam Minimum";
        } else if (sharpPayout >= 750 && sharpPayout <= 2000) {
          // For payouts between $750-$2000, skip the bet
          recommendedStake = 0;
          recommendation = "Skip - Gray Area";
        } else {
          // For payouts above $2000, use scaling factor
          // $10 per $2000 in potential payout
          recommendedStake = sharpPayout * (10 / 2000);
          recommendation = "Sharp Copy";
        }
        
        // Calculate potential profit
        let potentialProfit = 0;
        if (sharpOdds > 0) {
          potentialProfit = recommendedStake * (sharpOdds / 100);
        } else {
          potentialProfit = recommendedStake * (100 / Math.abs(sharpOdds));
        }
        
        // Store all calculated values
        setCalculation({
          availableOdds,
          availableLiquidity,
          sharpOdds,
          sharpStake,
          sharpPayout,
          recommendedStake,
          potentialProfit,
          recommendation
        });
      } else {
        setCalculation(null);
      }
      
      setError(null);
    } catch (err) {
      console.error("Calculation error:", err);
      setError("Error in calculation. Please check your inputs.");
      setCalculation(null);
    }
  }, [availableOdds, availableLiquidity]);

  // Format money for display
  const formatMoney = (value: number | undefined | null) => {
    if (value === undefined || value === null) return "$0";
    return "$" + value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">Sharp Bettor Copier Calculator</h1>
      <p className="text-gray-600 mb-6">Find and copy the wagers made by sharp bettors on betting exchanges</p>
      
      {/* Settings Toggle Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md flex items-center gap-2 hover:bg-gray-300"
        >
          <span>{showSettings ? "Hide Settings" : "Show Settings"}</span>
          <span>{showSettings ? "▲" : "▼"}</span>
        </button>
      </div>
      
      {/* Settings Panel - Only visible when showSettings is true */}
      {showSettings && (
        <div className="bg-white p-6 rounded-lg shadow mb-6 border-l-4 border-blue-500">
          <h2 className="text-xl font-semibold mb-4">Calculator Settings</h2>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Betting Rules</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
              <li>For sharp payouts <strong>under $750</strong>: Use OddsJam minimum bet ($5)</li>
              <li>For sharp payouts <strong>between $750 and $2,000</strong>: Skip these bets (gray area)</li>
              <li>For sharp payouts <strong>over $2,000</strong>: Bet $10 per $2,000 in payout</li>
            </ul>
          </div>
        </div>
      )}
      
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Betting Market Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Available American Odds (e.g. +200, -110)
            </label>
            <input
              type="number"
              value={availableOdds === 0 ? "" : availableOdds}
              onChange={(e) => handleOddsChange(e.target.value)}
              className="w-full p-3 border rounded-md"
              placeholder="Enter American odds"
            />
            <p className="text-sm text-gray-500 mt-1">
              The odds you see available to bet on the exchange
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Available Liquidity ($)
            </label>
            <input
              type="number"
              value={availableLiquidity === 0 ? "" : availableLiquidity}
              onChange={(e) => handleLiquidityChange(e.target.value)}
              className="w-full p-3 border rounded-md"
              placeholder="Enter available liquidity"
            />
            <p className="text-sm text-gray-500 mt-1">
              The amount available to be bet at these odds
            </p>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}
      
      {calculation && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Sharp Exposure Analysis</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="border p-4 rounded-lg bg-blue-50">
              <h3 className="font-medium text-lg mb-3">Available on Exchange</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Odds:</span>
                  <span className="font-medium">
                    {calculation.availableOdds > 0 ? `+${calculation.availableOdds}` : calculation.availableOdds}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Available Liquidity:</span>
                  <span className="font-medium">{formatMoney(calculation.availableLiquidity)}</span>
                </div>
              </div>
            </div>
            
            <div className="border p-4 rounded-lg bg-green-50">
              <h3 className="font-medium text-lg mb-3">Sharp Bettor Position (You'll Copy This)</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Sharp's Odds:</span>
                  <span className="font-medium font-bold text-green-700">
                    {calculation.sharpOdds > 0 ? `+${calculation.sharpOdds}` : calculation.sharpOdds}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sharp's Stake:</span>
                  <span className="font-medium">{formatMoney(calculation.sharpStake)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sharp's Potential Payout:</span>
                  <span className="font-medium">{formatMoney(calculation.sharpPayout)}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 rounded-lg bg-gray-50">
            <h3 className="font-medium text-lg mb-3">Your Bet (Copying the Sharp)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-white rounded-lg shadow">
                <div className="text-gray-600 text-sm">Your Bet Size</div>
                <div className="text-2xl font-bold text-green-700">
                  {calculation.recommendedStake > 0 
                    ? formatMoney(calculation.recommendedStake)
                    : "No Bet"}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {calculation.recommendedStake > 0 
                    ? `at odds of ${calculation.sharpOdds > 0 ? `+${calculation.sharpOdds}` : calculation.sharpOdds}`
                    : `${calculation.recommendation}`}
                </div>
              </div>
              
              <div className="p-3 bg-white rounded-lg shadow">
                <div className="text-gray-600 text-sm">
                  {calculation.recommendedStake > 0 ? "Potential Profit" : "Decision Rule"}
                </div>
                <div className={`text-2xl font-bold ${calculation.recommendedStake > 0 ? "text-blue-700" : "text-yellow-600"}`}>
                  {calculation.recommendedStake > 0 
                    ? formatMoney(calculation.potentialProfit)
                    : `${calculation.recommendation}`}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {calculation.recommendedStake > 0 
                    ? "if your bet wins"
                    : calculation.recommendation === "Skip - Gray Area" 
                      ? "Payout between $750-$2000"
                      : "Following optimal strategy"}
                </div>
              </div>
              
              <div className="p-3 bg-white rounded-lg shadow">
                <div className="text-gray-600 text-sm">Sharp's Payout</div>
                <div className={`text-2xl font-bold ${
                  calculation.sharpPayout < 750 
                    ? "text-red-600" 
                    : calculation.sharpPayout <= 2000 
                      ? "text-yellow-600" 
                      : "text-green-700"
                }`}>
                  {formatMoney(calculation.sharpPayout)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {calculation.sharpPayout < 750 
                    ? "Low confidence" 
                    : calculation.sharpPayout <= 2000 
                      ? "Medium confidence" 
                      : "High confidence"}
                </div>
              </div>
            </div>
            
            {/* Recommendation */}
            <div className={`mt-4 p-3 rounded-lg border ${
              calculation.recommendedStake === 0 
                ? "bg-yellow-50 border-yellow-200 text-yellow-800" 
                : "bg-green-50 border-green-200 text-green-800"
            }`}>
              <div className="font-medium mb-1">
                {calculation.recommendation === "Skip - Gray Area" 
                  ? "⚠️ Skip This Bet" 
                  : calculation.recommendation === "OddsJam Minimum" 
                    ? "ℹ️ Use OddsJam Minimum" 
                    : "✅ Copy Sharp Bettor"}
              </div>
              <div className="text-sm">
                {calculation.recommendation === "Skip - Gray Area" 
                  ? "This bet falls in the gray area (payout between $750-$2000). Skip this bet based on our optimized strategy." 
                  : calculation.recommendation === "OddsJam Minimum" 
                    ? "Sharp payout is below $750. Recommend using the OddsJam minimum bet of $5."
                    : `Sharp has high confidence (payout over $2,000). Bet ${formatMoney(calculation.recommendedStake)} at ${calculation.sharpOdds > 0 ? "+" : ""}${calculation.sharpOdds}.`}
              </div>
            </div>
          </div>
          
          {/* Confidence Level Indicator */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-4">Confidence Level Indicator</h3>
            <div className="h-8 bg-gray-200 rounded-lg flex overflow-hidden relative">
              {/* Confidence level bar */}
              <div 
                className={`h-full ${
                  calculation.sharpPayout < 750 
                    ? "bg-red-500" 
                    : calculation.sharpPayout <= 2000 
                      ? "bg-yellow-500" 
                      : "bg-green-500"
                }`}
                style={{ width: `${Math.min((calculation.sharpPayout / 5000) * 100, 100)}%` }}
              >
              </div>
              
              {/* Threshold markers */}
              <div className="absolute inset-0 flex items-center">
                <div className="w-full px-4 flex justify-between text-xs text-white font-bold">
                  <span>$0</span>
                  <span className="relative">
                    $750
                    <div className="absolute h-8 w-px bg-white opacity-50 top-0 transform -translate-x-1/2 -translate-y-3"></div>
                  </span>
                  <span className="relative">
                    $2,000
                    <div className="absolute h-8 w-px bg-white opacity-50 top-0 transform -translate-x-1/2 -translate-y-3"></div>
                  </span>
                  <span>$5,000+</span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between mt-2 text-xs">
              <div className="text-red-700">Skip / Minimum</div>
              <div className="text-yellow-700">Gray Area - Skip</div>
              <div className="text-green-700">Strong Sharp Signal</div>
            </div>
            
            <div className="mt-4 text-center">
              <div className="text-sm font-medium">Sharp's Potential Payout</div>
              <div className="text-lg font-bold">{formatMoney(calculation.sharpPayout)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Explanation section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">How This Calculator Works</h2>
        
        <div className="space-y-4 text-gray-700">
          <p>
            The Sharp Bettor Copier Calculator helps you find and copy sharp bettors on betting exchanges 
            based on optimal bankroll management rules. The calculator examines available liquidity to 
            identify sharp bettor positions and applies strategic filtering rules.
          </p>
          
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium mb-2">Optimized Betting Rules</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>For sharp payouts under $750</strong>: Use OddsJam minimum bet of $5 (low confidence)</li>
              <li><strong>For sharp payouts between $750-$2,000</strong>: Skip these bets (gray area)</li>
              <li><strong>For sharp payouts over $2,000</strong>: Bet $10 per $2,000 in payout (high confidence signal)</li>
            </ul>
          </div>
          
          <p>
            <strong>Example:</strong> If you see $1,000 available to bet at +200 odds, a sharp has placed
            $2,000 at -200 odds with a potential payout of $3,000. Since this exceeds the $2,000 threshold,
            the calculator recommends betting $15 (for $3,000 ÷ $2,000 × $10) on the same side as the sharp.
          </p>
          
          <p>
            The calculator helps you focus on the most confident sharp plays while avoiding questionable
            opportunities in the gray area, optimizing your betting strategy based on sharp activity.
          </p>
        </div>
        
        <div className="flex justify-end mt-4">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            {showSettings ? "Hide Settings" : "Adjust Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}