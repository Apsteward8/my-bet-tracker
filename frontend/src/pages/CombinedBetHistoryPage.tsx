// frontend/src/pages/CombinedBetHistoryPage.tsx
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import LoadingSpinner from "../components/LoadingSpinner";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5007';

interface UnifiedBet {
  // Core identification
  source: "oddsjam" | "pikkit";
  original_id: number;
  bet_id?: string;
  
  // Unified fields (consistent across both sources)
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
  
  // Datetime fields
  time_placed?: string;
  time_settled?: string;
  event_start_date?: string;
  
  // Unified bet description
  bet_info: string;
  
  // Parsed components (available for analysis but not displayed in main table)
  event_name: string;
  bet_name: string;
  market_name: string;
  
  // Source-specific optional fields
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
    pikkit: {
      bet_count: number;
      sportsbooks_tracked: number;
    };
    oddsjam: {
      bet_count: number;
      sportsbooks_tracked: number;
    };
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

export default function CombinedBetHistoryPage() {
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

  // Fetch unified data
  useEffect(() => {
    fetchUnifiedData();
  }, [currentPage, pageSize, filterSportsbook, filterStatus, filterSource]);

  // Fetch stats once on mount
  useEffect(() => {
    fetchUnifiedStats();
  }, []);

  const fetchUnifiedData = async () => {
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
      
      if (filterStatus !== "all") {
        params.append("status", filterStatus);
      }
      
      if (filterSource !== "all") {
        params.append("source", filterSource);
      }

      console.log(`Fetching unified bets: page=${currentPage}, filters=${Object.fromEntries(params)}`);

      const response = await fetch(`${API_URL}/api/unified-bets?${params}`);
      const data = await response.json();

      console.log("Unified bets response:", data);

      if (response.ok) {
        setBets(data.items || []);
        setTotalPages(data.pages || 1);
        setTotalBets(data.total || 0);
        
        console.log(`Received ${data.items?.length || 0} unified bets for page ${currentPage}`);
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
        console.log("Unified stats:", data);
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
              fetchUnifiedData();
            }}
            className="p-2 rounded-full hover:bg-gray-200"
            title="Refresh data"
          >
            🔄
          </button>
        </div>
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
                <div className="mt-3 text-xs text-green-600">
                  <strong>Configured for:</strong> BetMGM, Caesars, DraftKings, ESPN BET, Fanatics, FanDuel, Novig, ProphetX, Rebet, Thrillzz, etc.
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
                <div className="mt-3 text-xs text-blue-600">
                  <strong>Configured for:</strong> BetNow, BetOnline, BetUS, BookMaker, Bovada, Everygame, MyBookie, Sportzino, Xbet
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

          {/* Sportsbook Performance */}
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
                  fetchUnifiedData();
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

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