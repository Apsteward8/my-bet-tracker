// src/App.tsx (modified for responsive design)
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import MobileNavbar from "./components/MobileNavbar";
import DashboardPage from "./pages/DashboardPage";
import ArbitragePage from "./pages/ArbitragePage";
import ConfirmPage from "./pages/ConfirmPage";
import EVAnalysisPage from "./pages/EVAnalysisPage";
import ExpectedProfitPage from "./pages/ExpectedProfitPage";
import BetHistoryPage from "./pages/BetHistoryPage";
import CombinedBetHistoryPage from "./pages/CombinedBetHistoryPage";
import CalculatorsPage from "./pages/CalculatorsPage";
import ExchangeCalculator from "./pages/ExchangeCalculator";
import SettingsPage from "./pages/SettingsPage";
import CalendarPage from "./pages/CalendarPage";

function App() {
  return (
    <Router>
      <div className="flex h-screen w-full overflow-hidden">
        {/* Desktop sidebar - hidden on mobile */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        
        {/* Main content area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Mobile navbar - hidden on desktop */}
          <MobileNavbar />
          
          {/* Main content */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
            <div className="container mx-auto px-4 lg:px-6 py-4 lg:py-8">
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/arbitrage" element={<ArbitragePage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/confirm" element={<ConfirmPage />} />
                <Route path="/ev" element={<EVAnalysisPage />} />
                <Route path="/expected-profit" element={<ExpectedProfitPage />} />
                <Route path="/history" element={<BetHistoryPage />} />
                <Route path="/combined-history" element={<CombinedBetHistoryPage />} />
                <Route path="/exchange" element={<ExchangeCalculator />} />
                <Route path="/calculator" element={<CalculatorsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;