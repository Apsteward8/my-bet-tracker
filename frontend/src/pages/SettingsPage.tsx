import { useState } from "react";
import CsvImport from "../components/CsvImport";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">⚙️ Settings</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CsvImport />
        {/* Other settings components */}
      </div>
    </div>
  );
}