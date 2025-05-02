import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/Tabs";
import LoadingSpinner from "../components/LoadingSpinner";

// Types for API responses - modified to handle null values
interface ProcessedBet {
  id: number;
  event_name: string;
  bet_name: string;
  sportsbook: string;
  bet_type: string;
  odds: number;
  clv: number | null;
  stake: number;
  status: string;
  bet_profit: number;
  event_start_date: string;
  sport?: string | null;
  market_name?: string | null;
  
  // Potentially null for bets without valid CLV
  implied_prob: number | null;
  clv_implied_prob: number | null;
  ev_percent: number | null;
  expected_profit: number | null;
  beat_clv: boolean | null;
  ev_category: string;
}

interface EVStats {
  total_bets: number;
  winning_bets: number;
  losing_bets: number;
  pending_bets: number;
  total_stake: number;
  total_profit: number;
  expected_profit: number;
  roi: number;
  expected_roi: number;
  win_rate: number;
  clv_win_rate: number;
  avg_ev: number;
  valid_clv_bets: number;
  total_analyzed_bets: number;
}

interface StatItem {
  name: string;
  betCount: number;
  totalStake: number;
  totalProfit: number;
  expectedProfit: number;
  roi: number;
  expectedRoi: number;
  avgEV: number;
}

export default function EVAnalysisPage() {
  // State variables
  const [filteredBets, setFilteredBets] = useState<ProcessedBet[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [includePendingBets, setIncludePendingBets] = useState<boolean>(false);
  const [includePlayerProps, setIncludePlayerProps] = useState<boolean>(false);
  const [stats, setStats] = useState<EVStats | null>(null);
  const [sportsbookStats, setSportsbookStats] = useState<StatItem[]>([]);
  const [sportStats, setSportStats] = useState<StatItem[]>([]);
  const [evQualityStats, setEVQualityStats] = useState<StatItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
const [pageSize, setPageSize] = useState<number>(15);
const [sortColumn, setSortColumn] = useState<string>("event_start_date");
const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
const [dateFilterType, setDateFilterType] = useState<string>("custom");


  // Fetch data function
  const fetchEVAnalysisData = async () => {
    setIsLoading(true);
    setError(null);

    // Construct query parameters
    const params = new URLSearchParams();
    if (includePendingBets) params.append('include_pending', 'true');
    if (includePlayerProps) params.append('include_player_props', 'true');
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    try {
      // Call the backend endpoint
      const response = await axios.get(`http://localhost:5007/api/ev-analysis?${params.toString()}`);

      // Check for valid response
      if (!response.data) {
        setError("Invalid API response");
        setIsLoading(false);
        return;
      }

      // Handle response data
      const { 
        bets, 
        stats, 
        sportsbook_stats, 
        sport_stats, 
        ev_quality_stats 
      } = response.data;

      // Process bets
      const processedBets = (bets || []).map((bet: any) => ({
        ...bet
      }));

      // Set state with processed data
      setFilteredBets(processedBets);
      
      // Convert snake_case stats to camelCase
      if (stats) {
        setStats({
          total_bets: stats.total_bets || 0,
          winning_bets: stats.winning_bets || 0,
          losing_bets: stats.losing_bets || 0,
          pending_bets: stats.pending_bets || 0,
          total_stake: stats.total_stake || 0,
          total_profit: stats.total_profit || 0,
          expected_profit: stats.expected_profit || 0,
          roi: stats.roi || 0,
          expected_roi: stats.expected_roi || 0,
          win_rate: stats.win_rate || 0,
          clv_win_rate: stats.clv_win_rate || 0,
          avg_ev: stats.avg_ev || 0,
          valid_clv_bets: stats.valid_clv_bets || 0,
          total_analyzed_bets: stats.total_analyzed_bets || 0
        });
      }

      // Process sportsbook stats
      const formattedSportsbookStats = (sportsbook_stats || []).map((sb: any) => ({
        name: sb.name || "",
        betCount: sb.bet_count || 0,
        totalStake: sb.total_stake || 0,
        totalProfit: sb.total_profit || 0,
        expectedProfit: sb.expected_profit || 0,
        roi: sb.roi || 0,
        expectedRoi: sb.expected_roi || 0,
        avgEV: sb.avg_ev || 0
      }));
      setSportsbookStats(formattedSportsbookStats);

      // Process sport stats
      const formattedSportStats = (sport_stats || []).map((sport: any) => ({
        name: sport.name || "",
        betCount: sport.bet_count || 0,
        totalStake: sport.total_stake || 0,
        totalProfit: sport.total_profit || 0,
        expectedProfit: sport.expected_profit || 0,
        roi: sport.roi || 0,
        expectedRoi: sport.expected_roi || 0,
        avgEV: sport.avg_ev || 0
      }));
      setSportStats(formattedSportStats);

      // Process EV quality stats
      const formattedEVQualityStats = (ev_quality_stats || []).map((ev: any) => ({
        name: ev.category || "",
        betCount: ev.bet_count || 0,
        totalStake: ev.total_stake || 0,
        totalProfit: ev.total_profit || 0,
        expectedProfit: ev.expected_profit || 0,
        roi: ev.roi || 0,
        expectedRoi: ev.expected_roi || 0,
        avgEV: ev.avg_ev || 0
      }));
      setEVQualityStats(formattedEVQualityStats);

      // Set date range if not already set and bets exist
      if ((!startDate || !endDate) && processedBets.length > 0) {
        // Find earliest and latest dates
        const dates = processedBets.map((bet: { event_start_date: string | number | Date; }) => new Date(bet.event_start_date));
        const earliestDate = new Date(Math.min(...dates.map((d: { getTime: () => any; }) => d.getTime())));
        const latestDate = new Date(Math.max(...dates.map((d: { getTime: () => any; }) => d.getTime())));
        
        // Only set if not already set
        if (!startDate) {
          const formattedStart = formatDateForInput(earliestDate);
          setStartDate(formattedStart);
        }
        
        if (!endDate) {
          const formattedEnd = formatDateForInput(latestDate);
          setEndDate(formattedEnd);
        }
      }

      setIsLoading(false);
    } catch (err) {
      console.error("Error fetching EV analysis data:", err);
      setError(`Error fetching data: ${err instanceof Error ? err.message : String(err)}`);
      setIsLoading(false);
    }
  };

  // Format date for input field (YYYY-MM-DD)
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Handle date changes without full page refresh
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setStartDate(newDate);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setEndDate(newDate);
  };

  // Preset date range options
const getPresetDateRange = (type: string): { start: string; end: string } => {
    const today = new Date();
    const todayStr = formatDateForInput(today);
    
    switch (type) {
      case "all":
        return { start: "", end: "" };
      
      case "ytd": {
        // Year to date
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        return { 
          start: formatDateForInput(startOfYear), 
          end: todayStr 
        };
      }
      
      case "month": {
        // Last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        return { 
          start: formatDateForInput(thirtyDaysAgo), 
          end: todayStr 
        };
      }
      
      case "week": {
        // Last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);
        return { 
          start: formatDateForInput(sevenDaysAgo), 
          end: todayStr 
        };
      }
      
      case "yesterday": {
        // Yesterday
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        const yesterdayStr = formatDateForInput(yesterday);
        return { 
          start: yesterdayStr, 
          end: yesterdayStr 
        };
      }
      
      case "today": {
        // Today
        return { 
          start: todayStr, 
          end: todayStr 
        };
      }
      
      default:
        return { start: startDate, end: endDate };
    }
  };
  
  // Handle date preset change
  const handleDatePresetChange = (type: string) => {
    setDateFilterType(type);
    const { start, end } = getPresetDateRange(type);
    setStartDate(start);
    setEndDate(end);
    
    // If not custom, apply filters immediately
    if (type !== "custom") {
      setTimeout(() => applyDateFilters(), 0);
    }
  };

  // Add this sorting function
const sortBets = (bets: ProcessedBet[]): ProcessedBet[] => {
    return [...bets].sort((a, b) => {
      // Handle different column types
      if (sortColumn === "event_start_date") {
        const dateA = new Date(a.event_start_date).getTime();
        const dateB = new Date(b.event_start_date).getTime();
        return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
      } else if (sortColumn === "odds" || sortColumn === "clv" || sortColumn === "stake" || sortColumn === "bet_profit") {
        const valA = a[sortColumn] || 0;
        const valB = b[sortColumn] || 0;
        return sortDirection === "asc" ? valA - valB : valB - valA;
      } else if (sortColumn === "ev_percent") {
        const valA = a.ev_percent || 0;
        const valB = b.ev_percent || 0;
        return sortDirection === "asc" ? valA - valB : valB - valA;
      } else {
        // String comparison for text columns
        const valA = String(a[sortColumn] || "").toLowerCase();
        const valB = String(b[sortColumn] || "").toLowerCase();
        return sortDirection === "asc" 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }
    });
  };

  // Handle column header click for sorting
const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new column and default to descending
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchEVAnalysisData();
  }, []);

  // Refetch when filters change
  useEffect(() => {
    // Don't fetch on initial mount, that's handled by the previous useEffect
    if (isLoading) return;

    fetchEVAnalysisData();
  }, [includePendingBets, includePlayerProps]);

  // Manual apply button to trigger date filter changes
  const applyDateFilters = () => {
    fetchEVAnalysisData();
  };

  // Format helpers
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

  const formatPercent = (value: number | null | undefined) => {
    if (value === null || value === undefined) {
      return "0.00%";
    }
    return `${value.toFixed(2)}%`;
  };

  const getColorClass = (value: number | null | undefined, threshold: number = 0): string => {
    if (value === null || value === undefined) return "text-gray-400";
    if (value > threshold) return "text-green-600";
    if (value < threshold) return "text-red-600";
    return "text-yellow-500";
  };

  // Loading state
  if (isLoading) {
    return <LoadingSpinner size="large" message="Loading EV analysis data..." />;
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-medium mb-2">Error</h3>
          <p>{error}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Reload Page
        </button>
      </div>
    );
  }

  // If no stats available yet
  if (!stats) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">EV Analysis</h1>
        <p className="text-gray-500">No data available for analysis. Adjust your filters and try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">EV Analysis</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            Analyzing {stats.total_bets} bets ({stats.valid_clv_bets} with valid CLV)
          </span>
          <button
            onClick={() => window.location.reload()}
            className="p-2 rounded-full hover:bg-gray-200"
            title="Refresh data"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Adjust filters to refine your EV analysis</CardDescription>
        </CardHeader>
        <CardContent>
          {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={handleStartDateChange}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={handleEndDateChange}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
          </div>
          
          {/* Date filter apply button */}
          {/* <div className="mb-4">
            <button 
              onClick={applyDateFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Apply Date Filters
            </button>
          </div> */}
          <div className="mb-6">
  <h3 className="text-sm font-medium text-gray-700 mb-2">Date Range</h3>
  
  <div className="flex flex-wrap gap-2 mb-4">
    <button
      onClick={() => handleDatePresetChange("all")}
      className={`px-3 py-1 text-sm rounded-md ${
        dateFilterType === "all" 
          ? "bg-blue-600 text-white" 
          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
      }`}
    >
      All Time
    </button>
    
    <button
      onClick={() => handleDatePresetChange("ytd")}
      className={`px-3 py-1 text-sm rounded-md ${
        dateFilterType === "ytd" 
          ? "bg-blue-600 text-white" 
          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
      }`}
    >
      Year to Date
    </button>
    
    <button
      onClick={() => handleDatePresetChange("month")}
      className={`px-3 py-1 text-sm rounded-md ${
        dateFilterType === "month" 
          ? "bg-blue-600 text-white" 
          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
      }`}
    >
      Last 30 Days
    </button>
    
    <button
      onClick={() => handleDatePresetChange("week")}
      className={`px-3 py-1 text-sm rounded-md ${
        dateFilterType === "week" 
          ? "bg-blue-600 text-white" 
          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
      }`}
    >
      Last 7 Days
    </button>
    
    <button
      onClick={() => handleDatePresetChange("yesterday")}
      className={`px-3 py-1 text-sm rounded-md ${
        dateFilterType === "yesterday" 
          ? "bg-blue-600 text-white" 
          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
      }`}
    >
      Yesterday
    </button>
    
    <button
      onClick={() => handleDatePresetChange("today")}
      className={`px-3 py-1 text-sm rounded-md ${
        dateFilterType === "today" 
          ? "bg-blue-600 text-white" 
          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
      }`}
    >
      Today
    </button>
    
    <button
      onClick={() => handleDatePresetChange("custom")}
      className={`px-3 py-1 text-sm rounded-md ${
        dateFilterType === "custom" 
          ? "bg-blue-600 text-white" 
          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
      }`}
    >
      Custom
    </button>
  </div>
  
  {dateFilterType === "custom" && (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
        <input
          type="date"
          value={startDate}
          onChange={handleStartDateChange}
          className="w-full p-2 border border-gray-300 rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
        <input
          type="date"
          value={endDate}
          onChange={handleEndDateChange}
          className="w-full p-2 border border-gray-300 rounded"
        />
      </div>
      
      {/* Date filter apply button */}
      <div className="md:col-span-2">
        <button 
          onClick={applyDateFilters}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Apply Custom Date Range
        </button>
      </div>
    </div>
  )}
</div>

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includePending"
                checked={includePendingBets}
                onChange={(e) => setIncludePendingBets(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="includePending" className="ml-2 text-sm text-gray-700">
                Include pending bets in calculations
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeProps"
                checked={includePlayerProps}
                onChange={(e) => setIncludePlayerProps(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="includeProps" className="ml-2 text-sm text-gray-700">
                Include player prop bets
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Key Performance Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* Total Profit Card */}
          <Card className="bg-white">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Profit</p>
                  <p className={`text-2xl font-bold mt-1 ${getColorClass(stats.total_profit)}`}>
                    {formatMoney(stats.total_profit)}
                  </p>
                </div>
                <div className="text-xl">💰</div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Expected: {formatMoney(stats.expected_profit)}
              </p>
            </CardContent>
          </Card>

          {/* ROI Card */}
          <Card className="bg-white">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Return on Investment</p>
                  <p className={`text-2xl font-bold mt-1 ${getColorClass(stats.roi)}`}>
                    {formatPercent(stats.roi)}
                  </p>
                </div>
                <div className="text-xl">📈</div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Expected: {formatPercent(stats.expected_roi)}
              </p>
            </CardContent>
          </Card>

          {/* Win Rate Card */}
          <Card className="bg-white">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Win Rate</p>
                  <p className={`text-2xl font-bold mt-1 ${getColorClass(stats.win_rate, 50)}`}>
                    {formatPercent(stats.win_rate)}
                  </p>
                </div>
                <div className="text-xl">🎯</div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {stats.winning_bets} of {stats.winning_bets + stats.losing_bets} bets
              </p>
            </CardContent>
          </Card>

          {/* CLV Win Rate Card */}
          <Card className="bg-white">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">CLV Win Rate</p>
                  <p className={`text-2xl font-bold mt-1 ${getColorClass(stats.clv_win_rate, 50)}`}>
                    {formatPercent(stats.clv_win_rate)}
                  </p>
                </div>
                <div className="text-xl">⚖️</div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Beat closing line value
              </p>
            </CardContent>
          </Card>

          {/* Average EV Card */}
          <Card className="bg-white">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Average EV%</p>
                  <p className={`text-2xl font-bold mt-1 ${getColorClass(stats.avg_ev)}`}>
                    {formatPercent(stats.avg_ev)}
                  </p>
                </div>
                <div className="text-xl">🔮</div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                For bets with valid CLV
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Performance Breakdown Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Performance Breakdown</h2>

        <Tabs defaultValue="sportsbook">
          <TabsList className="mb-4">
            <TabsTrigger value="sportsbook">By Sportsbook</TabsTrigger>
            {sportStats.length > 0 && <TabsTrigger value="sport">By Sport</TabsTrigger>}
            <TabsTrigger value="evquality">By EV Quality</TabsTrigger>
          </TabsList>

          <TabsContent value="sportsbook" className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Sportsbook</th>
                    <th>Bets</th>
                    <th className="text-left">Stake</th>
                    <th className="text-left">Profit</th>
                    <th className="text-left">Expected Profit</th>
                    <th className="text-left">ROI</th>
                    <th className="text-left">Avg EV%</th>
                  </tr>
                </thead>
                <tbody>
                  {sportsbookStats.map((sb) => (
                    <tr key={sb.name}>
                      <td>{sb.name}</td>
                      <td>{sb.betCount}</td>
                      <td className="text-left">{formatMoney(sb.totalStake)}</td>
                      <td className={`text-left ${getColorClass(sb.totalProfit)}`}>
                        {formatMoney(sb.totalProfit)}
                      </td>
                      <td className="text-left">{formatMoney(sb.expectedProfit)}</td>
                      <td className={`text-left ${getColorClass(sb.roi)}`}>
                        {formatPercent(sb.roi)}
                      </td>
                      <td className="text-left">{formatPercent(sb.avgEV)}</td>
                    </tr>
                  ))}
                  {sportsbookStats.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-gray-500">
                        No sportsbook data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {sportStats.length > 0 && (
            <TabsContent value="sport" className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Sport</th>
                      <th>Bets</th>
                      <th className="text-left">Stake</th>
                      <th className="text-left">Profit</th>
                      <th className="text-left">Expected Profit</th>
                      <th className="text-left">ROI</th>
                      <th className="text-left">Avg EV%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sportStats.map((sport) => (
                      <tr key={sport.name}>
                        <td>{sport.name}</td>
                        <td>{sport.betCount}</td>
                        <td className="text-left">{formatMoney(sport.totalStake)}</td>
                        <td className={`text-left ${getColorClass(sport.totalProfit)}`}>
                          {formatMoney(sport.totalProfit)}
                        </td>
                        <td className="text-left">{formatMoney(sport.expectedProfit)}</td>
                        <td className={`text-left ${getColorClass(sport.roi)}`}>
                          {formatPercent(sport.roi)}
                        </td>
                        <td className="text-left">{formatPercent(sport.avgEV)}</td>
                      </tr>
                    ))}
                    {sportStats.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-gray-500">
                          No sport data available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          )}

          <TabsContent value="evquality" className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>EV Quality</th>
                    <th>Bets</th>
                    <th className="text-left">Stake</th>
                    <th className="text-left">Profit</th>
                    <th className="text-left">Expected Profit</th>
                    <th className="text-left">ROI</th>
                    <th className="text-left">Avg EV%</th>
                  </tr>
                </thead>
                <tbody>
                  {evQualityStats.map((ev) => (
                    <tr key={ev.name}>
                      <td>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium 
                          ${ev.name === 'High EV' ? 'bg-green-100 text-green-800' : 
                            ev.name === 'Medium EV' ? 'bg-yellow-100 text-yellow-800' : 
                            ev.name === 'Low EV' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'}`
                        }>
                          {ev.name}
                        </span>
                      </td>
                      <td>{ev.betCount}</td>
                      <td className="text-right">{formatMoney(ev.totalStake)}</td>
                      <td className={`text-right ${getColorClass(ev.totalProfit)}`}>
                        {formatMoney(ev.totalProfit)}
                      </td>
                      <td className="text-right">{formatMoney(ev.expectedProfit)}</td>
                      <td className={`text-right ${getColorClass(ev.roi)}`}>
                        {formatPercent(ev.roi)}
                      </td>
                      <td className="text-right">{formatPercent(ev.avgEV)}</td>
                    </tr>
                  ))}
                  {evQualityStats.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-gray-500">
                        No EV quality data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Recent Bets Section */}
      <div>
  <h2 className="text-xl font-semibold mb-4 text-gray-800">Recent EV Bets</h2>

  <div className="bg-white rounded-lg shadow overflow-hidden">
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th onClick={() => handleSort("event_name")} className="cursor-pointer">
              Event {sortColumn === "event_name" && (sortDirection === "asc" ? "↑" : "↓")}
            </th>
            <th onClick={() => handleSort("bet_name")} className="cursor-pointer">
              Bet {sortColumn === "bet_name" && (sortDirection === "asc" ? "↑" : "↓")}
            </th>
            <th onClick={() => handleSort("sportsbook")} className="cursor-pointer">
              Sportsbook {sortColumn === "sportsbook" && (sortDirection === "asc" ? "↑" : "↓")}
            </th>
            <th onClick={() => handleSort("odds")} className="cursor-pointer text-left">
              Odds {sortColumn === "odds" && (sortDirection === "asc" ? "↑" : "↓")}
            </th>
            <th onClick={() => handleSort("clv")} className="cursor-pointer text-left">
              CLV {sortColumn === "clv" && (sortDirection === "asc" ? "↑" : "↓")}
            </th>
            <th onClick={() => handleSort("ev_percent")} className="cursor-pointer text-left">
              EV% {sortColumn === "ev_percent" && (sortDirection === "asc" ? "↑" : "↓")}
            </th>
            <th onClick={() => handleSort("stake")} className="cursor-pointer text-left">
              Stake {sortColumn === "stake" && (sortDirection === "asc" ? "↑" : "↓")}
            </th>
            <th onClick={() => handleSort("bet_profit")} className="cursor-pointer text-left">
              Profit {sortColumn === "bet_profit" && (sortDirection === "asc" ? "↑" : "↓")}
            </th>
            <th onClick={() => handleSort("status")} className="cursor-pointer text-left">
              Status {sortColumn === "status" && (sortDirection === "asc" ? "↑" : "↓")}
            </th>
            <th onClick={() => handleSort("event_start_date")} className="cursor-pointer text-left">
              Date {sortColumn === "event_start_date" && (sortDirection === "asc" ? "↑" : "↓")}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortBets(filteredBets)
            .slice((currentPage - 1) * pageSize, currentPage * pageSize)
            .map((bet) => (
              <tr key={bet.id}>
                <td className="max-w-xs truncate text-left" title={bet.event_name}>{bet.event_name}</td>
                <td className="text-left">{bet.bet_name}</td>
                <td className="text-left">{bet.sportsbook}</td>
                <td className="text-left">{bet.odds > 0 ? `+${bet.odds}` : bet.odds}</td>
                <td className="text-left">{bet.clv !== null ? (bet.clv > 0 ? `+${bet.clv}` : bet.clv) : "N/A"}</td>
                <td className={`text-left ${bet.ev_percent !== null ? getColorClass(bet.ev_percent * 100) : "text-gray-400"}`}>
                  {bet.ev_percent !== null ? formatPercent(bet.ev_percent * 100) : "N/A"}
                </td>
                <td className="text-left">{formatMoney(bet.stake)}</td>
                <td className={`text-left ${getColorClass(bet.bet_profit)}`}>
                  {formatMoney(bet.bet_profit)}
                </td>
                <td className="text-left">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium 
                    ${bet.status === 'won' ? 'bg-green-100 text-green-800' : 
                      bet.status === 'lost' ? 'bg-red-100 text-red-800' : 
                      bet.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-gray-100 text-gray-800'}`
                  }>
                    {bet.status}
                  </span>
                </td>
                <td className="text-left">{new Date(bet.event_start_date).toLocaleDateString()}</td>
              </tr>
            ))}
          {filteredBets.length === 0 && (
            <tr>
              <td colSpan={10} className="p-4 text-center text-gray-500">
                No bets found matching your filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
    
    {/* Pagination controls */}
    {filteredBets.length > 0 && (
      <div className="p-4 border-t border-gray-200 flex items-center justify-between">
        <div className="flex items-center">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1); // Reset to first page when changing page size
            }}
            className="mr-4 p-2 border border-gray-300 rounded"
          >
            <option value={10}>10 per page</option>
            <option value={15}>15 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </select>
          <span className="text-sm text-gray-600">
            Showing {Math.min((currentPage - 1) * pageSize + 1, filteredBets.length)} to {Math.min(currentPage * pageSize, filteredBets.length)} of {filteredBets.length} bets
          </span>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded ${
              currentPage === 1
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            &laquo;
          </button>
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded ${
              currentPage === 1
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            &lsaquo;
          </button>
          
          <span className="px-3 py-1 rounded bg-blue-600 text-white">
            {currentPage}
          </span>
          
          <button
            onClick={() => setCurrentPage(Math.min(Math.ceil(filteredBets.length / pageSize), currentPage + 1))}
            disabled={currentPage >= Math.ceil(filteredBets.length / pageSize)}
            className={`px-3 py-1 rounded ${
              currentPage >= Math.ceil(filteredBets.length / pageSize)
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            &rsaquo;
          </button>
          <button
            onClick={() => setCurrentPage(Math.ceil(filteredBets.length / pageSize))}
            disabled={currentPage >= Math.ceil(filteredBets.length / pageSize)}
            className={`px-3 py-1 rounded ${
              currentPage >= Math.ceil(filteredBets.length / pageSize)
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            &raquo;
          </button>
        </div>
      </div>
    )}
  </div>
</div>

      {/* Explanation Section */}
      <Card>
        <CardHeader>
          <CardTitle>How EV Analysis Works</CardTitle>
          <CardDescription>Understanding how expected value is calculated</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">EV% Formula</h3>
            <p className="text-gray-600">
              EV% = (CLV implied probability / odds implied probability) - 1
            </p>
            <p className="text-sm text-gray-500 mt-1">
              This measures the expected edge based on the difference between closing line odds and your bet odds.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Expected Profit</h3>
            <p className="text-gray-600">
              Expected Profit = Stake × EV%
            </p>
            <p className="text-sm text-gray-500 mt-1">
              This calculates the mathematical expectation of profit based on your edge.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">EV Quality Categories</h3>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                High EV (10%+)
              </span>
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                Medium EV (5-10%)
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                Low EV (0-5%)
              </span>
              <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                No CLV (Missing closing line)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}