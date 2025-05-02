import { useEffect, useState } from "react";
import axios from "axios";

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

interface PaginatedResponse {
  current_page: number;
  items: Bet[];
  pages: number;
  total: number;
}

interface DashboardStats {
  totalBets: number;
  winningBets: number;
  totalProfit: number;
  avgCLV: number;
  roi: number;
}

export default function DashboardPage() {
  const [recentBets, setRecentBets] = useState<Bet[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalBets: 0,
    winningBets: 0,
    totalProfit: 0,
    avgCLV: 0,
    roi: 0,
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    
    // Fetch bets with pagination
    axios
      .get("http://localhost:5007/api/bets")
      .then((res) => {
        console.log("API response:", res.data); // Debug log
        
        // Handle paginated response
        if (res.data && typeof res.data === 'object' && 'items' in res.data) {
          const paginatedData = res.data as PaginatedResponse;
          
          // Set bets from items array
          setRecentBets(paginatedData.items);
          
          // Set pagination info
          setPagination({
            currentPage: paginatedData.current_page,
            totalPages: paginatedData.pages,
            totalItems: paginatedData.total
          });
          
          // Calculate dashboard stats from bet data
          if (paginatedData.items.length > 0) {
            const betsData = paginatedData.items;
            const totalBets = betsData.length;
            const winningBets = betsData.filter((bet: Bet) => bet.bet_profit > 0).length;
            const totalProfit = betsData.reduce((sum: number, bet: Bet) => sum + bet.bet_profit, 0);
            const totalStake = betsData.reduce((sum: number, bet: Bet) => sum + bet.stake, 0);
            const avgCLV = betsData.reduce((sum: number, bet: Bet) => sum + bet.clv, 0) / totalBets;
            
            setStats({
              totalBets: pagination.totalItems, // Use total count from pagination
              winningBets,
              totalProfit,
              avgCLV,
              roi: totalStake > 0 ? (totalProfit / totalStake) * 100 : 0,
            });
          }
        } else {
          // Fallback for non-paginated response
          const betsData = Array.isArray(res.data) ? res.data : [];
          setRecentBets(betsData);
          
          if (betsData.length > 0) {
            const totalBets = betsData.length;
            const winningBets = betsData.filter((bet: Bet) => bet.bet_profit > 0).length;
            const totalProfit = betsData.reduce((sum: number, bet: Bet) => sum + bet.bet_profit, 0);
            const totalStake = betsData.reduce((sum: number, bet: Bet) => sum + bet.stake, 0);
            const avgCLV = betsData.reduce((sum: number, bet: Bet) => sum + bet.clv, 0) / totalBets;
            
            setStats({
              totalBets,
              winningBets,
              totalProfit,
              avgCLV,
              roi: totalStake > 0 ? (totalProfit / totalStake) * 100 : 0,
            });
          }
        }
        
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching data:", err);
        setIsLoading(false);
      });
  }, []);

  // Function to load a specific page
  const loadPage = (page: number) => {
    setIsLoading(true);
    axios
      .get(`http://localhost:5007/api/bets?page=${page}`)
      .then((res) => {
        if (res.data && typeof res.data === 'object' && 'items' in res.data) {
          const paginatedData = res.data as PaginatedResponse;
          setRecentBets(paginatedData.items);
          setPagination({
            currentPage: paginatedData.current_page,
            totalPages: paginatedData.pages,
            totalItems: paginatedData.total
          });
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching page:", err);
        setIsLoading(false);
      });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Last updated: Just now</span>
          <button 
            onClick={() => window.location.reload()} 
            className="p-2 rounded-full hover:bg-gray-200"
            title="Refresh data"
          >
            🔄
          </button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-lg shadow">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dashboard data...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title="Total Profit/Loss" 
              value={`$${stats.totalProfit.toFixed(2)}`} 
              trend={stats.totalProfit > 0 ? "up" : "down"} 
              bgColor={stats.totalProfit > 0 ? "bg-green-50" : "bg-red-50"}
              icon="💰"
            />
            
            <StatCard 
              title="Win Rate" 
              value={`${((stats.winningBets / stats.totalBets) * 100 || 0).toFixed(1)}%`} 
              trend="neutral" 
              bgColor="bg-blue-50"
              icon="🎯"
            />
            
            <StatCard 
              title="ROI" 
              value={`${stats.roi.toFixed(2)}%`} 
              trend={stats.roi > 0 ? "up" : "down"} 
              bgColor={stats.roi > 0 ? "bg-green-50" : "bg-red-50"}
              icon="📈"
            />
            
            <StatCard 
              title="Average CLV" 
              value={`${stats.avgCLV.toFixed(2)}`} 
              trend={stats.avgCLV > 0 ? "up" : "down"} 
              bgColor={stats.avgCLV > 0 ? "bg-green-50" : "bg-red-50"}
              icon="⚖️"
            />
          </div>
          
          {/* Recent Bets Section */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">Recent Bets</h2>
              <Link to="/history" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                View All →
              </Link>
            </div>
            
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
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
                  {Array.isArray(recentBets) && recentBets.length > 0 ? (
                    recentBets.slice(0, 5).map((bet) => (
                      <tr key={bet.id}>
                        <td className="max-w-xs truncate" title={bet.event_name}>
                          {bet.event_name}
                        </td>
                        <td>{bet.bet_name}</td>
                        <td>{bet.sportsbook}</td>
                        <td className="text-right">{formatOdds(bet.odds)}</td>
                        <td className="text-right">${bet.stake.toFixed(2)}</td>
                        <td className="text-right">
                          <span className={bet.bet_profit > 0 ? "text-green-600" : "text-red-600"}>
                            ${bet.bet_profit.toFixed(2)}
                          </span>
                        </td>
                        <td className="text-center">
                          <StatusBadge status={bet.status} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-gray-500">
                        No bets found. Add some bets to see them here.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Showing page {pagination.currentPage} of {pagination.totalPages}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => loadPage(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                    className={`px-3 py-1 rounded text-sm ${
                      pagination.currentPage === 1
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => loadPage(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className={`px-3 py-1 rounded text-sm ${
                      pagination.currentPage === pagination.totalPages
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  trend: "up" | "down" | "neutral";
  bgColor?: string;
  icon?: string;
}

function StatCard({ title, value, trend, bgColor = "bg-white", icon }: StatCardProps) {
  return (
    <div className={`stat-card ${bgColor}`}>
      <div className="flex justify-between items-start">
        <div>
          <div className="text-gray-500 text-sm">{title}</div>
          <div className="text-2xl font-bold mt-1 text-gray-800">{value}</div>
        </div>
        {icon && <div className="text-xl">{icon}</div>}
      </div>
      <div className={`text-sm mt-2 flex items-center ${
        trend === "up" ? "text-green-600" : 
        trend === "down" ? "text-red-600" : 
        "text-gray-500"
      }`}>
        {trend === "up" && <span>↑ Increasing</span>}
        {trend === "down" && <span>↓ Decreasing</span>}
        {trend === "neutral" && <span>− Stable</span>}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusLower = status.toLowerCase();
  const statusClasses = 
    statusLower === "won" ? "status-badge won" :
    statusLower === "lost" ? "status-badge lost" :
    statusLower === "pending" ? "status-badge pending" :
    "status-badge";
  
  return (
    <span className={statusClasses}>
      {status}
    </span>
  );
}

// Helper function to format odds in American format
function formatOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : odds.toString();
}

// Add the Link type since we're using it in the component
import { Link } from "react-router-dom";