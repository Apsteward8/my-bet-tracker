import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import LoadingSpinner from "../components/LoadingSpinner";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5007';

// Define types
interface Bet {
  id: number;
  event_name: string;
  bet_name: string;
  sportsbook: string;
  bet_type: string;
  odds: number;
  clv: number;
  stake: number;
  status: string;
  bet_profit: number;
  event_start_date: string;
}

interface DashboardStats {
  total_bets: number;
  winning_bets: number;
  losing_bets: number;
  pending_bets: number;
  total_stake: number;
  total_profit: number;
  roi: number;
  win_rate: number;
  sportsbooks: SportsbookStat[];
}

interface SportsbookStat {
  name: string;
  count: number;
  profit: number;
}

interface PaginatedResponse {
  current_page: number;
  items: Bet[];
  pages: number;
  total: number;
}

export default function DashboardPage() {
  // State hooks
  const [recentBets, setRecentBets] = useState<Bet[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<string>("all");

  // Helper functions
  const formatMoney = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatPercent = (value: number | null | undefined): string => {
    // Check if value is a valid number before calling toFixed
    if (value === null || value === undefined || isNaN(Number(value))) {
      return "0.00%";
    }
    return `${Number(value).toFixed(2)}%`;
  };

  const getColorClass = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(Number(value))) {
      return "text-gray-400";
    }
    const numValue = Number(value);
    if (numValue > 0) return "text-green-600";
    if (numValue < 0) return "text-red-600";
    return "text-yellow-500";
  };

  // Calculate win streak
  const calculateWinStreak = (bets: Bet[]): { current: number, longest: number } => {
    // Sort bets by date
    const sortedBets = [...bets].sort((a, b) => 
      new Date(b.event_start_date).getTime() - new Date(a.event_start_date).getTime()
    );
    
    // Calculate current and longest streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let inStreak = false;
    
    for (const bet of sortedBets) {
      if (bet.status === "won") {
        if (!inStreak) {
          inStreak = true;
        }
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else if (bet.status === "lost") {
        inStreak = false;
        currentStreak = 0;
      }
      // Skip pending, pushed, void statuses for streak calculation
    }
    
    return { current: currentStreak, longest: longestStreak };
  };
  
  // Get best performing sportsbook
  const getBestSportsbook = (sportsbookStats: SportsbookStat[]): SportsbookStat | null => {
    if (!sportsbookStats || sportsbookStats.length === 0) return null;
    
    // Filter out sportsbooks with less than 2 bets for more meaningful data
    const filteredStats = sportsbookStats.filter(sb => sb.count >= 2);
    
    if (filteredStats.length === 0) return null;
    
    // Sort by profit
    const sortedStats = [...filteredStats].sort((a, b) => b.profit - a.profit);
    return sortedStats[0];
  };

  // Fetch dashboard data
  const fetchDashboardData = async (period: string = "all") => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Create params for time filtering
      const params = new URLSearchParams();
      
      if (period !== "all") {
        const today = new Date();
        let startDate = new Date();
        
        // Calculate start date based on period
        switch (period) {
          case "week":
            startDate.setDate(today.getDate() - 7);
            break;
          case "month":
            startDate.setMonth(today.getMonth() - 1);
            break;
          case "year":
            startDate.setFullYear(today.getFullYear() - 1);
            break;
        }
        
        // Format dates
        const formatDate = (date: Date) => {
          return date.toISOString().split('T')[0];
        };
        
        params.append('start_date', formatDate(startDate));
        params.append('end_date', formatDate(today));
      }
      
      // Fetch bets stats first
      const statsResponse = await axios.get(`${API_URL}/api/bets/stats?${params.toString()}`);
      
      if (statsResponse.data) {
        setStats(statsResponse.data);
      }
      
      // Fetch recent bets with pagination
      const betsResponse = await axios.get(`${API_URL}/api/bets?${params.toString()}`);
      
      if (betsResponse.data) {
        // Handle paginated response
        if (typeof betsResponse.data === 'object' && 'items' in betsResponse.data) {
          const paginatedData = betsResponse.data as PaginatedResponse;
          setRecentBets(paginatedData.items);
        } else {
          // Handle non-paginated response
          setRecentBets(Array.isArray(betsResponse.data) ? betsResponse.data : []);
        }
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to load dashboard data. Please try again later.");
      setIsLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchDashboardData(timeframe);
  }, [timeframe]);

  // Handle timeframe change
  const handleTimeframeChange = (period: string) => {
    setTimeframe(period);
  };

  // Format odds
  const formatOdds = (odds: number): string => {
    return odds > 0 ? `+${odds}` : odds.toString();
  };

  // Loading state
  if (isLoading) {
    return <LoadingSpinner size="large" message="Loading dashboard data..." />;
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-medium mb-2">Error</h3>
          <p>{error}</p>
          <button
            onClick={() => fetchDashboardData(timeframe)}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Calculate additional stats
  const winStreak = stats && recentBets && recentBets.length > 0 
    ? calculateWinStreak(recentBets) 
    : { current: 0, longest: 0 };
  const bestSportsbook = stats && stats.sportsbooks && stats.sportsbooks.length > 0
    ? getBestSportsbook(stats.sportsbooks) 
    : null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Last updated: {new Date().toLocaleTimeString()}</span>
          <button 
            onClick={() => fetchDashboardData(timeframe)} 
            className="p-2 rounded-full hover:bg-gray-200"
            title="Refresh data"
          >
            🔄
          </button>
        </div>
      </div>
      
      {/* Timeframe Selector */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleTimeframeChange("all")}
              className={`px-3 py-1 rounded-md text-sm ${
                timeframe === "all" 
                  ? "bg-blue-600 text-white" 
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => handleTimeframeChange("year")}
              className={`px-3 py-1 rounded-md text-sm ${
                timeframe === "year" 
                  ? "bg-blue-600 text-white" 
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
              }`}
            >
              Last Year
            </button>
            <button
              onClick={() => handleTimeframeChange("month")}
              className={`px-3 py-1 rounded-md text-sm ${
                timeframe === "month" 
                  ? "bg-blue-600 text-white" 
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => handleTimeframeChange("week")}
              className={`px-3 py-1 rounded-md text-sm ${
                timeframe === "week" 
                  ? "bg-blue-600 text-white" 
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
              }`}
            >
              Last 7 Days
            </button>
          </div>
        </CardContent>
      </Card>
      
      {/* Summary Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Profit/Loss Card */}
          <Card className={`border-l-4 ${stats.total_profit >= 0 ? 'border-l-green-500' : 'border-l-red-500'}`}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Profit/Loss</p>
                  <p className={`text-2xl font-bold mt-1 ${getColorClass(stats.total_profit)}`}>
                    {formatMoney(stats.total_profit)}
                  </p>
                </div>
                <div className="text-xl">💰</div>
              </div>
              <div className="flex justify-between items-center mt-4 text-sm">
                <div>
                  <span className="text-gray-600">Total Stake: </span>
                  <span className="font-medium">{formatMoney(stats.total_stake)}</span>
                </div>
                <div>
                  <span className={`${getColorClass(stats.roi)}`}>
                    ROI: {formatPercent(stats.roi)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Win Rate Card */}
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Win Rate</p>
                  <p className={`text-2xl font-bold mt-1 ${stats.win_rate >= 50 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {formatPercent(stats.win_rate)}
                  </p>
                </div>
                <div className="text-xl">🎯</div>
              </div>
              <div className="flex justify-between items-center mt-4 text-sm">
                <div>
                  <span className="text-gray-600">Wins/Losses: </span>
                  <span className="font-medium">{stats.winning_bets}/{stats.losing_bets}</span>
                </div>
                <div>
                  <span className="text-blue-600">
                    {stats.winning_bets + stats.losing_bets} settled bets
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Current Streak Card */}
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Current Streak</p>
                  <p className={`text-2xl font-bold mt-1 ${winStreak.current > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                    {winStreak.current > 0 ? `${winStreak.current} wins` : 'No streak'}
                  </p>
                </div>
                <div className="text-xl">🔥</div>
              </div>
              <div className="flex justify-between items-center mt-4 text-sm">
                <div>
                  <span className="text-gray-600">Best Streak: </span>
                  <span className="font-medium">{winStreak.longest} wins</span>
                </div>
                <div>
                  <span className="text-blue-600">
                    {stats.pending_bets} pending
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Best Sportsbook Card */}
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Best Sportsbook</p>
                  <p className="text-2xl font-bold mt-1">
                    {bestSportsbook ? bestSportsbook.name : 'N/A'}
                  </p>
                </div>
                <div className="text-xl">🏆</div>
              </div>
              
              {bestSportsbook && (
                <div className="flex justify-between items-center mt-4 text-sm">
                  <div>
                    <span className="text-gray-600">Profit: </span>
                    <span className={`font-medium ${getColorClass(bestSportsbook.profit)}`}>
                      {formatMoney(bestSportsbook.profit)}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-600">
                      {bestSportsbook.count} bets
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Sportsbook Performance */}
      {stats && stats.sportsbooks && stats.sportsbooks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sportsbook Performance</CardTitle>
            <CardDescription>Profit breakdown by sportsbook</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Sportsbook</th>
                    <th>Bets</th>
                    <th className="text-right">Profit/Loss</th>
                    <th className="text-right">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.sportsbooks.sort((a, b) => b.profit - a.profit).map((sb) => {
                    // Calculate ROI safely
                    let sbRoi = 0;
                    if (stats.total_stake > 0 && sb.count > 0) {
                      const averageStakePerBet = stats.total_stake / stats.total_bets;
                      const estimatedTotalStake = averageStakePerBet * sb.count;
                      
                      if (estimatedTotalStake > 0) {
                        sbRoi = (sb.profit / estimatedTotalStake) * 100;
                      }
                    }
                    
                    return (
                      <tr key={sb.name}>
                        <td>{sb.name}</td>
                        <td>{sb.count}</td>
                        <td className={`text-right ${getColorClass(sb.profit)}`}>
                          {formatMoney(sb.profit)}
                        </td>
                        <td className={`text-right ${getColorClass(sbRoi)}`}>
                          {formatPercent(sbRoi)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Action Items */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Expected Profit Card */}
        <Link to="/expected-profit" className="block">
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6 pb-6">
              <div className="flex flex-col items-center text-center">
                <div className="text-3xl mb-3">💰</div>
                <h3 className="font-semibold text-lg text-gray-800 mb-2">Expected Profit</h3>
                <p className="text-gray-600">Analyze upcoming bets for expected value and ROI</p>
                <div className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md text-sm">
                  View Report
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        
        {/* Arbitrage Card */}
        <Link to="/arbitrage" className="block">
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6 pb-6">
              <div className="flex flex-col items-center text-center">
                <div className="text-3xl mb-3">📊</div>
                <h3 className="font-semibold text-lg text-gray-800 mb-2">Arbitrage Finder</h3>
                <p className="text-gray-600">Calculate arbitrage opportunities across sportsbooks</p>
                <div className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md text-sm">
                  Find Arbitrage
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        
        {/* Unconfirmed Bets Card */}
        <Link to="/confirm" className="block">
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6 pb-6">
              <div className="flex flex-col items-center text-center">
                <div className="text-3xl mb-3">✅</div>
                <h3 className="font-semibold text-lg text-gray-800 mb-2">Confirm Settlements</h3>
                <p className="text-gray-600">
                  {stats?.pending_bets ? `${stats.pending_bets} bets pending settlement` : 'Confirm settled bet results'}
                </p>
                <div className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md text-sm">
                  Confirm Bets
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
      
      {/* Recent Bets Section */}
      <Card>
        <CardHeader className="flex justify-between items-start">
          <div>
            <CardTitle>Recent Bets</CardTitle>
            <CardDescription>Your most recent bet activity</CardDescription>
          </div>
          <Link to="/history" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            View All →
          </Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Event</th>
                  <th>Bet</th>
                  <th>Sportsbook</th>
                  <th className="text-right">Odds</th>
                  <th className="text-right">Stake</th>
                  <th className="text-right">Profit/Loss</th>
                  <th className="text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentBets.length > 0 ? (
                  recentBets.slice(0, 5).map((bet) => (
                    <tr key={bet.id}>
                      <td>{new Date(bet.event_start_date).toLocaleDateString()}</td>
                      <td className="max-w-xs truncate" title={bet.event_name}>
                        {bet.event_name}
                      </td>
                      <td className="max-w-xs truncate" title={bet.bet_name}>
                        {bet.bet_name}
                      </td>
                      <td>{bet.sportsbook}</td>
                      <td className="text-right">{formatOdds(bet.odds)}</td>
                      <td className="text-right">{formatMoney(bet.stake)}</td>
                      <td className={`text-right ${getColorClass(bet.bet_profit)}`}>
                        {formatMoney(bet.bet_profit)}
                      </td>
                      <td className="text-center">
                        <span className={`status-badge ${bet.status.toLowerCase()}`}>
                          {bet.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-gray-500">
                      No bets found. Add some bets to see them here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}