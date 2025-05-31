// frontend/src/pages/ConfirmPage.tsx (updated for unified table)
import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import LoadingSpinner from "../components/LoadingSpinner";
import EnhancedSyncButton from "../components/EnhancedSyncButton";
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5007';

// Updated interface for unified table structure
interface UnifiedBet {
  id: number;
  source: string;
  original_bet_id: string;
  sportsbook: string;
  bet_type: string;
  status: string;
  odds: number;
  clv?: number;
  stake: number;
  bet_profit: number;
  time_placed?: string;
  time_settled?: string;
  bet_info: string;  // This replaces event_name + bet_name
  sport?: string;
  league?: string;
  tags?: string;
  verified: boolean;
}

export default function ConfirmPage() {
  const [bets, setBets] = useState<UnifiedBet[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [selectedSportsbook, setSelectedSportsbook] = useState<string>("All");
  const [sportsbookOptions, setSportsbookOptions] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [sortColumn, setSortColumn] = useState<string>("id");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedBets, setSelectedBets] = useState<number[]>([]);

  // Fetch unverified settled bets from unified table
  const fetchBets = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Use the new unified endpoint for unverified bets
      const response = await axios.get(`${API_URL}/api/unified/unverified-bets`);
      const fetchedBets = response.data.items || [];
      
      if (Array.isArray(fetchedBets)) {
        setBets(fetchedBets);
        
        // Extract unique statuses and sportsbooks for filters
        const uniqueStatuses = Array.from(new Set(fetchedBets.map((bet: UnifiedBet) => bet.status)));
        const uniqueSportsbooks = Array.from(new Set(fetchedBets.map((bet: UnifiedBet) => bet.sportsbook)));
        
        setStatusOptions(uniqueStatuses as string[]);
        setSportsbookOptions(uniqueSportsbooks as string[]);
      } else {
        console.error("Unexpected response format:", fetchedBets);
        setError("Server returned an unexpected response format");
      }
      
      setIsLoading(false);
    } catch (err: any) {
      console.error("Error fetching unverified bets:", err);
      
      const errorMessage = err.response?.data?.error || 
                           "Failed to load unverified bets. Please try again later.";
      
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchBets();
  }, []);

  // Handle single bet verification
  const verifyBet = async (betId: number) => {
    try {
      await axios.put(
        `${API_URL}/api/unified/verify-bet/${betId}`,
        {},
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      // Remove the verified bet from the list
      setBets(bets.filter(bet => bet.id !== betId));
      // Remove from selected if it was selected
      setSelectedBets(selectedBets.filter(id => id !== betId));
    } catch (err: any) {
      console.error(`Error verifying bet ${betId}:`, err);
      
      const errorMessage = err.response?.data?.error || 
                           "Failed to verify bet. Please try again.";
      
      setError(errorMessage);
    }
  };

  // Handle bulk verification
  const verifySelectedBets = async () => {
    if (selectedBets.length === 0) return;

    try {
      await axios.put(
        `${API_URL}/api/unified/verify-multiple`,
        { bet_ids: selectedBets },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Remove verified bets from the list
      setBets(bets.filter(bet => !selectedBets.includes(bet.id)));
      setSelectedBets([]);
    } catch (err: any) {
      console.error("Error verifying multiple bets:", err);
      
      const errorMessage = err.response?.data?.error || 
                           "Failed to verify selected bets. Please try again.";
      
      setError(errorMessage);
    }
  };

  // Handle bet selection for bulk operations
  const toggleBetSelection = (betId: number) => {
    setSelectedBets(prev => 
      prev.includes(betId) 
        ? prev.filter(id => id !== betId)
        : [...prev, betId]
    );
  };

  // Select/deselect all visible bets
  const toggleAllSelection = () => {
    const visibleBetIds = sortedAndFilteredBets().map(bet => bet.id);
    if (selectedBets.length === visibleBetIds.length) {
      setSelectedBets([]);
    } else {
      setSelectedBets(visibleBetIds);
    }
  };

  // Handle sync completion
  const handleSyncComplete = () => {
    // Refresh the bets list after sync
    fetchBets();
  };

  // Add sort function
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  // Apply filters and sorting
  const sortedAndFilteredBets = () => {
    const filtered = bets.filter(bet => {
      const statusMatch = selectedStatus === "All" || bet.status === selectedStatus;
      const sportsbookMatch = selectedSportsbook === "All" || bet.sportsbook === selectedSportsbook;
      return statusMatch && sportsbookMatch;
    });
    
    return [...filtered].sort((a, b) => {
      const valueA = a[sortColumn as keyof UnifiedBet];
      const valueB = b[sortColumn as keyof UnifiedBet];
      
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return sortDirection === "asc" ? valueA - valueB : valueB - valueA;
      } else {
        const strA = String(valueA || '').toLowerCase();
        const strB = String(valueB || '').toLowerCase();
        return sortDirection === "asc" 
          ? strA.localeCompare(strB) 
          : strB.localeCompare(strA);
      }
    });
  };

  const displayBets = sortedAndFilteredBets();

  // Format money values
  const formatMoney = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Get color class based on value
  const getColorClass = (value: number): string => {
    if (value > 0) return "text-green-600";
    if (value < 0) return "text-red-600";
    return "text-yellow-500";
  };

  // Format odds display
  const formatOdds = (odds: number): string => {
    return odds > 0 ? `+${odds}` : odds.toString();
  };

  // Get source icon
  const getSourceIcon = (source: string): string => {
    return source === 'pikkit' ? '🏛️' : '🌐';
  };

  // Parse bet info to extract event and bet details (for backward compatibility)
  const parseBetInfo = (betInfo: string) => {
    // bet_info format: "Bet Description Market Description Event @ Opponent"
    // Try to split and extract meaningful parts
    const parts = betInfo.split(' ');
    if (parts.length > 3) {
      // Try to find @ symbol to split event
      const atIndex = betInfo.indexOf(' @ ');
      if (atIndex > -1) {
        const beforeAt = betInfo.substring(0, atIndex);
        const afterAt = betInfo.substring(atIndex + 3);
        return {
          event: `${beforeAt.split(' ').slice(-2).join(' ')} @ ${afterAt}`,
          bet: beforeAt.split(' ').slice(0, -2).join(' ') || betInfo
        };
      }
    }
    // Fallback: use the whole thing as bet, no separate event
    return {
      event: betInfo.length > 50 ? betInfo.substring(0, 50) + "..." : betInfo,
      bet: betInfo
    };
  };

  // Render a mobile bet card
  const renderMobileBetCard = (bet: UnifiedBet) => {
    const { event, bet: betDescription } = parseBetInfo(bet.bet_info);
    const isSelected = selectedBets.includes(bet.id);
    
    return (
      <div key={bet.id} className={`bg-white rounded-lg shadow p-4 mb-4 ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
        <div className="flex items-start justify-between mb-2">
          <div className="font-medium flex items-center gap-2">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleBetSelection(bet.id)}
              className="rounded"
            />
            <span className="text-xs">{getSourceIcon(bet.source)}</span>
            <span className="truncate">{event}</span>
          </div>
        </div>
        
        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Bet:</span>
            <span className="text-right text-xs">{betDescription.length > 30 ? betDescription.substring(0, 30) + "..." : betDescription}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Sportsbook:</span>
            <span>{bet.sportsbook}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Type:</span>
            <span>{bet.bet_type}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Odds:</span>
            <span>{formatOdds(bet.odds)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Stake:</span>
            <span>{formatMoney(bet.stake)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Profit:</span>
            <span className={getColorClass(bet.bet_profit)}>{formatMoney(bet.bet_profit)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Status:</span>
            <span className={`status-badge ${bet.status.toLowerCase()}`}>{bet.status}</span>
          </div>
        </div>
        
        <button
          onClick={() => verifyBet(bet.id)}
          className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-1"
        >
          <span>Verify</span> <span>✅</span>
        </button>
      </div>
    );
  };

  if (isLoading) {
    return <LoadingSpinner size="large" message="Loading unverified bets..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <h1 className="text-xl lg:text-2xl font-bold text-gray-800">✅ Verify Settled Bets</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs md:text-sm text-gray-500">
            {displayBets.length} bets need verification
          </span>
          
          {/* Enhanced Sync button */}
          <EnhancedSyncButton 
            onSyncComplete={handleSyncComplete}
            variant="button"
            size="medium"
            showLabel={true}
          />
          
          <button
            onClick={() => window.location.reload()}
            className="p-2 rounded-full hover:bg-gray-200"
            title="Refresh data"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Information about verification */}
      <Card>
        <CardHeader>
          <CardTitle>Smart Verification System</CardTitle>
          <CardDescription>
            Only showing OddsJam bets that require manual verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">🔍 Automatic Filtering</h4>
            <p className="text-blue-800 text-sm mb-3">
              Pikkit-tracked bets are automatically verified since they come directly from sportsbooks. Only OddsJam bets need manual verification to ensure settlement accuracy.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h5 className="font-medium text-blue-900 mb-1">🏛️ Auto-Verified (Pikkit)</h5>
                <div className="text-blue-700 text-xs">
                  BetMGM, Caesars, DraftKings, ESPN BET, FanDuel, Novig, ProphetX, etc.
                </div>
              </div>
              <div>
                <h5 className="font-medium text-blue-900 mb-1">📋 Requires Verification (OddsJam)</h5>
                <div className="text-blue-700 text-xs">
                  BetOnline, BookMaker, Bovada, Heritage Sports, etc.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Display error message if any */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-4">
          <h3 className="text-lg font-medium mb-2">Error</h3>
          <p className="text-sm md:text-base">{error}</p>
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
              <h2 className="text-xl font-semibold text-gray-700 mb-2">All Verified!</h2>
              <p className="text-gray-500 text-center max-w-md">
                No bets need verification at this time. All Pikkit bets are auto-verified, and all OddsJam bets have been manually verified!
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        !error && (
          <>
            {/* Bulk actions and filters */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Verification Actions</CardTitle>
                    <CardDescription>Select bets to verify individually or in bulk</CardDescription>
                  </div>
                  {selectedBets.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        {selectedBets.length} selected
                      </span>
                      <button
                        onClick={verifySelectedBets}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                      >
                        Verify {selectedBets.length} Bets ✅
                      </button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bulk Selection
                    </label>
                    <button
                      onClick={toggleAllSelection}
                      className="w-full p-2 border border-gray-300 rounded text-left hover:bg-gray-50"
                    >
                      {selectedBets.length === displayBets.length ? 'Deselect All' : 'Select All Visible'}
                    </button>
                  </div>
                  
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

            {/* Mobile view - Card layout */}
            <div className="md:hidden">
              {displayBets.length > 0 ? (
                displayBets.map(bet => renderMobileBetCard(bet))
              ) : (
                <div className="bg-white rounded-lg shadow p-4 text-center text-gray-500">
                  No bets match your filter criteria
                </div>
              )}
            </div>

            {/* Desktop view - Table */}
            <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedBets.length === displayBets.length && displayBets.length > 0}
                          onChange={toggleAllSelection}
                          className="rounded"
                        />
                      </th>
                      <th className="w-8">Src</th>
                      <th 
                        onClick={() => handleSort("id")} 
                        className="cursor-pointer"
                      >
                        ID {sortColumn === "id" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th 
                        onClick={() => handleSort("bet_info")} 
                        className="cursor-pointer"
                      >
                        Bet Details {sortColumn === "bet_info" && (sortDirection === "asc" ? "↑" : "↓")}
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
                      displayBets.map((bet) => {
                        const { event, bet: betDescription } = parseBetInfo(bet.bet_info);
                        const isSelected = selectedBets.includes(bet.id);
                        
                        return (
                          <tr key={bet.id} className={isSelected ? 'bg-blue-50' : ''}>
                            <td>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleBetSelection(bet.id)}
                                className="rounded"
                              />
                            </td>
                            <td>
                              <span className="text-xs" title={bet.source}>
                                {getSourceIcon(bet.source)}
                              </span>
                            </td>
                            <td>{bet.id}</td>
                            <td className="max-w-md">
                              <div className="truncate" title={bet.bet_info}>
                                <div className="font-medium text-sm">{event}</div>
                                <div className="text-xs text-gray-500">{betDescription}</div>
                              </div>
                            </td>
                            <td>{bet.sportsbook}</td>
                            <td>{bet.bet_type}</td>
                            <td className="text-right">{formatOdds(bet.odds)}</td>
                            <td className="text-right">{formatMoney(bet.stake)}</td>
                            <td>
                              <span className={`status-badge ${bet.status.toLowerCase()}`}>
                                {bet.status}
                              </span>
                            </td>
                            <td className={`text-right ${getColorClass(bet.bet_profit)}`}>
                              {formatMoney(bet.bet_profit)}
                            </td>
                            <td className="text-center">
                              <button
                                onClick={() => verifyBet(bet.id)}
                                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                              >
                                Verify ✅
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={11} className="p-4 text-center text-gray-500">
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