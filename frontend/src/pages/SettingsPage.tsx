// In your frontend/src/pages/SettingsPage.tsx
import { useState } from "react";
import CsvImport from "../components/CsvImport";
import PikkitImport from "../components/PikkitImport"; // Add this import
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">⚙️ Settings</h1>
      </div>
      
      {/* Add the data sources overview */}
      <Card>
        <CardHeader>
          <CardTitle>Data Sources</CardTitle>
          <CardDescription>
            Your betting data comes from two sources, each covering different sportsbooks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
              <h3 className="font-semibold text-blue-900 mb-2">🌐 OddsJam</h3>
              <p className="text-blue-800 text-sm mb-2">
                Tracks offshore and international sportsbooks
              </p>
              <div className="text-xs text-blue-700">
                <div>• Pinnacle</div>
                <div>• Bovada</div>
                <div>• BetOnline</div>
                <div>• Heritage Sports</div>
                <div>• And other offshore books</div>
              </div>
            </div>
            
            <div className="p-4 border border-green-200 rounded-lg bg-green-50">
              <h3 className="font-semibold text-green-900 mb-2">🏛️ Pikkit</h3>
              <p className="text-green-800 text-sm mb-2">
                Tracks regulated US sportsbooks and exchanges
              </p>
              <div className="text-xs text-green-700">
                <div>• FanDuel</div>
                <div>• DraftKings</div>
                <div>• BetMGM</div>
                <div>• Novig (Exchange)</div>
                <div>• ProphetX (Exchange)</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Update this section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CsvImport />
        <PikkitImport /> {/* Add this component */}
      </div>
    </div>
  );
}