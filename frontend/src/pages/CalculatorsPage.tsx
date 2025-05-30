// frontend/src/pages/CalculatorsPage.tsx
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/Tabs";

interface BettingCalculation {
  stake: number;
  americanOdds: number;
  decimalOdds: number;
  fractionalOdds: string;
  impliedProbability: number;
  toWin: number;
  payout: number;
}

export default function CalculatorsPage() {
  const [betType, setBetType] = useState<"single" | "parlay">("single");
  
  // Separate input values (what user types) from calculated values (what we display in results)
  const [inputValues, setInputValues] = useState({
    stake: "",
    americanOdds: "100",
    decimalOdds: "2.00",
    fractionalOdds: "1/1",
    impliedProbability: "50.00",
    toWin: "",
    payout: "",
  });

  const [calculation, setCalculation] = useState<BettingCalculation>({
    stake: 0,
    americanOdds: 100,
    decimalOdds: 2.0,
    fractionalOdds: "1/1",
    impliedProbability: 50,
    toWin: 0,
    payout: 0,
  });

  // Conversion functions
  const americanToDecimal = (american: number): number => {
    if (american > 0) {
      return (american / 100) + 1;
    } else {
      return (100 / Math.abs(american)) + 1;
    }
  };

  const decimalToAmerican = (decimal: number): number => {
    if (decimal >= 2.0) {
      return Math.round((decimal - 1) * 100);
    } else {
      return Math.round(-100 / (decimal - 1));
    }
  };

  const decimalToFractional = (decimal: number): string => {
    const fraction = decimal - 1;
    const denominator = 100;
    const numerator = Math.round(fraction * denominator);
    
    const gcd = (a: number, b: number): number => {
      return b === 0 ? a : gcd(b, a % b);
    };
    
    const divisor = gcd(numerator, denominator);
    const simplifiedNum = numerator / divisor;
    const simplifiedDen = denominator / divisor;
    
    return `${simplifiedNum}/${simplifiedDen}`;
  };

  const fractionalToDecimal = (fractional: string): number => {
    const parts = fractional.split('/');
    if (parts.length !== 2) return 2.0;
    
    const numerator = parseFloat(parts[0]);
    const denominator = parseFloat(parts[1]);
    
    if (denominator === 0 || isNaN(numerator) || isNaN(denominator)) return 2.0;
    
    return (numerator / denominator) + 1;
  };

  const decimalToImpliedProbability = (decimal: number): number => {
    return (1 / decimal) * 100;
  };

  const impliedProbabilityToDecimal = (probability: number): number => {
    return 100 / probability;
  };

  // Simple validation - just check if we can parse numbers
  const canParseAsNumber = (value: string): boolean => {
    const num = parseFloat(value);
    return !isNaN(num);
  };

  const canParseAsAmericanOdds = (value: string): boolean => {
    const num = parseFloat(value);
    return !isNaN(num) && num !== 0 && Math.abs(num) >= 100;
  };

  const canParseAsDecimalOdds = (value: string): boolean => {
    const num = parseFloat(value);
    return !isNaN(num) && num > 1;
  };

  const canParseAsFractionalOdds = (value: string): boolean => {
    const parts = value.split('/');
    if (parts.length !== 2) return false;
    
    const numerator = parseFloat(parts[0]);
    const denominator = parseFloat(parts[1]);
    
    return !isNaN(numerator) && !isNaN(denominator) && denominator !== 0;
  };

  const canParseAsProbability = (value: string): boolean => {
    const num = parseFloat(value);
    return !isNaN(num) && num > 0 && num < 100;
  };

  // Calculate everything from stake and decimal odds
  const calculateFromStakeAndDecimal = (stake: number, decimal: number) => {
    const toWin = stake * (decimal - 1);
    const payout = stake * decimal;
    
    const newCalculation = {
      stake,
      americanOdds: decimalToAmerican(decimal),
      decimalOdds: decimal,
      fractionalOdds: decimalToFractional(decimal),
      impliedProbability: decimalToImpliedProbability(decimal),
      toWin,
      payout,
    };

    setCalculation(newCalculation);
    
    // Update other input fields to match (but don't update the field that triggered this)
    setInputValues(prev => ({
      ...prev,
      americanOdds: newCalculation.americanOdds.toString(),
      decimalOdds: newCalculation.decimalOdds.toFixed(2),
      fractionalOdds: newCalculation.fractionalOdds,
      impliedProbability: newCalculation.impliedProbability.toFixed(2),
      toWin: newCalculation.toWin.toFixed(2),
      payout: newCalculation.payout.toFixed(2),
    }));
  };

  // Handle input changes
  const handleStakeChange = (value: string) => {
    setInputValues(prev => ({ ...prev, stake: value }));
    
    if (canParseAsNumber(value) && parseFloat(value) > 0) {
      calculateFromStakeAndDecimal(parseFloat(value), calculation.decimalOdds);
    }
  };

  const handleAmericanOddsChange = (value: string) => {
    setInputValues(prev => ({ ...prev, americanOdds: value }));
    
    if (canParseAsAmericanOdds(value)) {
      const decimal = americanToDecimal(parseFloat(value));
      const stake = canParseAsNumber(inputValues.stake) ? parseFloat(inputValues.stake) : 0;
      calculateFromStakeAndDecimal(stake, decimal);
    }
  };

  const handleDecimalOddsChange = (value: string) => {
    setInputValues(prev => ({ ...prev, decimalOdds: value }));
    
    if (canParseAsDecimalOdds(value)) {
      const stake = canParseAsNumber(inputValues.stake) ? parseFloat(inputValues.stake) : 0;
      calculateFromStakeAndDecimal(stake, parseFloat(value));
    }
  };

  const handleFractionalOddsChange = (value: string) => {
    setInputValues(prev => ({ ...prev, fractionalOdds: value }));
    
    if (canParseAsFractionalOdds(value)) {
      const decimal = fractionalToDecimal(value);
      const stake = canParseAsNumber(inputValues.stake) ? parseFloat(inputValues.stake) : 0;
      calculateFromStakeAndDecimal(stake, decimal);
    }
  };

  const handleImpliedProbabilityChange = (value: string) => {
    setInputValues(prev => ({ ...prev, impliedProbability: value }));
    
    if (canParseAsProbability(value)) {
      const decimal = impliedProbabilityToDecimal(parseFloat(value));
      const stake = canParseAsNumber(inputValues.stake) ? parseFloat(inputValues.stake) : 0;
      calculateFromStakeAndDecimal(stake, decimal);
    }
  };

  const handleToWinChange = (value: string) => {
    setInputValues(prev => ({ ...prev, toWin: value }));
    
    if (canParseAsNumber(value) && parseFloat(value) > 0) {
      const toWin = parseFloat(value);
      const stake = toWin / (calculation.decimalOdds - 1);
      
      // Calculate new values
      const newCalculation = {
        stake,
        americanOdds: calculation.americanOdds,
        decimalOdds: calculation.decimalOdds,
        fractionalOdds: calculation.fractionalOdds,
        impliedProbability: calculation.impliedProbability,
        toWin,
        payout: stake * calculation.decimalOdds,
      };

      setCalculation(newCalculation);
      
      // Only update OTHER fields, not the one being typed in
      setInputValues(prev => ({
        ...prev,
        stake: stake.toFixed(2),
        payout: (stake * calculation.decimalOdds).toFixed(2),
        // Don't update toWin here - let user keep typing
      }));
    }
  };

  const handlePayoutChange = (value: string) => {
    setInputValues(prev => ({ ...prev, payout: value }));
    
    if (canParseAsNumber(value) && parseFloat(value) > 0) {
      const payout = parseFloat(value);
      const stake = payout / calculation.decimalOdds;
      const toWin = stake * (calculation.decimalOdds - 1);
      
      // Calculate new values
      const newCalculation = {
        stake,
        americanOdds: calculation.americanOdds,
        decimalOdds: calculation.decimalOdds,
        fractionalOdds: calculation.fractionalOdds,
        impliedProbability: calculation.impliedProbability,
        toWin,
        payout,
      };

      setCalculation(newCalculation);
      
      // Only update OTHER fields, not the one being typed in
      setInputValues(prev => ({
        ...prev,
        stake: stake.toFixed(2),
        toWin: toWin.toFixed(2),
        // Don't update payout here - let user keep typing
      }));
    }
  };

  // Format money display
  const formatMoney = (amount: number): string => {
    return amount.toFixed(2);
  };

  // Format odds display
  const formatAmericanOdds = (odds: number): string => {
    return odds > 0 ? `+${odds}` : odds.toString();
  };

  // Load example calculations
  const loadExample = (stake: number, americanOdds: number) => {
    const decimal = americanToDecimal(americanOdds);
    calculateFromStakeAndDecimal(stake, decimal);
    setInputValues(prev => ({ ...prev, stake: stake.toString() }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">🧮 Betting Calculators</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Calculate your betting scenarios</span>
        </div>
      </div>

      <Tabs defaultValue="betting">
        <TabsList className="mb-6">
          <TabsTrigger value="betting">Betting Calculator</TabsTrigger>
          <TabsTrigger value="arbitrage">Arbitrage Calculator</TabsTrigger>
          <TabsTrigger value="kelly">Kelly Criterion</TabsTrigger>
          <TabsTrigger value="hedge">Hedge Calculator</TabsTrigger>
        </TabsList>

        <TabsContent value="betting">
          <div className="space-y-6">
            {/* Bet Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Bet Type</CardTitle>
                <CardDescription>Select the type of bet you want to calculate</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <button
                    onClick={() => setBetType("single")}
                    className={`px-4 py-2 rounded-md ${
                      betType === "single"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    Single Bet
                  </button>
                  <button
                    onClick={() => setBetType("parlay")}
                    className={`px-4 py-2 rounded-md ${
                      betType === "parlay"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    Parlay Bet
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Betting Calculator */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Input Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Bet Details</CardTitle>
                  <CardDescription>Enter your bet amount and odds in any format</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Stake */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bet Amount ($)
                    </label>
                    <input
                      type="text"
                      value={inputValues.stake}
                      onChange={(e) => handleStakeChange(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter bet amount"
                    />
                  </div>

                  {/* Odds Section */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-700">Odds (enter in any format)</h4>
                    
                    {/* American Odds */}
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        American Odds
                      </label>
                      <input
                        type="text"
                        value={inputValues.americanOdds}
                        onChange={(e) => handleAmericanOddsChange(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., +150, -110"
                      />
                    </div>

                    {/* Decimal Odds */}
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Decimal Odds
                      </label>
                      <input
                        type="text"
                        value={inputValues.decimalOdds}
                        onChange={(e) => handleDecimalOddsChange(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., 2.50, 1.91"
                      />
                    </div>

                    {/* Fractional Odds */}
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Fractional Odds
                      </label>
                      <input
                        type="text"
                        value={inputValues.fractionalOdds}
                        onChange={(e) => handleFractionalOddsChange(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., 3/2, 10/11"
                      />
                    </div>

                    {/* Implied Probability */}
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Implied Probability (%)
                      </label>
                      <input
                        type="text"
                        value={inputValues.impliedProbability}
                        onChange={(e) => handleImpliedProbabilityChange(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., 40.00"
                      />
                    </div>
                  </div>

                  {/* Alternative Inputs */}
                  <div className="space-y-4 pt-4 border-t border-gray-200">
                    <h4 className="font-medium text-gray-700">Or calculate from target amounts</h4>
                    
                    {/* Amount to Win */}
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Amount to Win ($)
                      </label>
                      <input
                        type="text"
                        value={inputValues.toWin}
                        onChange={(e) => handleToWinChange(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter amount you want to win"
                      />
                    </div>

                    {/* Total Payout */}
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Total Payout ($)
                      </label>
                      <input
                        type="text"
                        value={inputValues.payout}
                        onChange={(e) => handlePayoutChange(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter total payout"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Results Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Calculation Results</CardTitle>
                  <CardDescription>Your bet calculation breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Summary */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-3">Bet Summary</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-blue-700">Bet Amount:</span>
                          <span className="font-medium">${formatMoney(calculation.stake)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Odds:</span>
                          <span className="font-medium">{formatAmericanOdds(calculation.americanOdds)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Amount to Win:</span>
                          <span className="font-medium text-green-600">${formatMoney(calculation.toWin)}</span>
                        </div>
                        <div className="flex justify-between border-t border-blue-200 pt-2">
                          <span className="text-blue-700 font-semibold">Total Payout:</span>
                          <span className="font-bold text-lg">${formatMoney(calculation.payout)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Odds Formats */}
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-3">Odds in All Formats</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 rounded">
                          <div className="text-sm text-gray-600">American</div>
                          <div className="font-medium">{formatAmericanOdds(calculation.americanOdds)}</div>
                        </div>
                        <div className="p-3 bg-gray-50 rounded">
                          <div className="text-sm text-gray-600">Decimal</div>
                          <div className="font-medium">{calculation.decimalOdds.toFixed(2)}</div>
                        </div>
                        <div className="p-3 bg-gray-50 rounded">
                          <div className="text-sm text-gray-600">Fractional</div>
                          <div className="font-medium">{calculation.fractionalOdds}</div>
                        </div>
                        <div className="p-3 bg-gray-50 rounded">
                          <div className="text-sm text-gray-600">Implied %</div>
                          <div className="font-medium">{calculation.impliedProbability.toFixed(2)}%</div>
                        </div>
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-3">Profit Breakdown</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Initial Stake:</span>
                          <span className="font-medium">${formatMoney(calculation.stake)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Profit if Win:</span>
                          <span className="font-medium text-green-600">+${formatMoney(calculation.toWin)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Loss if Lose:</span>
                          <span className="font-medium text-red-600">-${formatMoney(calculation.stake)}</span>
                        </div>
                        <div className="flex justify-between border-t border-gray-200 pt-2">
                          <span className="text-gray-600">Break-even %:</span>
                          <span className="font-medium">{calculation.impliedProbability.toFixed(2)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Examples */}
            <Card>
              <CardHeader>
                <CardTitle>Common Examples</CardTitle>
                <CardDescription>Click any example to load it into the calculator</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => loadExample(100, 100)}
                    className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium">Even Money Bet</div>
                    <div className="text-sm text-gray-600">$100 at +100 odds</div>
                    <div className="text-sm text-blue-600">Win: $100</div>
                  </button>
                  
                  <button
                    onClick={() => loadExample(110, -110)}
                    className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium">Standard Sports Bet</div>
                    <div className="text-sm text-gray-600">$110 at -110 odds</div>
                    <div className="text-sm text-blue-600">Win: $100</div>
                  </button>
                  
                  <button
                    onClick={() => loadExample(10, 300)}
                    className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium">Underdog Bet</div>
                    <div className="text-sm text-gray-600">$10 at +300 odds</div>
                    <div className="text-sm text-blue-600">Win: $30</div>
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="arbitrage">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-8">
                <div className="text-5xl mb-4">📊</div>
                <h2 className="text-xl font-semibold text-gray-700 mb-2">Arbitrage Calculator</h2>
                <p className="text-gray-500 text-center max-w-md">
                  This calculator is coming soon! It will help you find arbitrage opportunities across different sportsbooks.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kelly">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-8">
                <div className="text-5xl mb-4">📈</div>
                <h2 className="text-xl font-semibold text-gray-700 mb-2">Kelly Criterion Calculator</h2>
                <p className="text-gray-500 text-center max-w-md">
                  This calculator is coming soon! It will help you determine optimal bet sizing using the Kelly Criterion formula.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hedge">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-8">
                <div className="text-5xl mb-4">🛡️</div>
                <h2 className="text-xl font-semibold text-gray-700 mb-2">Hedge Calculator</h2>
                <p className="text-gray-500 text-center max-w-md">
                  This calculator is coming soon! It will help you calculate hedge bets to guarantee profit or minimize losses.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}