// pages/ExchangeCalculator.tsx
import { useState, useEffect } from "react";

interface SharpExposureCalculation {
  // Input values
  availableOdds: number;
  availableLiquidity: number;
  
  // Calculated sharp side values
  sharpOdds: number;
  sharpStake: number;
  sharpPayout: number;
  
  // Recommended bet values
  recommendedStake: number;
  potentialProfit: number;
  payoutRatio: number;
}

export default function ExchangeCalculator() {
  const [availableOdds, setAvailableOdds] = useState<number>(0);
  const [availableLiquidity, setAvailableLiquidity] = useState<number>(0);
  const [payoutScaleFactor, setPayoutScaleFactor] = useState<number>(0.005); // $1 per $200 of payout (0.5%)
  const [maxBetSize, setMaxBetSize] = useState<number>(100); // Default max bet of $100
  const [calculation, setCalculation] = useState<SharpExposureCalculation | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Calculate opposing odds (convert from American to decimal and back)
  const calculateSharpOdds = (americanOdds: number): number => {
    if (americanOdds === 0) return 0;
    // The opposing odds are just the negative of the original odds
    return -americanOdds;
  };

  // Calculate sharp's stake based on odds and available liquidity
  const calculateSharpStake = (
    americanOdds: number,
    liquidity: number
  ): number => {
    if (americanOdds === 0 || liquidity === 0) return 0;

    // Calculate the sharp's stake based on American odds
    if (americanOdds > 0) {
      // For positive odds (e.g., +200)
      // If $1000 is available at +200, someone bet $2000 at -200
      return liquidity * (americanOdds / 100);
    } else {
      // For negative odds (e.g., -150)
      // If $1000 is available at -150, someone bet $666.67 at +150
      return liquidity * (100 / Math.abs(americanOdds));
    }
  };

  // Calculate sharp's potential payout (stake + profit)
  const calculateSharpPayout = (
    americanOdds: number,
    stake: number
  ): number => {
    if (americanOdds === 0 || stake === 0) return 0;

    if (americanOdds > 0) {
      // For +200 odds, a $100 stake yields $300 payout ($100 stake + $200 profit)
      return stake + (stake * (americanOdds / 100));
    } else {
      // For -150 odds, a $150 stake yields $250 payout ($150 stake + $100 profit)
      return stake + (stake * (100 / Math.abs(americanOdds)));
    }
  };

  // Calculate potential profit based on odds and stake
  const calculatePotentialProfit = (odds: number, stake: number): number => {
    if (odds === 0 || stake === 0) return 0;
    
    // Calculate for the sharp's odds, since we're copying their bet
    const sharpOdds = -odds;
    
    if (sharpOdds > 0) {
      return stake * (sharpOdds / 100);
    } else {
      return stake * (100 / Math.abs(sharpOdds));
    }
  };

  // Calculate recommended stake based on sharp's payout and scaling factor
  const calculateRecommendedStake = (
    payout: number,
    scaleFactor: number,
    maxBet: number
  ): number => {
    if (payout === 0) return 0;

    // Calculate stake based on payout
    let recommendedStake = payout * scaleFactor;
    
    // Cap at maximum bet size
    recommendedStake = Math.min(recommendedStake, maxBet);
    
    // Return with 2 decimal places
    return parseFloat(recommendedStake.toFixed(2));
  };

  // Calculate when inputs change
  useEffect(() => {
    if (availableOdds !== 0 && availableLiquidity > 0) {
      try {
        // Calculate sharp side information
        const sharpOdds = calculateSharpOdds(availableOdds);
        const sharpStake = calculateSharpStake(availableOdds, availableLiquidity);
        const sharpPayout = calculateSharpPayout(sharpOdds, sharpStake);
        
        // Calculate recommended stake and potential profit
        const recommendedStake = calculateRecommendedStake(
          sharpPayout, 
          payoutScaleFactor, 
          maxBetSize
        );
        
        const potentialProfit = calculatePotentialProfit(availableOdds, recommendedStake);
        
        // Calculate payout ratio (how much you bet per $1000 of sharp payout)
        const payoutRatio = recommendedStake / (sharpPayout / 1000);
        
        setCalculation({
          availableOdds,
          availableLiquidity,
          sharpOdds,
          sharpStake,
          sharpPayout,
          recommendedStake,
          potentialProfit,
          payoutRatio
        });
        
        setError(null);
      } catch (err) {
        setError("Error in calculation. Please check your inputs.");
        setCalculation(null);
      }
    } else {
      setCalculation(null);
    }
  }, [availableOdds, availableLiquidity, payoutScaleFactor, maxBetSize]);

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

  // Handle payout ratio change
  const handlePayoutScaleChange = (value: string) => {
    const parsedValue = parseFloat(value) || 0;
    const factor = parsedValue / 200; // Convert from $x per $200 to percentage
    setPayoutScaleFactor(factor);
  };

  // Handle max bet size change
  const handleMaxBetSizeChange = (value: string) => {
    const parsedValue = parseFloat(value) || 0;
    setMaxBetSize(parsedValue);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">Sharp Bettor Copier Calculator</h1>
      <p className="text-gray-600 mb-6">Find and copy the wagers made by sharp bettors on betting exchanges</p>
      
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
      
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Your Betting Parameters</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bet Size per $200 of Sharp Payout ($)
            </label>
            <div className="flex items-center">
              <span className="mr-2">$</span>
              <input
                type="number"
                value={payoutScaleFactor * 200}
                onChange={(e) => handlePayoutScaleChange(e.target.value)}
                className="w-full p-3 border rounded-md"
                placeholder="Enter amount"
                step="0.1"
                min="0.1"
              />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Default: $1 per $200 of sharp's potential payout
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Bet Size ($)
            </label>
            <div className="flex items-center">
              <span className="mr-2">$</span>
              <input
                type="number"
                value={maxBetSize}
                onChange={(e) => handleMaxBetSizeChange(e.target.value)}
                className="w-full p-3 border rounded-md"
                placeholder="Enter maximum bet"
                min="0"
              />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Your maximum bet regardless of calculation
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
                  <span className="font-medium">${calculation.availableLiquidity.toFixed(2)}</span>
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
                  <span className="font-medium">${calculation.sharpStake.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sharp's Potential Payout:</span>
                  <span className="font-medium">${calculation.sharpPayout.toFixed(2)}</span>
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
                  ${calculation.recommendedStake.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  at odds of {calculation.sharpOdds > 0 ? `+${calculation.sharpOdds}` : calculation.sharpOdds}
                </div>
              </div>
              
              <div className="p-3 bg-white rounded-lg shadow">
                <div className="text-gray-600 text-sm">Potential Profit</div>
                <div className="text-2xl font-bold text-blue-700">
                  ${calculation.potentialProfit.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  if your bet wins
                </div>
              </div>
              
              <div className="p-3 bg-white rounded-lg shadow">
                <div className="text-gray-600 text-sm">Scale Used</div>
                <div className="text-2xl font-bold text-purple-700">
                  ${calculation.payoutRatio.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  per $1,000 of sharp payout
                </div>
              </div>
            </div>
          </div>
          
          {/* Visual representation */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-4">Sharp Payout vs Your Stake</h3>
            <div className="h-8 bg-gray-200 rounded-lg flex overflow-hidden mb-2 relative">
              {/* Sharp's payout bar */}
              <div 
                className="bg-blue-500 h-full flex-grow"
                style={{ width: '100%' }}
              >
                <div className="absolute inset-0 flex items-center justify-center text-white font-medium">
                  Sharp's Payout: ${Math.round(calculation.sharpPayout)}
                </div>
              </div>
            </div>
            
            <div className="h-8 bg-gray-200 rounded-lg flex overflow-hidden relative">
              {/* Your stake bar */}
              <div 
                className="bg-green-500 h-full"
                style={{ width: `${(calculation.recommendedStake / calculation.sharpPayout) * 100}%` }}
              >
                <div className="absolute inset-0 flex items-center px-2 text-white font-medium text-sm">
                  Your Stake: ${calculation.recommendedStake.toFixed(2)}
                </div>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mt-2">
              Scale: ${(payoutScaleFactor * 200).toFixed(2)} per $200 of sharp payout
              ({(payoutScaleFactor * 100).toFixed(2)}%)
            </p>
          </div>
          
          <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
            <h3 className="font-medium mb-2">Explanation</h3>
            <p className="text-gray-700">
              Based on the available liquidity of <strong>${calculation.availableLiquidity.toFixed(2)}</strong> at odds of{" "}
              <strong>{calculation.availableOdds > 0 ? `+${calculation.availableOdds}` : calculation.availableOdds}</strong>,
              we've calculated that a sharp bettor likely placed{" "}
              <strong>${calculation.sharpStake.toFixed(2)}</strong> at odds of{" "}
              <strong>{calculation.sharpOdds > 0 ? `+${calculation.sharpOdds}` : calculation.sharpOdds}</strong>.
            </p>
            <p className="text-gray-700 mt-2">
              <strong>You will copy the sharp's bet</strong>, taking the same side at the same odds of{" "}
              <strong>{calculation.sharpOdds > 0 ? `+${calculation.sharpOdds}` : calculation.sharpOdds}</strong>.
              Their potential payout would be <strong>${calculation.sharpPayout.toFixed(2)}</strong> if they win.
            </p>
            <p className="text-gray-700 mt-2">
              Based on your settings, we recommend betting <strong>${calculation.recommendedStake.toFixed(2)}</strong>,
              which is <strong>${calculation.payoutRatio.toFixed(2)}</strong> per $1,000 of sharp payout.
              Your potential profit if this bet wins will be <strong>${calculation.potentialProfit.toFixed(2)}</strong>.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">How This Calculator Works</h2>
        
        <div className="space-y-4 text-gray-700">
          <p>
            The Sharp Exposure Calculator helps you find and copy sharp bettors on betting exchanges.
            When you see available liquidity, that amount is there because a sharp bettor has placed
            a bet on the opposite side.
          </p>
          
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium mb-2">Example</h3>
            <p>
              If you see $1,000 available to be bet at +200 odds on an exchange, this means that
              a sharp bettor has placed $2,000 at -200 odds. Your strategy is to copy this sharp
              bettor by placing a bet at the same -200 odds, scaled appropriately for your bankroll.
            </p>
            <p className="mt-2">
              The sharp's potential payout if they win would be $3,000 (their $2,000 stake + $1,000 profit).
              Using the default setting of $1 per $200 of sharp payout, you would bet $15 (for $3,000 ÷ 200 = $15)
              on the same side as the sharp (-200 odds).
            </p>
          </div>
          
          <p>
            <strong>Copying Sharp Bettors:</strong> This calculator identifies where sharp money is placed
            on betting exchanges and helps you follow their action with an appropriately sized bet for your bankroll.
          </p>
          
          <p>
            <strong>Adjusting Your Scale Factor:</strong> If you want to bet more or less
            aggressively, you can adjust the "Bet Size per $200 of Sharp Payout" setting.
            The default is $1 per $200, which is equivalent to $5 per $1,000 of sharp payout
            or $30 per $6,000 of payout.
          </p>
          
          <p>
            <strong>Maximum Bet Protection:</strong> The maximum bet size setting ensures
            you never bet more than you're comfortable with, regardless of how large the
            sharp's position might be.
          </p>
        </div>
      </div>
    </div>
  );
}