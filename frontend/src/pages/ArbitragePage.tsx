// pages/ArbitragePage.tsx (with responsive updates)
import { useState, useEffect } from "react";

interface OddsInput {
  sportsbook: string;
  odds: number;
}

export default function ArbitragePage() {
  const [inputs, setInputs] = useState<OddsInput[]>([
    { sportsbook: "Sportsbook 1", odds: 0 },
    { sportsbook: "Sportsbook 2", odds: 0 },
  ]);
  const [totalStake, setTotalStake] = useState<number>(100);
  const [arbitrageExists, setArbitrageExists] = useState<boolean>(false);
  const [arbitragePercent, setArbitragePercent] = useState<number>(0);
  const [calculatedStakes, setCalculatedStakes] = useState<number[]>([]);
  const [profit, setProfit] = useState<number>(0);

  // Calculate if arbitrage opportunity exists and calculate individual stakes
  useEffect(() => {
    // Skip calculation if any odds is zero
    if (inputs.some(input => input.odds <= 0)) {
      setArbitrageExists(false);
      setArbitragePercent(0);
      setCalculatedStakes([]);
      setProfit(0);
      return;
    }

    // Calculate implied probabilities
    const impliedProbabilities = inputs.map(input => 1 / convertOddsToDecimal(input.odds));
    
    // Sum of implied probabilities
    const sumProb = impliedProbabilities.reduce((sum, prob) => sum + prob, 0);
    
    // Check if arbitrage exists (sum < 1)
    const hasArbitrage = sumProb < 1;
    setArbitrageExists(hasArbitrage);
    
    // Calculate arbitrage percentage
    const arbitragePercentage = (1 - sumProb) * 100;
    setArbitragePercent(arbitragePercentage);
    
    if (hasArbitrage) {
      // Calculate individual stakes
      const stakes = impliedProbabilities.map(prob => 
        (prob / sumProb) * totalStake
      );
      setCalculatedStakes(stakes);
      
      // Calculate guaranteed profit
      const guaranteedProfit = (totalStake / sumProb) - totalStake;
      setProfit(guaranteedProfit);
    } else {
      setCalculatedStakes([]);
      setProfit(0);
    }
  }, [inputs, totalStake]);

  // Add another sportsbook
  const addSportsbook = () => {
    setInputs([...inputs, { sportsbook: `Sportsbook ${inputs.length + 1}`, odds: 0 }]);
  };

  // Remove a sportsbook
  const removeSportsbook = (index: number) => {
    if (inputs.length <= 2) return; // Keep at least 2 inputs
    const newInputs = [...inputs];
    newInputs.splice(index, 1);
    setInputs(newInputs);
  };

  // Handle odds input change
  const handleOddsChange = (index: number, value: string) => {
    const newInputs = [...inputs];
    newInputs[index].odds = parseFloat(value) || 0;
    setInputs(newInputs);
  };

  // Handle sportsbook name change
  const handleSportsbookChange = (index: number, value: string) => {
    const newInputs = [...inputs];
    newInputs[index].sportsbook = value;
    setInputs(newInputs);
  };

  // Convert American odds to decimal
  function convertOddsToDecimal(americanOdds: number): number {
    if (americanOdds > 0) {
      return (americanOdds / 100) + 1;
    } else if (americanOdds < 0) {
      return (100 / Math.abs(americanOdds)) + 1;
    }
    return 0; // Invalid odds
  }

  return (
    <div className="py-4 lg:p-6">
      <h1 className="text-xl lg:text-2xl font-bold mb-4 lg:mb-6">Arbitrage Calculator</h1>
      
      <div className="bg-white p-4 lg:p-6 rounded-lg shadow mb-4 lg:mb-6">
        <h2 className="text-lg lg:text-xl font-semibold mb-3 lg:mb-4">Betting Odds</h2>
        
        <div className="space-y-4">
          {inputs.map((input, index) => (
            <div key={index} className="flex flex-col md:flex-row md:space-x-4 space-y-2 md:space-y-0 md:items-center">
              <div className="w-full md:w-1/3">
                <input
                  type="text"
                  value={input.sportsbook}
                  onChange={(e) => handleSportsbookChange(index, e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="Sportsbook name"
                />
              </div>
              <div className="w-full md:w-1/3">
                <input
                  type="number"
                  value={input.odds === 0 ? "" : input.odds}
                  onChange={(e) => handleOddsChange(index, e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="American odds (e.g. +150, -110)"
                />
              </div>
              {inputs.length > 2 && (
                <button
                  onClick={() => removeSportsbook(index)}
                  className="text-red-600 hover:text-red-800 md:ml-auto"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          
          <button
            onClick={addSportsbook}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 w-full md:w-auto"
          >
            Add Another Sportsbook
          </button>
        </div>
      </div>
      
      <div className="bg-white p-4 lg:p-6 rounded-lg shadow mb-4 lg:mb-6">
        <h2 className="text-lg lg:text-xl font-semibold mb-3 lg:mb-4">Total Stake</h2>
        <div className="flex items-center">
          <span className="mr-2">$</span>
          <input
            type="number"
            value={totalStake}
            onChange={(e) => setTotalStake(parseFloat(e.target.value) || 0)}
            className="w-full md:w-40 p-2 border rounded"
            min="0"
            step="10"
          />
        </div>
      </div>
      
      <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
        <h2 className="text-lg lg:text-xl font-semibold mb-3 lg:mb-4">Results</h2>
        
        {arbitrageExists ? (
          <div className="space-y-4">
            <div className="text-green-600 font-bold text-lg">
              Arbitrage opportunity found! {arbitragePercent.toFixed(2)}% edge
            </div>
            
            <div>
              <div className="font-semibold mb-2">Recommended Stakes:</div>
              <div className="space-y-2">
                {inputs.map((input, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{input.sportsbook}:</span>
                    <span className="font-medium">${calculatedStakes[index]?.toFixed(2) || "0.00"}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Guaranteed Profit:</span>
                <span className="font-bold text-green-600">${profit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="font-semibold">ROI:</span>
                <span className="font-medium">{(profit / totalStake * 100).toFixed(2)}%</span>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {inputs.some(input => input.odds <= 0) ? (
              <div className="text-gray-600">Enter valid odds to calculate arbitrage opportunities</div>
            ) : (
              <div className="text-red-600">
                No arbitrage opportunity found. The implied probability sum is {(100 + arbitragePercent).toFixed(2)}%, 
                which is {Math.abs(arbitragePercent).toFixed(2)}% over 100%.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}