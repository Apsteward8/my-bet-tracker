// pages/DashboardPage.tsx (with responsive updates)
import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import LoadingSpinner from "../components/LoadingSpinner";
import ResponsiveTable from "../components/ResponsiveTable";
import BetDisplay from "../components/BetDisplay";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5007';

// Other code remains the same...

export default function DashboardPage() {
  // State hooks and other functions remain the same...

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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
        <h1 className="text-xl lg:text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs md:text-sm text-gray-500">Last updated: {new Date().toLocaleTimeString()}</span>
          <button 
            onClick={() => fetchDashboardData(timeframe)} 
            className="p-2 rounded-full hover:bg-gray-200"
            title="Refresh data"
          >
            🔄
          </button>
        </div>
      </div>
      
      {/* Timeframe Selector - Now scrollable horizontally on mobile */}
      <Card>
        <CardContent className="py-4 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
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
      
      {/* Summary Statistics - Now stacked on mobile, grid on desktop */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Profit/Loss Card */}
          <Card className={`border-l-4 ${stats.total_profit >= 0 ? 'border-l-green-500' : 'border-l-red-500'}`}>
            <CardContent className="pt-5 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Profit/Loss</p>
                  <p className={`text-xl md:text-2xl font-bold mt-1 ${getColorClass(stats.total_profit)}`}>
                    {formatMoney(stats.total_profit)}
                  </p>
                </div>
                <div className="text-xl">💰</div>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-3 text-xs sm:text-sm">
                <div>
                  <span className="text-gray-600">Total Stake: </span>
                  <span className="font-medium">{formatMoney(stats.total_stake)}</span>
                </div>
                <div className="mt-1 sm:mt-0">
                  <span className={`${getColorClass(stats.roi)}`}>
                    ROI: {formatPercent(stats.roi)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Win Rate Card */}
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-5 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Win Rate</p>
                  <p className={`text-xl md:text-2xl font-bold mt-1 ${stats.win_rate >= 50 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {formatPercent(stats.win_rate)}
                  </p>
                </div>
                <div className="text-xl">🎯</div>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-3 text-xs sm:text-sm">
                <div>
                  <span className="text-gray-600">Wins/Losses: </span>
                  <span className="font-medium">{stats.winning_bets}/{stats.losing_bets}</span>
                </div>
                <div className="mt-1 sm:mt-0">
                  <span className="text-blue-600">
                    {stats.winning_bets + stats.losing_bets} settled
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Current Streak Card */}
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="pt-5 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Current Streak</p>
                  <p className={`text-xl md:text-2xl font-bold mt-1 ${winStreak.current > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                    {winStreak.current > 0 ? `${winStreak.current} wins` : 'No streak'}
                  </p>
                </div>
                <div className="text-xl">🔥</div>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-3 text-xs sm:text-sm">
                <div>
                  <span className="text-gray-600">Best Streak: </span>
                  <span className="font-medium">{winStreak.longest} wins</span>
                </div>
                <div className="mt-1 sm:mt-0">
                  <span className="text-blue-600">
                    {stats.pending_bets} pending
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Best Sportsbook Card */}
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-5 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Best Sportsbook</p>
                  <p className="text-xl md:text-2xl font-bold mt-1">
                    {bestSportsbook ? bestSportsbook.name : 'N/A'}
                  </p>
                </div>
                <div className="text-xl">🏆</div>
              </div>
              
              {bestSportsbook && (
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-3 text-xs sm:text-sm">
                  <div>
                    <span className="text-gray-600">Profit: </span>
                    <span className={`font-medium ${getColorClass(bestSportsbook.profit)}`}>
                      {formatMoney(bestSportsbook.profit)}
                    </span>
                  </div>
                  <div className="mt-1 sm:mt-0">
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
      
      {/* Sportsbook Performance - Responsive table with horizontal scrolling */}
      {stats && stats.sportsbooks && stats.sportsbooks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sportsbook Performance</CardTitle>
            <CardDescription>Profit breakdown by sportsbook</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop view - shows as a normal table */}
            <div className="hidden md:block">
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
            </div>
            
            {/* Mobile view - card style layout */}
            <div className="md:hidden p-4 space-y-4">
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
                  <div key={sb.name} className="bg-gray-50 p-3 rounded-lg">
                    <div className="font-medium text-lg">{sb.name}</div>
                    <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                      <div>
                        <div className="text-gray-500">Bets</div>
                        <div className="font-medium">{sb.count}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Profit</div>
                        <div className={`font-medium ${getColorClass(sb.profit)}`}>
                          {formatMoney(sb.profit)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">ROI</div>
                        <div className={`font-medium ${getColorClass(sbRoi)}`}>
                          {formatPercent(sbRoi)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Action Items - Grid for desktop, stack for mobile */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Expected Profit Card */}
        <Link to="/expected-profit" className="block">
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6 pb-6">
              <div className="flex flex-col items-center text-center">
                <div className="text-3xl mb-3">💰</div>
                <h3 className="font-semibold text-lg text-gray-800 mb-2">Expected Profit</h3>
                <p className="text-gray-600">Analyze upcoming bets for expected value and ROI</p>
                <div className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md text-sm w-full sm:w-auto">
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
                <div className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md text-sm w-full sm:w-auto">
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
                <div className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md text-sm w-full sm:w-auto">
                  Confirm Bets
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
      
      {/* Recent Bets Section */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:justify-between md:items-start">
          <div>
            <CardTitle>Recent Bets</CardTitle>
            <CardDescription>Your most recent bet activity</CardDescription>
          </div>
          <Link to="/history" className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-2 md:mt-0">
            View All →
          </Link>
        </CardHeader>
        <CardContent className="p-0 md:p-6 md:pt-0">
          {/* Desktop view - full table */}
          <div className="hidden md:block">
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
          </div>
          
          {/* Mobile view - card style layout */}
          <div className="md:hidden p-4 space-y-4">
            {recentBets.length > 0 ? (
              recentBets.slice(0, 5).map((bet) => (
                <BetDisplay 
                  key={bet.id} 
                  bet={bet} 
                  formatMoney={formatMoney} 
                  getColorClass={getColorClass} 
                />
              ))
            ) : (
              <div className="text-center text-gray-500 py-4">
                No bets found. Add some bets to see them here.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}