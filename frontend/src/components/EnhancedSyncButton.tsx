// frontend/src/components/EnhancedSyncButton.tsx - Updated for Unified System
import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5007';

interface UnifiedSyncResult {
  overall_success: boolean;
  message: string;
  details: {
    unified_import: {
      name: string;
      success: boolean;
      stdout: string;
      stderr: string;
      returncode: number;
    };
  };
  summary: {
    import_success: boolean;
    sources_processed: string[];
    table: string;
  };
}

interface EnhancedSyncButtonProps {
  onSyncComplete?: () => void;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'icon' | 'button';
  className?: string;
}

export default function EnhancedSyncButton({ 
  onSyncComplete, 
  showLabel = false, 
  size = 'medium',
  variant = 'icon',
  className = ""
}: EnhancedSyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{text: string, type: "success" | "error" | "warning"} | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<UnifiedSyncResult | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    setShowDetails(false);
    
    try {
      const response = await fetch(`${API_URL}/api/unified/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result: UnifiedSyncResult = await response.json();
      setLastSyncResult(result);
      
      if (response.status === 200) {
        // Successful sync
        setSyncMessage({
          text: "✅ Unified sync completed successfully!",
          type: "success"
        });
      } else if (response.status === 408) {
        // Timeout
        setSyncMessage({
          text: "⏰ Sync timed out - this may happen with large datasets",
          type: "warning"
        });
      } else {
        // Error
        setSyncMessage({
          text: "❌ Sync failed. Check details for more info.",
          type: "error"
        });
      }
      
      // Call completion callback if provided
      if (onSyncComplete) {
        // Small delay to let user see the success message
        setTimeout(() => {
          onSyncComplete();
        }, 1500);
      }
      
    } catch (err: any) {
      console.error("Error during unified sync:", err);
      setSyncMessage({
        text: "❌ Network error during sync. Please try again.",
        type: "error"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return variant === 'button' ? 'px-2 py-1 text-sm' : 'p-1';
      case 'large':
        return variant === 'button' ? 'px-6 py-3 text-lg' : 'p-3';
      default:
        return variant === 'button' ? 'px-4 py-2' : 'p-2';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small': return 'text-sm';
      case 'large': return 'text-xl';
      default: return 'text-base';
    }
  };

  const dismissMessage = () => {
    setSyncMessage(null);
    setShowDetails(false);
  };

  if (variant === 'button') {
    return (
      <div className="relative">
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className={`${getSizeClasses()} rounded text-white flex items-center gap-2 ${
            isSyncing ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
          } ${className}`}
          title="Sync unified bet data from both OddsJam and Pikkit sources"
        >
          {isSyncing ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Syncing...
            </>
          ) : (
            <>
              🔄 
              {showLabel && "Sync Unified Data"}
            </>
          )}
        </button>

        {/* Success/Error Message */}
        {syncMessage && (
          <div className={`absolute top-full left-0 mt-2 p-3 rounded-lg shadow-lg z-50 min-w-64 ${
            syncMessage.type === "success" ? "bg-green-50 border-green-200 text-green-800" : 
            syncMessage.type === "warning" ? "bg-yellow-50 border-yellow-200 text-yellow-800" :
            "bg-red-50 border-red-200 text-red-800"
          } border`}>
            <div className="flex justify-between items-start">
              <p className="text-sm">{syncMessage.text}</p>
              <button 
                onClick={dismissMessage}
                className="ml-2 text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            
            {lastSyncResult && (
              <div className="mt-2">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-xs underline hover:no-underline"
                >
                  {showDetails ? "Hide" : "Show"} Details
                </button>
                
                {showDetails && (
                  <div className="mt-2 text-xs space-y-1">
                    <div className={`p-2 rounded ${lastSyncResult.summary.import_success ? 'bg-green-100' : 'bg-red-100'}`}>
                      <strong>📊 Unified Import:</strong> {lastSyncResult.summary.import_success ? 'Success' : 'Failed'}
                      <div className="text-xs mt-1">
                        Sources: {lastSyncResult.summary.sources_processed.join(', ')}
                      </div>
                      <div className="text-xs">
                        Table: {lastSyncResult.summary.table}
                      </div>
                      {lastSyncResult.details.unified_import.stderr && (
                        <div className="text-red-600 mt-1 font-mono text-xs">
                          {lastSyncResult.details.unified_import.stderr.slice(0, 200)}
                          {lastSyncResult.details.unified_import.stderr.length > 200 ? '...' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Icon variant (default)
  return (
    <div className="relative">
      <button
        onClick={handleSync}
        disabled={isSyncing}
        className={`${getSizeClasses()} rounded-full hover:bg-gray-200 transition-colors ${className} ${
          isSyncing ? "cursor-not-allowed opacity-50" : ""
        }`}
        title="Sync unified bet data from both OddsJam and Pikkit sources"
      >
        {isSyncing ? (
          <svg className={`animate-spin ${getIconSize()}`} viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <span className={getIconSize()}>🔄</span>
        )}
      </button>

      {/* Success/Error Message for Icon */}
      {syncMessage && (
        <div className={`absolute top-full right-0 mt-2 p-3 rounded-lg shadow-lg z-50 min-w-64 ${
          syncMessage.type === "success" ? "bg-green-50 border-green-200 text-green-800" : 
          syncMessage.type === "warning" ? "bg-yellow-50 border-yellow-200 text-yellow-800" :
          "bg-red-50 border-red-200 text-red-800"
        } border`}>
          <div className="flex justify-between items-start">
            <p className="text-sm">{syncMessage.text}</p>
            <button 
              onClick={dismissMessage}
              className="ml-2 text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
          
          {lastSyncResult && (
            <div className="mt-2">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs underline hover:no-underline"
              >
                {showDetails ? "Hide" : "Show"} Details
              </button>
              
              {showDetails && (
                <div className="mt-2 text-xs space-y-1">
                  <div className={`p-2 rounded ${lastSyncResult.summary.import_success ? 'bg-green-100' : 'bg-red-100'}`}>
                    <strong>📊 Unified Import:</strong> {lastSyncResult.summary.import_success ? 'Success' : 'Failed'}
                    <div className="text-xs mt-1">
                      Sources: {lastSyncResult.summary.sources_processed.join(', ')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}