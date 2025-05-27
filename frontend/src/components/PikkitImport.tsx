// components/PikkitImport.tsx
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/Card";
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5007';

export default function PikkitImport() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage({ text: "Please select a file first", type: "error" });
      return;
    }

    setIsUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        `${API_URL}/api/pikkit/import`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const result = await response.json();
      
      if (response.ok) {
        setMessage({ text: "Pikkit import successful!", type: "success" });
      } else {
        setMessage({ 
          text: result.error || "Pikkit import failed. Please try again.", 
          type: "error" 
        });
      }
    } catch (error: any) {
      setMessage({ 
        text: "Pikkit import failed. Please try again.", 
        type: "error" 
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setMessage(null);

    try {
      const response = await fetch(
        `${API_URL}/api/pikkit/sync`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const result = await response.json();
      
      if (response.ok) {
        setMessage({ text: "Pikkit sync completed successfully!", type: "success" });
      } else {
        setMessage({ 
          text: result.error || "Pikkit sync failed. Please try again.", 
          type: "error" 
        });
      }
    } catch (error: any) {
      setMessage({ 
        text: "Pikkit sync failed. Please try again.", 
        type: "error" 
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Bets from Pikkit</CardTitle>
        <CardDescription>
          Upload your Pikkit export CSV file or sync from the default location.
          Pikkit tracks regulated US sportsbooks like FanDuel, DraftKings, and exchanges.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* File Upload Section */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Upload CSV File</h4>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="pikkit-csv-upload"
              />
              <label
                htmlFor="pikkit-csv-upload"
                className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium"
              >
                Click to select Pikkit CSV file
              </label>
              {file && (
                <div className="mt-2 text-sm text-gray-600">
                  Selected file: {file.name}
                </div>
              )}
            </div>

            <button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isUploading ? "Uploading..." : "Upload and Import"}
            </button>
          </div>

          {/* Sync Section */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Sync from Default Location</h4>
            <p className="text-sm text-gray-600 mb-3">
              Sync Pikkit data from the default file location (pikkit-export.csv)
            </p>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                  🔄 Sync Pikkit Data
                </>
              )}
            </button>
          </div>

          {/* Message Display */}
          {message && (
            <div
              className={`p-3 rounded-lg ${
                message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Info Section */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Supported Sportsbooks</h4>
            <div className="text-xs text-blue-800 grid grid-cols-2 gap-1">
              <div>• FanDuel</div>
              <div>• DraftKings</div>
              <div>• BetMGM</div>
              <div>• Caesars</div>
              <div>• Novig (Exchange)</div>
              <div>• ProphetX (Exchange)</div>
            </div>
            <p className="text-xs text-blue-700 mt-2">
              Pikkit automatically tracks bets from these regulated US sportsbooks and exchanges.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}