// frontend/src/pages/CalendarPage.tsx
import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/Tabs";
import LoadingSpinner from "../components/LoadingSpinner";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5007';

// Types
interface CalendarBet {
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
  time_placed?: string;
  time_settled?: string;
  event_start_date?: string;
  bet_info: string;
  event_name: string;
  bet_name: string;
  market_name: string;
  potential_payout?: number;
}

interface DayData {
  date: string;
  profit: number;
  bet_count: number;
  settled_count: number;
  pending_count: number;
  won_count: number;
  lost_count: number;
  push_count: number;
  total_stake: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasBets: boolean;
}

interface DayStats {
  date: string;
  bets: CalendarBet[];
  total_bets: number;
  settled_bets: number;
  pending_bets: number;
  won_bets: number;
  lost_bets: number;
  push_bets: number;
  void_bets: number;
  total_stake: number;
  total_profit: number;
  roi: number;
  win_rate: number;
  avg_odds: number;
  biggest_win: number;
  biggest_loss: number;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [calendarData, setCalendarData] = useState<DayData[]>([]);
  const [selectedDayStats, setSelectedDayStats] = useState<DayStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDayLoading, setIsDayLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch calendar data for the current month
  useEffect(() => {
    fetchCalendarData();
  }, [currentDate]);

  // Fetch selected day data when date changes
  useEffect(() => {
    fetchDayData(selectedDate);
  }, [selectedDate]);

  // Initialize with today's date
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
  }, []);

  const fetchCalendarData = async () => {
    try {
      setIsLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const response = await fetch(`${API_URL}/api/calendar-month-data?year=${year}&month=${month}`);
      const data = await response.json();

      if (response.ok) {
        const processedData = generateCalendarDays(data.calendar_data || []);
        setCalendarData(processedData);
      } else {
        setError(data.error || "Failed to load calendar data");
      }
    } catch (err) {
      console.error("Error fetching calendar data:", err);
      setError("Failed to load calendar data");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDayData = async (date: string) => {
    try {
      setIsDayLoading(true);
      const response = await fetch(`${API_URL}/api/calendar-day-data?date=${date}`);
      const data = await response.json();

      if (response.ok) {
        setSelectedDayStats(data);
      } else {
        console.error("Error fetching day data:", data.error);
        setSelectedDayStats(null);
      }
    } catch (err) {
      console.error("Error fetching day data:", err);
      setSelectedDayStats(null);
    } finally {
      setIsDayLoading(false);
    }
  };

  const generateCalendarDays = (monthData: any[]): DayData[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const today = new Date();
    
    // Get first day of month
    const firstDay = new Date(year, month, 1);
    
    // Calculate the start date for the calendar grid (previous Sunday)
    // getDay() returns 0 for Sunday, 1 for Monday, etc.
    const firstDayOfWeek = firstDay.getDay();
    
    // Create start date by going back to the previous Sunday
    const startDate = new Date(year, month, 1 - firstDayOfWeek);
    
    const days: DayData[] = [];
    
    // Create lookup map from month data
    const dataMap: { [key: string]: any } = {};
    monthData.forEach((day: any) => {
      dataMap[day.date] = day;
    });
    
    // Generate 42 days (6 weeks) for calendar grid
    for (let i = 0; i < 42; i++) {
      // Create a new date for each iteration to avoid mutation issues
      const currentDay = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
      
      const dateKey = currentDay.toISOString().split('T')[0];
      const dayData = dataMap[dateKey];
      
      days.push({
        date: dateKey,
        profit: dayData?.profit || 0,
        bet_count: dayData?.bet_count || 0,
        settled_count: dayData?.settled_count || 0,
        pending_count: dayData?.pending_count || 0,
        won_count: dayData?.won_count || 0,
        lost_count: dayData?.lost_count || 0,
        push_count: dayData?.push_count || 0,
        total_stake: dayData?.total_stake || 0,
        isCurrentMonth: currentDay.getMonth() === month,
        isToday: currentDay.toDateString() === today.toDateString(),
        hasBets: (dayData?.bet_count || 0) > 0
      });
    }
    
    return days;
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getColorClass = (value: number): string => {
    if (value > 0) return "text-green-600";
    if (value < 0) return "text-red-600";
    return "text-gray-500";
  };

  const getMonthName = () => {
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const getDayClassName = (day: DayData) => {
    let className = "p-2 rounded-lg text-center transition-all cursor-pointer min-h-[80px] flex flex-col justify-between border ";
    
    if (!day.isCurrentMonth) {
      className += "text-gray-400 bg-gray-50 border-gray-200 ";
    } else if (selectedDate === day.date) {
      className += "ring-2 ring-blue-500 bg-blue-50 border-blue-300 ";
    } else if (day.isToday) {
      className += "ring-2 ring-blue-400 ";
    }
    
    // Color based on profit/loss for settled bets
    if (day.settled_count > 0) {
      if (day.profit > 0) {
        className += "bg-green-100 border-green-300 ";
      } else if (day.profit < 0) {
        className += "bg-red-100 border-red-300 ";
      } else {
        className += "bg-yellow-50 border-yellow-300 ";
      }
    } else if (day.pending_count > 0) {
      // Show pending bets in blue
      className += "bg-blue-50 border-blue-200 ";
    } else {
      className += "bg-white border-gray-200 hover:bg-gray-50 ";
    }
    
    return className;
  };

  const handleDayClick = (day: DayData) => {
    setSelectedDate(day.date);
  };

  const getSourceIcon = (source: string) => {
    return source === 'pikkit' ? '🏛️' : '🌐';
  };

  const formatOdds = (odds: number) => {
    return odds > 0 ? `+${odds}` : odds.toString();
  };

  if (isLoading) {
    return <LoadingSpinner size="large" message="Loading calendar..." />;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
          <h3 className="text-lg font-medium mb-2">Error</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">📅 Betting Calendar</h1>
        <button
          onClick={() => {
            fetchCalendarData();
            fetchDayData(selectedDate);
          }}
          className="p-2 rounded-full hover:bg-gray-200"
          title="Refresh data"
        >
          🔄
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => navigateMonth(-1)}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    ←
                  </button>
                  <CardTitle className="text-xl">
                    {getMonthName()}
                  </CardTitle>
                  <button
                    onClick={() => navigateMonth(1)}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    →
                  </button>
                </div>
                <div className="text-right text-sm">
                  <div className="text-gray-500">Selected:</div>
                  <div className="font-medium">{new Date(selectedDate).toLocaleDateString()}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Calendar Legend */}
              <div className="flex flex-wrap gap-4 mb-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                  <span>Profit</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                  <span>Loss</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-50 border border-blue-200 rounded"></div>
                  <span>Pending</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-white border border-gray-200 rounded"></div>
                  <span>No Bets</span>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Day headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                  <div key={`day-header-${index}`} className="text-center text-sm font-medium text-gray-500 p-2">
                    {day}
                  </div>
                ))}
                
                {/* Calendar days */}
                {calendarData.map((day, index) => (
                  <div 
                    key={index} 
                    className={getDayClassName(day)}
                    onClick={() => handleDayClick(day)}
                  >
                    <div className="font-semibold text-sm">
                      {new Date(day.date).getDate()}
                    </div>
                    
                    {/* Show profit/loss for settled bets */}
                    {day.settled_count > 0 && (
                      <div className={`text-xs font-medium ${getColorClass(day.profit)}`}>
                        {formatMoney(day.profit)}
                      </div>
                    )}
                    
                    {/* Show pending count for pending bets */}
                    {day.pending_count > 0 && day.settled_count === 0 && (
                      <div className="text-xs text-blue-600">
                        {day.pending_count} pending
                      </div>
                    )}
                    
                    {/* Show bet count */}
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
        </div>

        {/* Day Details Section */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>
                {new Date(selectedDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </CardTitle>
              <CardDescription>
                {selectedDayStats?.total_bets || 0} total bets
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isDayLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="medium" message="Loading day data..." />
                </div>
              ) : selectedDayStats ? (
                <div className="space-y-4">
                  {/* Daily Stats Summary */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="font-medium">Total Profit</div>
                      <div className={`text-lg font-bold ${getColorClass(selectedDayStats.total_profit)}`}>
                        {formatMoney(selectedDayStats.total_profit)}
                      </div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="font-medium">ROI</div>
                      <div className={`text-lg font-bold ${getColorClass(selectedDayStats.roi)}`}>
                        {formatPercent(selectedDayStats.roi)}
                      </div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="font-medium">Win Rate</div>
                      <div className="text-lg font-bold text-blue-600">
                        {formatPercent(selectedDayStats.win_rate)}
                      </div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="font-medium">Avg Odds</div>
                      <div className="text-lg font-bold text-gray-700">
                        {formatOdds(Math.round(selectedDayStats.avg_odds))}
                      </div>
                    </div>
                  </div>

                  {/* Record Breakdown */}
                  <div>
                    <h4 className="font-medium mb-2">Record</h4>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div className="text-center p-2 bg-green-50 rounded">
                        <div className="font-medium text-green-700">{selectedDayStats.won_bets}</div>
                        <div className="text-green-600">Won</div>
                      </div>
                      <div className="text-center p-2 bg-red-50 rounded">
                        <div className="font-medium text-red-700">{selectedDayStats.lost_bets}</div>
                        <div className="text-red-600">Lost</div>
                      </div>
                      <div className="text-center p-2 bg-yellow-50 rounded">
                        <div className="font-medium text-yellow-700">{selectedDayStats.pending_bets}</div>
                        <div className="text-yellow-600">Pending</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="font-medium text-gray-700">{selectedDayStats.push_bets + selectedDayStats.void_bets}</div>
                        <div className="text-gray-600">Push/Void</div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Stats */}
                  {selectedDayStats.settled_bets > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Performance</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Total Stake:</span>
                          <span className="font-medium">{formatMoney(selectedDayStats.total_stake)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Biggest Win:</span>
                          <span className="font-medium text-green-600">{formatMoney(selectedDayStats.biggest_win)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Biggest Loss:</span>
                          <span className="font-medium text-red-600">{formatMoney(selectedDayStats.biggest_loss)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No betting activity on this day
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detailed Bets for Selected Day */}
      {selectedDayStats && selectedDayStats.bets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Bets for {new Date(selectedDate).toLocaleDateString()}
            </CardTitle>
            <CardDescription>
              {selectedDayStats.bets.length} bets placed on this day
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">All ({selectedDayStats.total_bets})</TabsTrigger>
                <TabsTrigger value="won">Won ({selectedDayStats.won_bets})</TabsTrigger>
                <TabsTrigger value="lost">Lost ({selectedDayStats.lost_bets})</TabsTrigger>
                {selectedDayStats.pending_bets > 0 && (
                  <TabsTrigger value="pending">Pending ({selectedDayStats.pending_bets})</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="all">
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Source</th>
                        <th>Bet</th>
                        <th>Sportsbook</th>
                        <th className="text-right">Odds</th>
                        <th className="text-right">Stake</th>
                        <th className="text-right">Profit</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDayStats.bets.map((bet, index) => (
                        <tr key={`${bet.source}-${bet.original_id}`}>
                          <td>
                            <span className="text-sm">
                              {getSourceIcon(bet.source)}
                            </span>
                          </td>
                          <td className="max-w-xs">
                            <div className="truncate" title={bet.bet_info}>
                              {bet.bet_info || `${bet.event_name} - ${bet.bet_name}`}
                            </div>
                          </td>
                          <td>{bet.sportsbook}</td>
                          <td className="text-right">{formatOdds(bet.odds)}</td>
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="won">
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Source</th>
                        <th>Bet</th>
                        <th>Sportsbook</th>
                        <th className="text-right">Odds</th>
                        <th className="text-right">Stake</th>
                        <th className="text-right">Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDayStats.bets.filter(bet => bet.status === 'won').map((bet, index) => (
                        <tr key={`won-${bet.source}-${bet.original_id}`}>
                          <td>{getSourceIcon(bet.source)}</td>
                          <td className="max-w-xs">
                            <div className="truncate" title={bet.bet_info}>
                              {bet.bet_info || `${bet.event_name} - ${bet.bet_name}`}
                            </div>
                          </td>
                          <td>{bet.sportsbook}</td>
                          <td className="text-right">{formatOdds(bet.odds)}</td>
                          <td className="text-right">{formatMoney(bet.stake)}</td>
                          <td className="text-right text-green-600">
                            {formatMoney(bet.bet_profit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="lost">
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Source</th>
                        <th>Bet</th>
                        <th>Sportsbook</th>
                        <th className="text-right">Odds</th>
                        <th className="text-right">Stake</th>
                        <th className="text-right">Loss</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDayStats.bets.filter(bet => bet.status === 'lost').map((bet, index) => (
                        <tr key={`lost-${bet.source}-${bet.original_id}`}>
                          <td>{getSourceIcon(bet.source)}</td>
                          <td className="max-w-xs">
                            <div className="truncate" title={bet.bet_info}>
                              {bet.bet_info || `${bet.event_name} - ${bet.bet_name}`}
                            </div>
                          </td>
                          <td>{bet.sportsbook}</td>
                          <td className="text-right">{formatOdds(bet.odds)}</td>
                          <td className="text-right">{formatMoney(bet.stake)}</td>
                          <td className="text-right text-red-600">
                            {formatMoney(bet.bet_profit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {selectedDayStats.pending_bets > 0 && (
                <TabsContent value="pending">
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Source</th>
                          <th>Bet</th>
                          <th>Sportsbook</th>
                          <th className="text-right">Odds</th>
                          <th className="text-right">Stake</th>
                          <th className="text-right">Potential Payout</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDayStats.bets.filter(bet => bet.status === 'pending').map((bet, index) => (
                          <tr key={`pending-${bet.source}-${bet.original_id}`}>
                            <td>{getSourceIcon(bet.source)}</td>
                            <td className="max-w-xs">
                              <div className="truncate" title={bet.bet_info}>
                                {bet.bet_info || `${bet.event_name} - ${bet.bet_name}`}
                              </div>
                            </td>
                            <td>{bet.sportsbook}</td>
                            <td className="text-right">{formatOdds(bet.odds)}</td>
                            <td className="text-right">{formatMoney(bet.stake)}</td>
                            <td className="text-right text-blue-600">
                              {formatMoney(bet.potential_payout || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}