// components/MobileNavbar.tsx
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

const navItems = [
  { name: "Dashboard", path: "/", icon: "🏠" },
  { name: "Arbitrage", path: "/arbitrage", icon: "📊" },
  { name: "Confirm", path: "/confirm", icon: "✅" },
  { name: "EV Analysis", path: "/ev", icon: "📈" },
  { name: "Expected Profit", path: "/expected-profit", icon: "💰" },
  { name: "History", path: "/history", icon: "📋" },
  { name: "Exchange", path: "/exchange", icon: "🧮" },
  { name: "Settings", path: "/settings", icon: "⚙️" },
];

export default function MobileNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { pathname } = useLocation();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="block lg:hidden">
      {/* Top bar with logo and hamburger menu */}
      <div className="flex items-center justify-between bg-gray-900 text-white p-4">
        <div className="flex items-center gap-2">
          <span className="text-green-400 text-xl">⚡</span>
          <span className="font-bold">BetTracker</span>
        </div>
        <button 
          onClick={toggleMenu}
          className="text-white focus:outline-none"
          aria-label="Menu"
        >
          {isOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile menu (slide down) */}
      {isOpen && (
        <div className="bg-gray-900 text-white w-full absolute z-50 shadow-lg animate-slideDown">
          <div className="flex flex-col py-2">
            {navItems.map(({ name, path, icon }) => (
              <Link 
                key={path} 
                to={path} 
                className={`p-4 flex items-center gap-3 ${
                  pathname === path ? 'bg-gray-800' : 'hover:bg-gray-700'
                }`}
                onClick={() => setIsOpen(false)}
              >
                <span className="text-xl">{icon}</span>
                <span>{name}</span>
              </Link>
            ))}
          </div>
          
          {/* User info */}
          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-medium">
                JD
              </div>
              <div>
                <p className="font-medium">John Doe</p>
                <p className="text-xs text-gray-400">Premium Plan</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}