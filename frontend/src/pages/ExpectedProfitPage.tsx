// pages/ExpectedProfitPage.tsx (with preset date filters)
import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import LoadingSpinner from "../components/LoadingSpinner";
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5007';

interface Bet {
  id: number;
  event_name: string;
  bet_name: string;
  sportsbook: string;
  sport: string;
  odds: number;
  clv: number;
  stake: number;
  potential_payout: number;
  event_date: string;
  event_time: string;
  event_start_date: string;
  implied_prob: number | null;
  expected_profit: number | null;
  ev_percent: number | null;
}

interface DailySummary {
  date: string;
  bets: Bet[];
  total_stake: number;
  expected_profit: number;
  expected_roi: number;
}

interface SportsbookSummary {
  name: string;
  bet_count: number;
  total_stake: number;
  expected_profit: number;
  expected_roi: number;
}

interface Stats {
  total_bets: number;
  total_stake: number;
  expected_profit: number;
  expected_roi: number;
}

interface DateRange {
  start: string | null;
  end: string | null;
}

interface DatePreset {
  label: string;
  key: string;
  getRange: () => { start: string; end: string };
}

export default function ExpectedProfitPage() {
  const [bets, setBets] = useState<Bet[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [sportsbookSummaries, setSportsbookSummaries] = useState<SportsbookSummary[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [includePlayerProps, setIncludePlayerProps] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<string>("next7days");
  
  // Format date for input field (YYYY-MM-DD)
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // Define date presets
  const datePresets: DatePreset[] = [
    {
      label: "Today",
      key: "today",
      getRange: () => {
        const today = new Date();
        const todayStr = formatDateForInput(today);
        return { start: todayStr, end: todayStr };
      }
    },
    {
      label: "Tomorrow",
      key: "tomorrow",
      getRange: () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = formatDateForInput(tomorrow);
        return { start: tomorrowStr, end: tomorrowStr };
      }
    },
    {
      label: "Next 7 Days",
      key: "next7days",
      getRange: () => {
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 6); // 0-6 = 7 days
        return { 
          start: formatDateForInput(today), 
          end: formatDateForInput(nextWeek) 
        };
      }
    },
    {
      label: "Next 30 Days",
      key: "next30days",
      getRange: () => {
        const today = new Date();
        const nextMonth = new Date(today);
        nextMonth.setDate(today.getDate() + 29); // 0-29 = 30 days
        return { 
          start: formatDateForInput(today), 
          end: formatDateForInput(nextMonth) 
        };
      }
    },
    {
      label: "Custom",
      key: "custom",
      getRange: () => {
        return { start: startDate, end: endDate };
      }
    }
  ];
  
  // Apply a preset date range
  const applyDatePreset = (presetKey: string) => {
    const preset = datePresets.find(p => p.key === presetKey);
    if (preset) {
      setActivePreset(presetKey);
      const range = preset.getRange();
      setStartDate(range.start);
      setEndDate(range.end);
      
      // If it's not custom, fetch data immediately
      if (presetKey !== "custom") {
        fetchDataWithDates(range.start, range.end);
      }
    }
  };
  
  // Fetch data with specific dates
  const fetchDataWithDates = (start: string, end: string) => {
    setIsLoading(true);
    setError(null);
    
    // Construct query parameters
    const params = new URLSearchParams();
    if (start) params.append('start_date', start);
    if (end) params.append('end_date', end);
    if (includePlayerProps) params.append('include_player_props', 'true');
    
    axios.get(`${API_URL}/api/bets/expected-profit?${params.toString()}`)
      .then(response => {
        // Handle response data
        setBets(response.data.bets || []);
        setStats(response.data.stats || null);
        setDailySummaries(response.data.daily_summaries || []);
        setSportsbookSummaries(response.data.sportsbook_summaries || []);
        setDateRange(response.data.date_range || { start: null, end: null });
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Error fetching expected profit data:", err);
        
        // Extract more specific error message if available
        const errorMessage = err.response?.data?.error || 
                           "Failed to load expected profit data. Please try again later.";
        
        setError(errorMessage);
        setIsLoading(false);
      });
  };
  
  // Set default preset on mount
  useEffect(() => {
    applyDatePreset("next7days");
  }, []);
  
  // Format money values
  const formatMoney = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) {
      return "$0.00";
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Format percentage values
  const formatPercent = (value: number | null | undefined) => {
    if (value === null || value === undefined) {
      return "0.00%";
    }
    return `${value.toFixed(2)}%`;
  };

  // Get color class based on value
  const getColorClass = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return "text-gray-400";
    if (value > 0) return "text-green-600";
    if (value < 0) return "text-red-600";
    return "text-yellow-500";
  };
  
  // Fetch data with current filters
  const fetchData = () => {
    fetchDataWithDates(startDate, endDate);
  };
  
  if (isLoading) {
    return <LoadingSpinner size="large" message="Loading expected profit data..." />;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">💰 Expected Profit Analysis</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {stats?.total_bets || 0} pending bets
          </span>
          <button
            onClick={fetchData}
            className="p-2 rounded-full hover:bg-gray-200"
            title="Refresh data"
          >
            🔄
          </button>
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-medium mb-2">Error</h3>
          <p>{error}</p>
          <button
            onClick={fetchData}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      )}
      
      {/* Date Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Date Range</CardTitle>
          <CardDescription>Select the date range for expected profit analysis</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Date Preset Buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            {datePresets.map(preset => (
              <button
                key={preset.key}
                onClick={() => applyDatePreset(preset.key)}
                className={`px-3 py-1 text-sm rounded-md ${
                  activePreset === preset.key 
                    ? "bg-blue-600 text-white" 
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          
          {/* Custom date inputs (only shown when Custom is selected) */}
          {activePreset === "custom" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={fetchData}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Apply Custom Range
                </button>
              </div>
            </div>
          )}
          
          {/* Include Player Props */}
          <div className="flex items-center mt-4">
            <input
              type="checkbox"
              id="includeProps"
              checked={includePlayerProps}
              onChange={(e) => {
                setIncludePlayerProps(e.target.checked);
                // Refetch data immediately when checkbox changes
                const preset = datePresets.find(p => p.key === activePreset);
                if (preset) {
                  const range = preset.getRange();
                  setTimeout(() => {
                    fetchDataWithDates(range.start, range.end);
                  }, 0);
                }
              }}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="includeProps" className="ml-2 text-sm text-gray-700">
              Include player props
            </label>
          </div>
        </CardContent>
      </Card>
      
      {/* Summary Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Pending Bets</p>
                  <p className="text-2xl font-bold mt-1">{stats.total_bets}</p>
                </div>
                <div className="text-xl">🎯</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Stake</p>
                  <p className="text-2xl font-bold mt-1">{formatMoney(stats.total_stake)}</p>
                </div>
                <div className="text-xl">💵</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Expected Profit</p>
                  <p className={`text-2xl font-bold mt-1 ${getColorClass(stats.expected_profit)}`}>
                    {formatMoney(stats.expected_profit)}
                  </p>
                </div>
                <div className="text-xl">📊</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Expected ROI</p>
                  <p className={`text-2xl font-bold mt-1 ${getColorClass(stats.expected_roi)}`}>
                    {formatPercent(stats.expected_roi)}
                  </p>
                </div>
                <div className="text-xl">📈</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Daily Summaries */}
      {dailySummaries.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Expected Profit by Day</CardTitle>
            <CardDescription>Daily breakdown of expected profits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Bets</th>
                    <th className="text-right">Total Stake</th>
                    <th className="text-right">Expected Profit</th>
                    <th className="text-right">Expected ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {dailySummaries.map((day) => (
                    <tr key={day.date}>
                      <td>{new Date(day.date).toLocaleDateString()}</td>
                      <td>{day.bets.length}</td>
                      <td className="text-right">{formatMoney(day.total_stake)}</td>
                      <td className={`text-right ${getColorClass(day.expected_profit)}`}>
                        {formatMoney(day.expected_profit)}
                      </td>
                      <td className={`text-right ${getColorClass(day.expected_roi)}`}>
                        {formatPercent(day.expected_roi)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        !isLoading && stats && stats.total_bets === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-8">
                <div className="text-5xl mb-4">📅</div>
                <h2 className="text-xl font-semibold text-gray-700 mb-2">No Daily Data Available</h2>
                <p className="text-gray-500 text-center max-w-md">
                  There are no pending bets in the selected date range to show daily breakdown.
                </p>
              </div>
            </CardContent>
          </Card>
        )
      )}
      
      {/* Sportsbook Summaries */}
      {sportsbookSummaries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Expected Profit by Sportsbook</CardTitle>
            <CardDescription>Sportsbook breakdown of expected profits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Sportsbook</th>
                    <th>Bets</th>
                    <th className="text-right">Total Stake</th>
                    <th className="text-right">Expected Profit</th>
                    <th className="text-right">Expected ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {sportsbookSummaries.map((sb) => (
                    <tr key={sb.name}>
                      <td>{sb.name}</td>
                      <td>{sb.bet_count}</td>
                      <td className="text-right">{formatMoney(sb.total_stake)}</td>
                      <td className={`text-right ${getColorClass(sb.expected_profit)}`}>
                        {formatMoney(sb.expected_profit)}
                      </td>
                      <td className={`text-right ${getColorClass(sb.expected_roi)}`}>
                        {formatPercent(sb.expected_roi)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* All Pending Bets */}
      {bets.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Pending Bets</CardTitle>
            <CardDescription>All pending bets with expected profit calculations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Event Date</th>
                    <th>Time</th>
                    <th>Event</th>
                    <th>Bet</th>
                    <th>Sportsbook</th>
                    <th className="text-right">Odds</th>
                    <th className="text-right">Stake</th>
                    <th className="text-right">EV%</th>
                    <th className="text-right">Expected Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {bets.map((bet) => (
                    <tr key={bet.id}>
                      <td>{new Date(bet.event_date).toLocaleDateString()}</td>
                      <td>{bet.event_time}</td>
                      <td className="max-w-xs truncate" title={bet.event_name}>
                        {bet.event_name}
                      </td>
                      <td className="max-w-xs truncate" title={bet.bet_name}>
                        {bet.bet_name}
                      </td>
                      <td>{bet.sportsbook}</td>
                      <td className="text-right">{bet.odds > 0 ? `+${bet.odds}` : bet.odds}</td>
                      <td className="text-right">{formatMoney(bet.stake)}</td>
                      <td className={`text-right ${getColorClass(bet.ev_percent)}`}>
                        {bet.ev_percent !== null ? formatPercent(bet.ev_percent) : "N/A"}
                      </td>
                      <td className={`text-right ${getColorClass(bet.expected_profit)}`}>
                        {bet.expected_profit !== null ? formatMoney(bet.expected_profit) : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        !isLoading && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-8">
                <div className="text-5xl mb-4">🔍</div>
                <h2 className="text-xl font-semibold text-gray-700 mb-2">No Pending Bets Found</h2>
                <p className="text-gray-500 text-center max-w-md">
                  There are no pending bets in the selected date range.
                </p>
              </div>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}