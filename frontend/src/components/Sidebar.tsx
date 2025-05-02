import { Link, useLocation } from "react-router-dom";

const navItems = [
  { name: "Dashboard", path: "/", icon: "🏠" },
  { name: "Arbitrage", path: "/arbitrage", icon: "📊" },
  { name: "Confirm", path: "/confirm", icon: "✅" },
  { name: "EV Analysis", path: "/ev", icon: "📈" },
  { name: "History", path: "/history", icon: "📋" },
  { name: "Settings", path: "/settings", icon: "⚙️" },
];

export default function Sidebar() {
  const { pathname } = useLocation();

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-full">
      {/* Logo and App Name */}
      <div className="p-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="text-green-400">⚡</span> BetTracker
        </h1>
        <p className="text-gray-400 text-sm mt-1">Sports Betting Dashboard</p>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 px-4 py-2 space-y-1">
        {navItems.map(({ name, path, icon }) => (
          <Link key={path} to={path} className={`sidebar-link ${pathname === path ? 'active' : ''}`}>
            <span className="text-xl">{icon}</span>
            <span>{name}</span>
          </Link>
        ))}
      </nav>
      
      {/* User Section */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-sm font-medium">
            JD
          </div>
          <div>
            <p className="font-medium">John Doe</p>
            <p className="text-xs text-gray-400">Premium Plan</p>
          </div>
        </div>
      </div>
    </div>
  );
}