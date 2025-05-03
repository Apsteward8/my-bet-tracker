// pages/ConfirmPage.tsx
import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import LoadingSpinner from "../components/LoadingSpinner";

interface Bet {
  id: number;
  event_name: string;
  bet_name: string;
  sportsbook: string;
  bet_type: string;
  odds: number;
  stake: number;
  status: string;
  bet_profit: number;
}

export default function ConfirmPage() {
  const [bets, setBets] = useState<Bet[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [selectedSportsbook, setSelectedSportsbook] = useState<string>("All");
  const [sportsbookOptions, setSportsbookOptions] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  
  // Add sorting state
  const [sortColumn, setSortColumn] = useState<string>("id");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Fetch unconfirmed settled bets
  useEffect(() => {
    const fetchBets = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get("http://localhost:5007/api/bets/unconfirmed");
        const fetchedBets = response.data;
        
        if (Array.isArray(fetchedBets)) {
          setBets(fetchedBets);
          
          // Extract unique statuses and sportsbooks for filters
          const uniqueStatuses = Array.from(new Set(fetchedBets.map((bet: Bet) => bet.status)));
          const uniqueSportsbooks = Array.from(new Set(fetchedBets.map((bet: Bet) => bet.sportsbook)));
          
          setStatusOptions(uniqueStatuses as string[]);
          setSportsbookOptions(uniqueSportsbooks as string[]);
        } else {
          console.error("Unexpected response format:", fetchedBets);
          setError("Server returned an unexpected response format");
        }
        
        setIsLoading(false);
      } catch (err: any) {
        console.error("Error fetching unconfirmed bets:", err);
        
        // Extract more specific error message if available
        const errorMessage = err.response?.data?.error || 
                             "Failed to load unconfirmed bets. Please try again later.";
        
        setError(errorMessage);
        setIsLoading(false);
      }
    };

    fetchBets();
  }, []);

  // Handle bet confirmation
  const confirmBet = async (betId: number) => {
    try {
      await axios.put(
        `http://localhost:5007/api/bets/${betId}/confirm`,
        {}, // Empty object as the data payload
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      // Remove the confirmed bet from the list
      setBets(bets.filter(bet => bet.id !== betId));
    } catch (err: any) {
      console.error(`Error confirming bet ${betId}:`, err);
      
      // Extract more specific error message if available
      const errorMessage = err.response?.data?.error || 
                           "Failed to confirm bet. Please try again.";
      
      setError(errorMessage);
    }
  };

  // Add sort function
  const handleSort = (column: string) => {
    // If clicking the same column, toggle direction
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New column, default to descending
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  // Apply filters and sorting
  const sortedAndFilteredBets = () => {
    // First apply filters
    const filtered = bets.filter(bet => {
      const statusMatch = selectedStatus === "All" || bet.status === selectedStatus;
      const sportsbookMatch = selectedSportsbook === "All" || bet.sportsbook === selectedSportsbook;
      return statusMatch && sportsbookMatch;
    });
    
    // Then sort the filtered bets
    return [...filtered].sort((a, b) => {
      const valueA = a[sortColumn as keyof Bet];
      const valueB = b[sortColumn as keyof Bet];
      
      // Handle different types of values
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return sortDirection === "asc" ? valueA - valueB : valueB - valueA;
      } else {
        // Convert to string for string comparison
        const strA = String(valueA).toLowerCase();
        const strB = String(valueB).toLowerCase();
        return sortDirection === "asc" 
          ? strA.localeCompare(strB) 
          : strB.localeCompare(strA);
      }
    });
  };

  // Get the sorted and filtered bets
  const displayBets = sortedAndFilteredBets();

  if (isLoading) {
    return <LoadingSpinner size="large" message="Loading unconfirmed bets..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">✅ Confirm Settled Bets</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {displayBets.length} bets need confirmation
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

      {/* Display error message if any */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-medium mb-2">Error</h3>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reload Page
          </button>
        </div>
      )}

      {!error && bets.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">All Caught Up!</h2>
              <p className="text-gray-500 text-center max-w-md">
                No bets need confirmation at this time.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        !error && (
          <>
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Filters</CardTitle>
                <CardDescription>Filter bets by status or sportsbook</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Filter by Status
                    </label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded"
                    >
                      <option value="All">All Statuses</option>
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Filter by Sportsbook
                    </label>
                    <select
                      value={selectedSportsbook}
                      onChange={(e) => setSelectedSportsbook(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded"
                    >
                      <option value="All">All Sportsbooks</option>
                      {sportsbookOptions.map((sportsbook) => (
                        <option key={sportsbook} value={sportsbook}>
                          {sportsbook}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bets Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th 
                        onClick={() => handleSort("id")} 
                        className="cursor-pointer"
                      >
                        ID {sortColumn === "id" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th 
                        onClick={() => handleSort("event_name")} 
                        className="cursor-pointer"
                      >
                        Event {sortColumn === "event_name" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th 
                        onClick={() => handleSort("bet_name")} 
                        className="cursor-pointer"
                      >
                        Bet {sortColumn === "bet_name" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th 
                        onClick={() => handleSort("sportsbook")} 
                        className="cursor-pointer"
                      >
                        Sportsbook {sortColumn === "sportsbook" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th
                        onClick={() => handleSort("bet_type")} 
                        className="cursor-pointer"
                      >
                        Type {sortColumn === "bet_type" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th 
                        onClick={() => handleSort("odds")} 
                        className="cursor-pointer text-right"
                      >
                        Odds {sortColumn === "odds" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th 
                        onClick={() => handleSort("stake")} 
                        className="cursor-pointer text-right"
                      >
                        Stake {sortColumn === "stake" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th 
                        onClick={() => handleSort("status")} 
                        className="cursor-pointer"
                      >
                        Status {sortColumn === "status" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th 
                        onClick={() => handleSort("bet_profit")} 
                        className="cursor-pointer text-right"
                      >
                        Profit {sortColumn === "bet_profit" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayBets.length > 0 ? (
                      displayBets.map((bet) => (
                        <tr key={bet.id}>
                          <td>{bet.id}</td>
                          <td className="max-w-xs truncate" title={bet.event_name}>
                            {bet.event_name}
                          </td>
                          <td className="max-w-xs truncate" title={bet.bet_name}>
                            {bet.bet_name}
                          </td>
                          <td>{bet.sportsbook}</td>
                          <td>{bet.bet_type}</td>
                          <td className="text-right">{bet.odds > 0 ? `+${bet.odds}` : bet.odds}</td>
                          <td className="text-right">${bet.stake.toFixed(2)}</td>
                          <td>
                            <span className={`status-badge ${bet.status.toLowerCase()}`}>
                              {bet.status}
                            </span>
                          </td>
                          <td className={`text-right ${bet.bet_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${bet.bet_profit.toFixed(2)}
                          </td>
                          <td className="text-center">
                            <button
                              onClick={() => confirmBet(bet.id)}
                              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                            >
                              Confirm ✅
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10} className="p-4 text-center text-gray-500">
                          No bets match your filter criteria
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )
      )}
    </div>
  );
}