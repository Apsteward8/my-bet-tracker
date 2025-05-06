import { useEffect, useState } from "react";
import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5007';

interface Bet {
  id: number;
  event_name: string;
  bet_name: string;
  sportsbook: string;
  bet_type: string;
  odds: number;
  clv: number;
  stake: number;
  status: string;
  bet_profit: number;
  event_start_date: string;
}

export default function BetsPage() {
  const [bets, setBets] = useState<Bet[]>([]);

  useEffect(() => {
    axios.get(`${API_URL}/api/bets`)
      .then((res) => setBets(res.data))
      .catch((err) => console.error("Error fetching bets:", err));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Recent Bets</h1>
      <table className="w-full table-auto border-collapse border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Event</th>
            <th className="border p-2">Bet</th>
            <th className="border p-2">Sportsbook</th>
            <th className="border p-2">Odds</th>
            <th className="border p-2">Stake</th>
            <th className="border p-2">Profit</th>
            <th className="border p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {bets.map((bet) => (
            <tr key={bet.id}>
              <td className="border p-2">{bet.event_name}</td>
              <td className="border p-2">{bet.bet_name}</td>
              <td className="border p-2">{bet.sportsbook}</td>
              <td className="border p-2">{bet.odds}</td>
              <td className="border p-2">${bet.stake.toFixed(2)}</td>
              <td className="border p-2">${bet.bet_profit.toFixed(2)}</td>
              <td className="border p-2">{bet.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
