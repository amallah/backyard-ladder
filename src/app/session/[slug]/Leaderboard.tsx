"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Player = {
  id: string;
  name: string;
  elo: number;
  status: string;
  is_active: boolean;
};

interface LeaderboardProps {
  initialPlayers: Player[];
  sessionId: string;
  sessionEnded: boolean;
}

function statusBadgeClass(status: string): string {
  if (status === "available") return "bg-green-100 text-green-800";
  if (status === "playing") return "bg-blue-100 text-blue-800";
  return "bg-gray-100 text-gray-800";
}

export function Leaderboard({ initialPlayers, sessionId, sessionEnded }: LeaderboardProps) {
  const [players, setPlayers] = useState<Player[]>(initialPlayers);

  useEffect(() => {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const channel = client
      .channel(`leaderboard-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newPlayer = payload.new as Player;
            if (newPlayer.is_active) {
              setPlayers((prev) =>
                [...prev, newPlayer].sort((a, b) => b.elo - a.elo)
              );
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Player;
            setPlayers((prev) => {
              const next = updated.is_active
                ? prev.map((p) => (p.id === updated.id ? updated : p))
                : prev.filter((p) => p.id !== updated.id);
              return next.sort((a, b) => b.elo - a.elo);
            });
          } else if (payload.eventType === "DELETE") {
            setPlayers((prev) =>
              prev.filter((p) => p.id !== (payload.old as { id: string }).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [sessionId]);

  return (
    <div className="flex flex-col gap-4">
      {sessionEnded && (
        <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 text-sm font-medium rounded-lg px-4 py-3 text-center">
          Session Ended — Final Standings
        </div>
      )}

      {players.length === 0 ? (
        <p className="text-sm text-gray-400 italic text-center">
          No players yet.
        </p>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-2 font-semibold text-gray-500 w-10">#</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-500">Player</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-500">Elo</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, index) => (
                <tr key={player.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400 font-medium">{index + 1}</td>
                  <td className="px-4 py-3 font-medium">{player.name}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">{player.elo}</td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadgeClass(player.status)}`}
                    >
                      {player.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
