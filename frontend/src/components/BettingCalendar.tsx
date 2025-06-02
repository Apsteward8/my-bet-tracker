import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5007';

const BettingCalendar = () => {
  // State management
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [monthData, setMonthData] = useState([]);
  const [selectedDayData, setSelectedDayData] = useState(null);
  const [monthSummary, setMonthSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDayLoading, setIsDayLoading] = useState(false);

  // Get current month/year
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Fetch month data when date changes
  useEffect(() => {
    fetchMonthData(currentYear, currentMonth + 1); // API expects 1-based month
  }, [currentYear, currentMonth]);

  // Fetch day data when selected date changes
  useEffect(() => {
    if (selectedDate) {
      fetchDayData(selectedDate);
    }
  }, [selectedDate]);

  const fetchMonthData = async (year, month) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/unified/calendar-month?year=${year}&month=${month}`);
      const data = await response.json();
      
      if (response.ok) {
        setMonthData(data.calendar_data || []);
        setMonthSummary(data.summary || {});
      } else {
        console.error('Error fetching month data:', data.error);
        setMonthData([]);
        setMonthSummary({});
      }
    } catch (error) {
      console.error('Error fetching month data:', error);
      setMonthData([]);
      setMonthSummary({});
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDayData = async (dateString) => {
    setIsDayLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/unified/calendar-day?date=${dateString}`);
      const data = await response.json();
      
      if (response.ok) {
        setSelectedDayData(data);
      } else {
        console.error('Error fetching day data:', data.error);
        setSelectedDayData(null);
      }
    } catch (error) {
      console.error('Error fetching day data:', error);
      setSelectedDayData(null);
    } finally {
      setIsDayLoading(false);
    }
  };

  // Generate calendar grid with proper date alignment
  const generateCalendarGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Get first day of month and its day of week (0 = Sunday)
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay();
    
    // Get last day of month
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Calculate start date (could be from previous month)
    const startDate = new Date(year, month, 1 - firstDayOfWeek);
    
    // Generate 42 days (6 weeks × 7 days)
    const calendarDays = [];
    const today = new Date();
    const todayString = formatDateString(today);
    
    // Create lookup for month data
    const monthDataMap = {};
    monthData.forEach(dayData => {
      monthDataMap[dayData.date] = dayData;
    });
    
    for (let i = 0; i < 42; i++) {
      const currentDay = new Date(startDate);
      currentDay.setDate(startDate.getDate() + i);
      
      const dateString = formatDateString(currentDay);
      const dayData = monthDataMap[dateString] || {};
      
      const isCurrentMonth = currentDay.getMonth() === month;
      const isToday = dateString === todayString;
      const isSelected = selectedDate === dateString;
      const isWeekend = currentDay.getDay() === 0 || currentDay.getDay() === 6;
      
      calendarDays.push({
        date: currentDay.getDate(),
        dateString: dateString,
        isCurrentMonth,
        isToday,
        isSelected,
        isWeekend,
        profit: dayData.profit || 0,
        betCount: dayData.bet_count || 0,
        settledCount: dayData.settled_count || 0,
        pendingCount: dayData.pending_count || 0,
        wonCount: dayData.won_count || 0,
        lostCount: dayData.lost_count || 0,
        totalStake: dayData.total_stake || 0
      });
    }
    
    return calendarDays;
  };

  // Helper function to format date as YYYY-MM-DD
  const formatDateString = (date) => {
    return date.getFullYear() + '-' + 
           String(date.getMonth() + 1).padStart(2, '0') + '-' + 
           String(date.getDate()).padStart(2, '0');
  };

  // Helper function to format money
  const formatMoney = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return "$0";
    }
    const numAmount = Number(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numAmount);
  };

  // Helper function to format percentage
  const formatPercent = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return "0.0%";
    }
    const numValue = Number(value);
    return `${numValue.toFixed(1)}%`;
  };

  // Get color class based on value
  const getColorClass = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return 'text-gray-500';
    }
    const numValue = Number(value);
    if (numValue > 0) return 'text-green-600';
    if (numValue < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  // Get day cell styling
  const getDayCellClass = (day) => {
    let baseClass = 'relative p-2 border border-gray-200 cursor-pointer transition-all duration-200 min-h-[80px] ';
    
    // Current month vs adjacent months
    if (!day.isCurrentMonth) {
      baseClass += 'text-gray-400 bg-gray-50 ';
    } else {
      baseClass += 'bg-white ';
    }
    
    // Selection state
    if (day.isSelected) {
      baseClass += 'ring-2 ring-blue-500 bg-blue-50 ';
    }
    
    // Today indicator
    if (day.isToday) {
      baseClass += 'ring-2 ring-blue-400 ';
    }
    
    // Weekend styling
    if (day.isWeekend && day.isCurrentMonth) {
      baseClass += 'bg-gray-50 ';
    }
    
    // Profit/Loss/Pending coloring
    if (day.settledCount > 0) {
      if (day.profit > 0) {
        baseClass += 'bg-green-50 border-green-300 ';
      } else if (day.profit < 0) {
        baseClass += 'bg-red-50 border-red-300 ';
      } else {
        baseClass += 'bg-yellow-50 border-yellow-300 ';
      }
    } else if (day.pendingCount > 0) {
      baseClass += 'bg-blue-50 border-blue-300 ';
    }
    
    // Hover effect
    baseClass += 'hover:shadow-md ';
    
    return baseClass;
  };

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    setSelectedDate(null);
    setSelectedDayData(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    setSelectedDate(null);
    setSelectedDayData(null);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(formatDateString(today));
  };

  // Handle day click
  const handleDayClick = (day) => {
    if (day.isCurrentMonth && day.betCount > 0) {
      setSelectedDate(day.dateString);
    }
  };

  const calendarDays = generateCalendarGrid();
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">📅 Betting Calendar</h1>
        <button
          onClick={() => window.location.reload()}
          className="p-2 rounded-full hover:bg-gray-200"
          title="Refresh"
        >
          🔄
        </button>
      </div>

      {/* Calendar Navigation */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={goToPreviousMonth}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
            >
              ← Previous
            </button>
            <h2 className="text-xl font-semibold text-gray-800">
              {monthName}
            </h2>
            <button
              onClick={goToNextMonth}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
            >
              Next →
            </button>
          </div>
          <button
            onClick={goToToday}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Today
          </button>
        </div>

        {/* Month Summary */}
        {monthSummary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-sm text-gray-600">Total Profit</div>
              <div className={`text-lg font-bold ${getColorClass(monthSummary.total_profit)}`}>
                {formatMoney(monthSummary.total_profit)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">ROI</div>
              <div className={`text-lg font-bold ${getColorClass(monthSummary.roi)}`}>
                {formatPercent(monthSummary.roi)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Win Rate</div>
              <div className="text-lg font-bold text-blue-600">
                {formatPercent(monthSummary.win_rate)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Record</div>
              <div className="text-lg font-bold text-gray-700">
                {monthSummary.won_bets || 0}-{monthSummary.lost_bets || 0}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Total Bets</div>
              <div className="text-lg font-bold text-purple-600">
                {monthSummary.total_bets || 0}
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-6 text-xs">
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
          <div className="border-l border-gray-300 pl-4 ml-2 flex items-center gap-3">
            <span className="flex items-center gap-1">🏛️ <span>Pikkit</span></span>
            <span className="flex items-center gap-1">🌐 <span>OddsJam</span></span>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
            <div key={`header-${index}`} className="text-center text-sm font-medium text-gray-600 p-2">
              {day}
            </div>
          ))}
          
          {/* Calendar days */}
          {isLoading ? (
            // Loading skeleton
            Array.from({ length: 42 }).map((_, index) => (
              <div key={`loading-${index}`} className="min-h-[80px] bg-gray-100 border border-gray-200 rounded animate-pulse">
              </div>
            ))
          ) : (
            calendarDays.map((day, index) => (
              <div
                key={`day-${index}`}
                className={getDayCellClass(day)}
                onClick={() => handleDayClick(day)}
              >
                <div className="font-semibold text-sm mb-1">
                  {day.date}
                </div>
                
                {/* Show profit/loss for settled bets */}
                {day.settledCount > 0 && (
                  <div className={`text-xs font-medium ${getColorClass(day.profit)}`}>
                    {formatMoney(day.profit)}
                  </div>
                )}
                
                {/* Show pending info */}
                {day.pendingCount > 0 && (
                  <div className="text-xs text-blue-600">
                    {day.pendingCount} pending
                  </div>
                )}
                
                {/* Show bet count */}
                {day.betCount > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    {day.betCount} bet{day.betCount !== 1 ? 's' : ''}
                  </div>
                )}
                
                {/* Today indicator */}
                {day.isToday && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Selected Day Details */}
      {selectedDate && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            {new Date(selectedDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric'
            })}
          </h3>
          
          {isDayLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Loading day details...</span>
            </div>
          ) : selectedDayData ? (
            <div className="space-y-6">
              {/* Day Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-sm text-gray-600">Day Profit</div>
                  <div className={`text-lg font-bold ${getColorClass(selectedDayData.total_profit)}`}>
                    {formatMoney(selectedDayData.total_profit)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">ROI</div>
                  <div className={`text-lg font-bold ${getColorClass(selectedDayData.roi)}`}>
                    {formatPercent(selectedDayData.roi)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Win Rate</div>
                  <div className="text-lg font-bold text-blue-600">
                    {formatPercent(selectedDayData.win_rate)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Record</div>
                  <div className="text-lg font-bold text-gray-700">
                    {selectedDayData.won_bets || 0}-{selectedDayData.lost_bets || 0}
                    {(selectedDayData.push_bets || 0) > 0 && `-${selectedDayData.push_bets}`}
                  </div>
                </div>
              </div>

              {/* Bets List */}
              {selectedDayData.bets && selectedDayData.bets.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 p-2 text-left text-sm font-medium">Source</th>
                        <th className="border border-gray-200 p-2 text-left text-sm font-medium">Bet</th>
                        <th className="border border-gray-200 p-2 text-left text-sm font-medium">Sportsbook</th>
                        <th className="border border-gray-200 p-2 text-right text-sm font-medium">Odds</th>
                        <th className="border border-gray-200 p-2 text-right text-sm font-medium">Stake</th>
                        <th className="border border-gray-200 p-2 text-right text-sm font-medium">Profit</th>
                        <th className="border border-gray-200 p-2 text-center text-sm font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDayData.bets.map((bet, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="border border-gray-200 p-2 text-sm">
                            {bet.source === 'pikkit' ? '🏛️' : '🌐'}
                          </td>
                          <td className="border border-gray-200 p-2 text-sm max-w-xs">
                            <div className="truncate" title={bet.bet_info}>
                              {bet.bet_info || `${bet.event_name} - ${bet.bet_name}`}
                            </div>
                          </td>
                          <td className="border border-gray-200 p-2 text-sm">
                            {bet.sportsbook}
                          </td>
                          <td className="border border-gray-200 p-2 text-sm text-right">
                            {bet.odds && bet.odds !== 0 ? (bet.odds > 0 ? `+${bet.odds}` : bet.odds) : 'N/A'}
                          </td>
                          <td className="border border-gray-200 p-2 text-sm text-right">
                            {formatMoney(bet.stake)}
                          </td>
                          <td className={`border border-gray-200 p-2 text-sm text-right ${getColorClass(bet.bet_profit)}`}>
                            {formatMoney(bet.bet_profit)}
                          </td>
                          <td className="border border-gray-200 p-2 text-center">
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
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No bets found for this day
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              No betting activity on this day
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BettingCalendar;