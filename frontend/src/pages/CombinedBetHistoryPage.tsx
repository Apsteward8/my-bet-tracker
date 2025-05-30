import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import LoadingSpinner from "../components/LoadingSpinner";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5007';

// Types
interface UnifiedBet {
  source: "oddsjam" | "pikkit";
  original_id: number;
  bet_id?: string;
  sportsbook: string;
  bet_type: string;
  status: string;
  odds: number;
  clv?: number;
  stake: number;
  bet_profit: number;
  sport: string;
  league: string;
  tags: string;
  time_placed?: string;
  time_settled?: string;
  event_start_date?: string;
  bet_info: string;
  event_name: string;
  bet_name: string;
  market_name: string;
  potential_payout?: number;
  is_live_bet?: boolean;
  is_free_bet?: boolean;
  is_odds_boost?: boolean;
  ev?: number;
}

interface UnifiedStats {
  unified_stats: {
    total_bets: number;
    winning_bets: number;
    losing_bets: number;
    pending_bets: number;
    total_stake: number;
    total_profit: number;
    roi: number;
    win_rate: number;
  };
  source_breakdown: {
    pikkit: { bet_count: number; sportsbooks_tracked: number; };
    oddsjam: { bet_count: number; sportsbooks_tracked: number; };
  };
  sportsbook_stats: {
    name: string;
    source: string;
    bet_count: number;
    total_stake: number;
    total_profit: number;
    roi: number;
  }[];
  mapping_rules: {
    pikkit_priority: string[];
    oddsjam_priority: string;
  };
}

interface DailyData {
  date: string;
  profit: number;
  cumulative: number;
  settled_bets: number;
  oddsjam_profit: number;
  pikkit_profit: number;
  oddsjam_bets: number;
  pikkit_bets: number;
}

interface CalendarDay {
  date: string;
  profit: number;
  bet_count: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

// Optimized Past Week Chart Component
const PastWeekChart: React.FC<{ isLoading: boolean }> = ({ isLoading }) => {
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [chartLoading, setChartLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDailyData();
  }, []);

  const fetchDailyData = async () => {
    try {
      setChartLoading(true);
      const response = await fetch(`${API_URL}/api/unified-daily-data?days=7`);
      const data = await response.json();

      if (response.ok) {
        console.log("Daily data received:", data);
        setDailyData(data.daily_data || []);
      } else {
        setError(data.error || "Failed to load chart data");
      }
    } catch (err) {
      console.error("Error fetching daily data:", err);
      setError("Failed to load chart data");
    } finally {
      setChartLoading(false);
    }
  };

  if (chartLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Past Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="medium" message="Loading chart..." />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Past Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-red-500">Error: {error}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!dailyData || dailyData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Past Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">No data available for the past week</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxProfit = Math.max(...dailyData.map(d => d.cumulative));
  const minProfit = Math.min(...dailyData.map(d => d.cumulative));
  const range = Math.max(maxProfit - minProfit, 100); // Minimum range of 100
  
  const height = 200;
  const width = 600;
  const padding = 40;

  const getY = (value: number) => {
    return height - padding - ((value - minProfit) / range) * (height - 2 * padding);
  };

  const getX = (index: number) => {
    return padding + (index / Math.max(dailyData.length - 1, 1)) * (width - 2 * padding);
  };

  const pathData = dailyData.map((point, index) => {
    const x = getX(index);
    const y = getY(point.cumulative);
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const formatMoney = (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const currentValue = dailyData[dailyData.length - 1]?.cumulative || 0;
  const previousValue = dailyData[dailyData.length - 2]?.cumulative || 0;
  const dailyChange = currentValue - previousValue;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Past Week Performance</CardTitle>
            <div className="flex items-center gap-4 mt-2">
              <div className="text-3xl font-bold">
                {formatMoney(currentValue)}
              </div>
              <div className={`text-sm ${dailyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {dailyChange >= 0 ? '+' : ''}{formatMoney(dailyChange)} Today
              </div>
            </div>
          </div>
          <button 
            onClick={fetchDailyData}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
          >
            Refresh
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <svg width={width} height={height} className="w-full">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
              const y = padding + ratio * (height - 2 * padding);
              const value = maxProfit - ratio * range;
              return (
                <g key={ratio}>
                  <line
                    x1={padding}
                    y1={y}
                    x2={width - padding}
                    y2={y}
                    stroke="#374151"
                    strokeWidth={0.5}
                    opacity={0.3}
                  />
                  <text
                    x={padding - 10}
                    y={y + 4}
                    fontSize="12"
                    fill="#6B7280"
                    textAnchor="end"
                  >
                    ${Math.round(value).toLocaleString()}
                  </text>
                </g>
              );
            })}
            
            {/* Chart line */}
            <path
              d={pathData}
              fill="none"
              stroke="#3B82F6"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Data points */}
            {dailyData.map((point, index) => (
              <circle
                key={index}
                cx={getX(index)}
                cy={getY(point.cumulative)}
                r={4}
                fill="#3B82F6"
                stroke="#1E40AF"
                strokeWidth={2}
              />
            ))}
          </svg>
          
          {/* Date labels */}
          <div className="flex justify-between mt-2 px-10">
            {dailyData.map((point, index) => (
              <div key={index} className="text-xs text-gray-500 text-center">
                {new Date(point.date).toLocaleDateString('en-US', { 
                  month: '2-digit', 
                  day: '2-digit' 
                })}
              </div>
            ))}
          </div>
        </div>
        
        {/* Summary stats */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            You have{' '}
            <span className="text-green-500 font-medium">
              {dailyData.reduce((sum, d) => sum + d.settled_bets, 0)} settled
            </span>
            {' '}bets this week and you are{' '}
            <span className={`font-medium ${currentValue >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {currentValue >= 0 ? 'up' : 'down'} {formatMoney(Math.abs(currentValue))}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Optimized Calendar Component
const CalendarView: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<{ [key: string]: { profit: number; bet_count: number } }>({});
  const [calendarLoading, setCalendarLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCalendarData();
  }, [currentDate]);

  const fetchCalendarData = async () => {
    try {
      setCalendarLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const response = await fetch(`${API_URL}/api/unified-calendar-data?year=${year}&month=${month}`);
      const data = await response.json();

      if (response.ok) {
        console.log("Calendar data received:", data);
        
        // Convert array to object for easy lookup
        const dataMap: { [key: string]: { profit: number; bet_count: number } } = {};
        (data.calendar_data || []).forEach((day: any) => {
          dataMap[day.date] = {
            profit: day.profit,
            bet_count: day.bet_count
          };
        });
        
        setCalendarData(dataMap);
      } else {
        setError(data.error || "Failed to load calendar data");
      }
    } catch (err) {
      console.error("Error fetching calendar data:", err);
      setError("Failed to load calendar data");
    } finally {
      setCalendarLoading(false);
    }
  };

  const generateCalendarDays = (): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const today = new Date();
    
    // Get first day of month and calculate days to show
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
    
    const days: CalendarDay[] = [];
    
    // Generate 42 days (6 weeks) for calendar grid
    for (let i = 0; i < 42; i++) {
      const currentDay = new Date(startDate);
      currentDay.setDate(startDate.getDate() + i);
      
      const dateKey = currentDay.toISOString().split('T')[0];
      const dayData = calendarData[dateKey];
      
      days.push({
        date: dateKey,
        profit: dayData?.profit || 0,
        bet_count: dayData?.bet_count || 0,
        isCurrentMonth: currentDay.getMonth() === month,
        isToday: currentDay.toDateString() === today.toDateString()
      });
    }
    
    return days;
  };

  const formatMoney = (amount: number) => {
    if (amount === 0) return '';
    return amount >= 0 ? `$${Math.round(amount)}` : `-$${Math.round(Math.abs(amount))}`;
  };

  const getMonthName = () => {
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const getDayClassName = (day: CalendarDay) => {
    let className = "p-2 rounded-lg text-center transition-colors min-h-[60px] flex flex-col justify-between ";
    
    if (!day.isCurrentMonth) {
      className += "text-gray-400 bg-gray-50 ";
    } else if (day.profit > 0) {
      className += "bg-green-100 text-green-800 border border-green-200 ";
    } else if (day.profit < 0) {
      className += "bg-red-100 text-red-800 border border-red-200 ";
    } else if (day.bet_count > 0) {
      className += "bg-yellow-50 text-yellow-800 border border-yellow-200 ";
    } else {
      className += "text-gray-600 hover:bg-gray-100 ";
    }
    
    if (day.isToday) {
      className += "ring-2 ring-blue-400 ";
    }
    
    return className;
  };

  const calendarDays = generateCalendarDays();
  const totalProfit = calendarDays
    .filter(day => day.isCurrentMonth)
    .reduce((sum, day) => sum + day.profit, 0);

  if (calendarLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="medium" message="Loading calendar..." />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-red-500">Error: {error}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 hover:bg-gray-100 rounded"
            >
              ←
            </button>
            <div>
              <CardTitle className="flex items-center gap-2">
                {getMonthName()}
              </CardTitle>
            </div>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 hover:bg-gray-100 rounded"
            >
              →
            </button>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Total profit:</div>
            <div className={`text-lg font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalProfit >= 0 ? '+' : ''}{formatMoney(totalProfit)}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Day headers */}
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <div key={`day-header-${index}`} className="text-center text-sm font-medium text-gray-500 p-2">
              {day}
            </div>
          ))}
          
          {/* Calendar days */}
          {calendarDays.map((day, index) => (
            <div key={index} className={getDayClassName(day)}>
              <div className="font-semibold">{new Date(day.date).getDate()}</div>
              {day.profit !== 0 && (
                <div className="text-xs mt-1">
                  {formatMoney(day.profit)}
                </div>
              )}
              {day.bet_count > 0 && (
                <div className="text-xs opacity-70">
                  {day.bet_count} bet{day.bet_count !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default function OptimizedCombinedHistoryPage() {
  const [bets, setBets] = useState<UnifiedBet[]>([]);
  const [stats, setStats] = useState<UnifiedStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalBets, setTotalBets] = useState<number>(0);
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterSportsbook, setFilterSportsbook] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Fetch main data (bets and stats) - optimized to not fetch chart data
  useEffect(() => {
    fetchMainData();
  }, [currentPage, pageSize, filterSportsbook, filterStatus, filterSource]);

  // Fetch stats once on mount
  useEffect(() => {
    fetchUnifiedStats();
  }, []);

  const fetchMainData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: pageSize.toString(),
      });

      if (filterSportsbook !== "all") params.append("sportsbook", filterSportsbook);
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (filterSource !== "all") params.append("source", filterSource);

      const response = await fetch(`${API_URL}/api/unified-bets?${params}`);
      const data = await response.json();

      if (response.ok) {
        setBets(data.items || []);
        setTotalPages(data.pages || 1);
        setTotalBets(data.total || 0);
      } else {
        setError(data.error || "Failed to fetch unified bet data");
      }
    } catch (err) {
      setError("Failed to fetch unified bet data");
      console.error("Error fetching unified bets:", err);
    }

    setIsLoading(false);
  };

  const fetchUnifiedStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/unified-stats`);
      const data = await response.json();

      if (response.ok) {
        setStats(data);
      }
    } catch (err) {
      console.error("Error fetching unified stats:", err);
    }
  };

  // Format helpers
  const formatMoney = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "$0.00";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatPercent = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "0.00%";
    return `${value.toFixed(2)}%`;
  };

  const getColorClass = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return "text-gray-400";
    if (value > 0) return "text-green-600";
    if (value < 0) return "text-red-600";
    return "text-yellow-500";
  };

  const formatOdds = (odds: number) => {
    return odds > 0 ? `+${odds}` : odds.toString();
  };

  const getSourceIcon = (source: string) => {
    return source === 'pikkit' ? '🏛️' : '🌐';
  };

  const getSourceColor = (source: string) => {
    return source === 'pikkit' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
  };

  if (isLoading) {
    return <LoadingSpinner size="large" message="Loading unified bet history..." />;
  }

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">🔗 Unified Bet History</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {totalBets} unified bets from smart source prioritization
          </span>
          <button
            onClick={() => {
              setCurrentPage(1);
              fetchMainData();
              fetchUnifiedStats();
            }}
            className="p-2 rounded-full hover:bg-gray-200"
            title="Refresh data"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Visual Analytics Section - Now loading independently */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Past Week Chart - loads independently */}
        <PastWeekChart isLoading={isLoading} />
        
        {/* Calendar View - loads independently */}
        <CalendarView />
      </div>

      {/* Unified System Overview */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Smart Source Prioritization</CardTitle>
            <CardDescription>
              Automatically uses the best data source for each sportsbook
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 border border-green-200 rounded-lg bg-green-50">
                <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                  🏛️ Pikkit (Automated Tracking)
                </h4>
                <p className="text-green-800 text-sm mb-3">
                  Used for regulated US sportsbooks with automatic bet sync
                </p>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-green-700">Bets Tracked:</span>
                    <span className="font-medium">{stats.source_breakdown.pikkit.bet_count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-700">Sportsbooks:</span>
                    <span className="font-medium">{stats.source_breakdown.pikkit.sportsbooks_tracked}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  🌐 OddsJam (Manual Tracking)
                </h4>
                <p className="text-blue-800 text-sm mb-3">
                  Used for offshore and specialty sportsbooks
                </p>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">Bets Tracked:</span>
                    <span className="font-medium">{stats.source_breakdown.oddsjam.bet_count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">Sportsbooks:</span>
                    <span className="font-medium">{stats.source_breakdown.oddsjam.sportsbooks_tracked}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unified Statistics */}
      {stats && (
        <div>
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Unified Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-white">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Profit</p>
                    <p className={`text-2xl font-bold mt-1 ${getColorClass(stats.unified_stats.total_profit)}`}>
                      {formatMoney(stats.unified_stats.total_profit)}
                    </p>
                  </div>
                  <div className="text-xl">💰</div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  From {stats.unified_stats.total_bets} bets
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">ROI</p>
                    <p className={`text-2xl font-bold mt-1 ${getColorClass(stats.unified_stats.roi)}`}>
                      {formatPercent(stats.unified_stats.roi)}
                    </p>
                  </div>
                  <div className="text-xl">📈</div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Total stake: {formatMoney(stats.unified_stats.total_stake)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Win Rate</p>
                    <p className={`text-2xl font-bold mt-1 ${getColorClass(stats.unified_stats.win_rate, 50)}`}>
                      {formatPercent(stats.unified_stats.win_rate)}
                    </p>
                  </div>
                  <div className="text-xl">🎯</div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {stats.unified_stats.winning_bets}W-{stats.unified_stats.losing_bets}L
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Pending Bets</p>
                    <p className="text-2xl font-bold mt-1 text-yellow-600">
                      {stats.unified_stats.pending_bets}
                    </p>
                  </div>
                  <div className="text-xl">⏳</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Source</label>
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              >
                <option value="all">All Sources</option>
                <option value="pikkit">🏛️ Pikkit Only</option>
                <option value="oddsjam">🌐 OddsJam Only</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sportsbook</label>
              <select
                value={filterSportsbook}
                onChange={(e) => setFilterSportsbook(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              >
                <option value="all">All Sportsbooks</option>
                {stats?.sportsbook_stats.map(sb => (
                  <option key={sb.name} value={sb.name}>
                    {getSourceIcon(sb.source)} {sb.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              >
                <option value="all">All Statuses</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
                <option value="pending">Pending</option>
                <option value="push">Push</option>
                <option value="void">Void</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => {
                  setCurrentPage(1);
                  fetchMainData();
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sportsbook Performance */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Sportsbook Performance (Unified)</CardTitle>
            <CardDescription>Performance across all sportsbooks with data source indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Sportsbook</th>
                    <th>Source</th>
                    <th>Bets</th>
                    <th className="text-right">Profit</th>
                    <th className="text-right">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.sportsbook_stats.slice(0, 10).map((sb) => (
                    <tr key={sb.name}>
                      <td className="font-medium">{sb.name}</td>
                      <td>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSourceColor(sb.source)}`}>
                          {getSourceIcon(sb.source)} {sb.source}
                        </span>
                      </td>
                      <td>{sb.bet_count}</td>
                      <td className={`text-right ${getColorClass(sb.total_profit)}`}>
                        {formatMoney(sb.total_profit)}
                      </td>
                      <td className={`text-right ${getColorClass(sb.roi)}`}>
                        {formatPercent(sb.roi)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unified Bet Table */}
      <Card>
        <CardHeader>
          <CardTitle>Unified Bet History</CardTitle>
          <CardDescription>
            All bets with consistent formatting across both data sources
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Bet Description</th>
                  <th>Sportsbook</th>
                  <th className="text-right">Odds</th>
                  <th className="text-right">CLV</th>
                  <th className="text-right">Stake</th>
                  <th className="text-right">Profit</th>
                  <th>Status</th>
                  <th className="text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {bets.map((bet) => (
                  <tr key={`${bet.source}-${bet.original_id}`}>
                    <td>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSourceColor(bet.source)}`}>
                        {getSourceIcon(bet.source)}
                      </span>
                    </td>
                    <td className="max-w-md" title={bet.bet_info}>
                      <div className="truncate">
                        {bet.bet_info}
                      </div>
                    </td>
                    <td>{bet.sportsbook}</td>
                    <td className="text-right">{formatOdds(bet.odds)}</td>
                    <td className="text-right">{bet.clv ? formatOdds(bet.clv) : 'N/A'}</td>
                    <td className="text-right">{formatMoney(bet.stake)}</td>
                    <td className={`text-right ${getColorClass(bet.bet_profit)}`}>
                      {formatMoney(bet.bet_profit)}
                    </td>
                    <td>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium 
                        ${bet.status === 'won' ? 'bg-green-100 text-green-800' : 
                          bet.status === 'lost' ? 'bg-red-100 text-red-800' : 
                          bet.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-gray-100 text-gray-800'}`}>
                        {bet.status}
                      </span>
                    </td>
                    <td className="text-right text-sm">
                      {bet.time_placed ? new Date(bet.time_placed).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
                {bets.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-4 text-center text-gray-500">
                      No bets found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalBets > 0 && (
            <div className="p-4 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="mr-4 p-2 border border-gray-300 rounded"
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                </select>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages} | Showing {bets.length} of {totalBets} total bets
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
                  First
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
                  Previous
                </button>
                <span className="px-3 py-1 rounded bg-blue-600 text-white">
                  {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage >= totalPages}
                  className={`px-3 py-1 rounded ${
                    currentPage >= totalPages
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Next
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage >= totalPages}
                  className={`px-3 py-1 rounded ${
                    currentPage >= totalPages
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Benefits */}
      <Card>
        <CardHeader>
          <CardTitle>Unified System Benefits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">✅ Consistent Data Format</h4>
              <p className="text-gray-600 text-sm">
                All bets use the same field structure regardless of source, making analysis seamless.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">🎯 Automatic Source Selection</h4>
              <p className="text-gray-600 text-sm">
                System automatically uses Pikkit for regulated books and OddsJam for offshore books.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">🔄 No Duplicate Tracking</h4>
              <p className="text-gray-600 text-sm">
                Smart prioritization prevents double-counting bets across both systems.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">📊 Combined Analytics</h4>
              <p className="text-gray-600 text-sm">
                Get holistic performance metrics across your entire betting portfolio.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}