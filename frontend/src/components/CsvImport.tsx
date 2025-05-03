// components/CsvImport.tsx
import { useState } from "react";
import axios from "axios";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/Card";

export default function CsvImport() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
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
      const response = await axios.post("http://localhost:5007/api/bets/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setMessage({ text: "Import successful!", type: "success" });
    } catch (error: any) {
      setMessage({ 
        text: error.response?.data?.error || "Import failed. Please try again.", 
        type: "error" 
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Bets from CSV</CardTitle>
        <CardDescription>Upload your OddsJam bet tracker CSV file</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium"
            >
              Click to select CSV file
            </label>
            {file && (
              <div className="mt-2 text-sm text-gray-600">
                Selected file: {file.name}
              </div>
            )}
          </div>

          {message && (
            <div
              className={`p-3 rounded-lg ${
                message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isUploading ? "Uploading..." : "Upload and Import"}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}