import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/Tabs";
import LoadingSpinner from "../components/LoadingSpinner";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5007';

interface CombinedBet {
  id: string;
  original_id: number;
  bet_id?: string;
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
  sport?: string;
  league?: string;
  source: "oddsjam" | "pikkit";
  confirmed_settlement?: boolean;
}

interface CombinedStats {
  combined: {
    total_bets: number;
    winning_bets: number;
    losing_bets: number;
    pending_bets: number;
    win_rate: number;
    total_profit: number;
    total_stake: number;
    roi: number;
  };
  breakdown: {
    oddsjam: {
      total_bets: number;
      total_profit: number;
      total_stake: number;
      roi: number;
    };
    pikkit: {
      total_bets: number;
      total_profit: number;
      total_stake: number;
      roi: number;
    };
  };
}

interface SportsbookMapping {
  pikkit_tracked: string[];
  oddsjam_sportsbooks: string[];
  mapping_rules: {
    pikkit_priority: string[];
    oddsjam_priority: string;
  };
}

export default function CombinedBetHistoryPage() {
  const [bets, setBets] = useState<CombinedBet[]>([]);
  const [stats, setStats] = useState<CombinedStats | null>(null);
  const [mapping, setMapping] = useState<SportsbookMapping | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalBets, setTotalBets] = useState<number>(0);
  const [sortColumn, setSortColumn] = useState<string>("event_start_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterSportsbook, setFilterSportsbook] = useState<string>("all");
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Fetch combined data
  useEffect(() => {
    fetchCombinedData();
  }, [currentPage, pageSize, filterSportsbook]);

  // Fetch mapping once on mount
  useEffect(() => {
    fetchSportsbookMapping();
  }, []);

  const fetchCombinedData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: pageSize.toString(),
      });

      if (filterSportsbook !== "all") {
        params.append("sportsbook", filterSportsbook);
      }

      console.log(`Fetching combined bets: page=${currentPage}, per_page=${pageSize}, sportsbook=${filterSportsbook}`);

      const response = await fetch(`${API_URL}/api/combined-bets?${params}`);
      const data = await response.json();

      console.log("Combined bets response:", data);

      if (response.ok) {
        setBets(data.items || []);
        setTotalPages(data.pages || 1);
        setTotalBets(data.total || 0);
        setDebugInfo(data.debug_info);
        
        console.log(`Received ${data.items?.length || 0} bets for page ${currentPage}`);
        console.log("Debug info:", data.debug_info);
        
        // Log first few bets to see sources
        if (data.items && data.items.length > 0) {
          console.log("Sample bets:", data.items.slice(0, 3).map(bet => ({
            source: bet.source,
            sportsbook: bet.sportsbook,
            event: bet.event_name?.substring(0, 30)
          })));
        }
      } else {
        setError(data.error || "Failed to fetch combined bet data");
      }
    } catch (err) {
      setError("Failed to fetch combined bet data");
      console.error("Error fetching combined bets:", err);
    }

    // Fetch stats separately (don't let this block the main data)
    try {
      const statsResponse = await fetch(`${API_URL}/api/combined-stats`);
      const statsData = await statsResponse.json();

      if (statsResponse.ok) {
        setStats(statsData);
        console.log("Combined stats:", statsData);
      }
    } catch (err) {
      console.error("Error fetching combined stats:", err);
    }

    setIsLoading(false);
  };

  const fetchSportsbookMapping = async () => {
    try {
      const response = await fetch(`${API_URL}/api/sportsbook-mapping`);
      const data = await response.json();

      if (response.ok) {
        setMapping(data);
      }
    } catch (err) {
      console.error("Error fetching sportsbook mapping:", err);
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

  // Sorting
  const sortBets = (bets: CombinedBet[]): CombinedBet[] => {
    return [...bets].sort((a, b) => {
      if (sortColumn === "event_start_date") {
        const dateA = new Date(a.event_start_date).getTime();
        const dateB = new Date(b.event_start_date).getTime();
        return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
      } else if (sortColumn === "odds" || sortColumn === "clv" || sortColumn === "stake" || sortColumn === "bet_profit") {
        const valA = a[sortColumn] || 0;
        const valB = b[sortColumn] || 0;
        return sortDirection === "asc" ? valA - valB : valB - valA;
      } else {
        const valA = String(a[sortColumn] || "").toLowerCase();
        const valB = String(b[sortColumn] || "").toLowerCase();
        return sortDirection === "asc" 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }
    });
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  // Don't apply frontend filtering for source since backend handles all filtering
  // Frontend filtering is only for display purposes now
  const displayBets = filterSource === "all" 
    ? bets 
    : bets.filter(bet => bet.source === filterSource);

  if (isLoading) {
    return <LoadingSpinner size="large" message="Loading combined bet history..." />;
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
        <h1 className="text-2xl font-bold text-gray-800">📊 Combined Bet History</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {totalBets} total bets from both sources
          </span>
          {debugInfo && (
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
              OJ: {debugInfo.oddsjam_count} | PK: {debugInfo.pikkit_count}
            </span>
          )}
          <button
            onClick={() => {
              setCurrentPage(1);
              fetchCombinedData();
            }}
            className="p-2 rounded-full hover:bg-gray-200"
            title="Refresh data"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Data Source Information */}
      {mapping && (
        <Card>
          <CardHeader>
            <CardTitle>Data Source Mapping</CardTitle>
            <CardDescription>Which system tracks which sportsbooks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">🏛️ Pikkit Tracked ({mapping.pikkit_tracked.length})</h4>
                <div className="text-sm text-green-800 grid grid-cols-2 gap-1">
                  {mapping.pikkit_tracked.slice(0, 8).map(sb => (
                    <div key={sb}>• {sb}</div>
                  ))}
                  {mapping.pikkit_tracked.length > 8 && (
                    <div className="text-green-600">+{mapping.pikkit_tracked.length - 8} more...</div>
                  )}
                </div>
              </div>
              
              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">🌐 OddsJam Tracked ({mapping.oddsjam_sportsbooks.length})</h4>
                <div className="text-sm text-blue-800 grid grid-cols-2 gap-1">
                  {mapping.oddsjam_sportsbooks.slice(0, 8).map(sb => (
                    <div key={sb}>• {sb}</div>
                  ))}
                  {mapping.oddsjam_sportsbooks.length > 8 && (
                    <div className="text-blue-600">+{mapping.oddsjam_sportsbooks.length - 8} more...</div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Combined Statistics */}
      {stats && (
        <div>
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Overall Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-white">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Profit</p>
                    <p className={`text-2xl font-bold mt-1 ${getColorClass(stats.combined.total_profit)}`}>
                      {formatMoney(stats.combined.total_profit)}
                    </p>
                  </div>
                  <div className="text-xl">💰</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">ROI</p>
                    <p className={`text-2xl font-bold mt-1 ${getColorClass(stats.combined.roi)}`}>
                      {formatPercent(stats.combined.roi)}
                    </p>
                  </div>
                  <div className="text-xl">📈</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Win Rate</p>
                    <p className={`text-2xl font-bold mt-1 ${getColorClass(stats.combined.win_rate, 50)}`}>
                      {formatPercent(stats.combined.win_rate)}
                    </p>
                  </div>
                  <div className="text-xl">🎯</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Bets</p>
                    <p className="text-2xl font-bold mt-1 text-gray-700">
                      {stats.combined.total_bets}
                    </p>
                  </div>
                  <div className="text-xl">📊</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Source Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Performance by Data Source</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                  <h4 className="font-semibold text-blue-900 mb-3">🌐 OddsJam Performance</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Bets:</span>
                      <span className="font-medium">{stats.breakdown.oddsjam.total_bets}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Profit:</span>
                      <span className={`font-medium ${getColorClass(stats.breakdown.oddsjam.total_profit)}`}>
                        {formatMoney(stats.breakdown.oddsjam.total_profit)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">ROI:</span>
                      <span className={`font-medium ${getColorClass(stats.breakdown.oddsjam.roi)}`}>
                        {formatPercent(stats.breakdown.oddsjam.roi)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 border border-green-200 rounded-lg bg-green-50">
                  <h4 className="font-semibold text-green-900 mb-3">🏛️ Pikkit Performance</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-green-700">Bets:</span>
                      <span className="font-medium">{stats.breakdown.pikkit.total_bets}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Profit:</span>
                      <span className={`font-medium ${getColorClass(stats.breakdown.pikkit.total_profit)}`}>
                        {formatMoney(stats.breakdown.pikkit.total_profit)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">ROI:</span>
                      <span className={`font-medium ${getColorClass(stats.breakdown.pikkit.roi)}`}>
                        {formatPercent(stats.breakdown.pikkit.roi)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Source</label>
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              >
                <option value="all">All Sources</option>
                <option value="oddsjam">OddsJam Only</option>
                <option value="pikkit">Pikkit Only</option>
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
                {Array.from(new Set(bets.map(bet => bet.sportsbook))).sort().map(sb => (
                  <option key={sb} value={sb}>{sb}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bet Table */}
      <Card>
        <CardHeader>
          <CardTitle>Combined Bet History</CardTitle>
          <CardDescription>All bets from both OddsJam and Pikkit sources</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort("source")} className="cursor-pointer">
                    Source {sortColumn === "source" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th onClick={() => handleSort("event_name")} className="cursor-pointer">
                    Event {sortColumn === "event_name" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th onClick={() => handleSort("bet_name")} className="cursor-pointer">
                    Bet {sortColumn === "bet_name" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th onClick={() => handleSort("sportsbook")} className="cursor-pointer">
                    Sportsbook {sortColumn === "sportsbook" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th onClick={() => handleSort("odds")} className="cursor-pointer text-right">
                    Odds {sortColumn === "odds" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th onClick={() => handleSort("stake")} className="cursor-pointer text-right">
                    Stake {sortColumn === "stake" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th onClick={() => handleSort("bet_profit")} className="cursor-pointer text-right">
                    Profit {sortColumn === "bet_profit" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th onClick={() => handleSort("status")} className="cursor-pointer">
                    Status {sortColumn === "status" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th onClick={() => handleSort("event_start_date")} className="cursor-pointer text-right">
                    Date {sortColumn === "event_start_date" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortBets(displayBets)
                  .map((bet) => (
                    <tr key={bet.id}>
                      <td>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium 
                          ${bet.source === 'pikkit' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                          {bet.source === 'pikkit' ? '🏛️ Pikkit' : '🌐 OddsJam'}
                        </span>
                      </td>
                      <td className="max-w-xs truncate" title={bet.event_name}>
                        {bet.event_name}
                      </td>
                      <td className="max-w-xs truncate" title={bet.bet_name}>
                        {bet.bet_name}
                      </td>
                      <td>{bet.sportsbook}</td>
                      <td className="text-right">{bet.odds > 0 ? `+${bet.odds}` : bet.odds}</td>
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
                      <td className="text-right">
                        {bet.event_start_date ? new Date(bet.event_start_date).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                {displayBets.length === 0 && (
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
                  Page {currentPage} of {totalPages} | Showing {displayBets.length} of {totalBets} total bets
                </span>
                {debugInfo && (
                  <span className="ml-2 text-xs text-gray-500">
                    (OddsJam: {debugInfo.oddsjam_count}, Pikkit: {debugInfo.pikkit_count})
                  </span>
                )}
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
    </div>
  );
}