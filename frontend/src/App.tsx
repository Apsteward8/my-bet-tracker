import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import DashboardPage from "./pages/DashboardPage";
import ArbitragePage from "./pages/ArbitragePage";
import ConfirmPage from "./pages/ConfirmPage";
import EVAnalysisPage from "./pages/EVAnalysisPage";
import BetHistoryPage from "./pages/BetHistoryPage";
import SettingsPage from "./pages/SettingsPage";

function App() {
  return (
    <Router>
      <div className="flex h-screen w-full overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
          <div className="container mx-auto px-6 py-8">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/arbitrage" element={<ArbitragePage />} />
              <Route path="/confirm" element={<ConfirmPage />} />
              <Route path="/ev" element={<EVAnalysisPage />} />
              <Route path="/history" element={<BetHistoryPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;