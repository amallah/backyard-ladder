"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@supabase/supabase-js";
import { removePlayer, updatePlayerElo } from "@/app/actions";

type Player = {
  id: string;
  name: string;
  elo: number;
  status: string;
  is_active: boolean;
};

interface PlayerListProps {
  initialPlayers: Player[];
  sessionId: string;
}

function statusBadgeClass(status: string): string {
  if (status === "available") return "bg-green-100 text-green-800";
  if (status === "playing") return "bg-blue-100 text-blue-800";
  return "bg-gray-100 text-gray-800";
}

export function PlayerList({ initialPlayers, sessionId }: PlayerListProps) {
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const channel = client
      .channel(`players-${sessionId}`)
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
            setPlayers((prev) => [...prev, payload.new as Player]);
          } else if (payload.eventType === "UPDATE") {
            setPlayers((prev) =>
              prev.map((p) =>
                p.id === (payload.new as Player).id
                  ? (payload.new as Player)
                  : p
              )
            );
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

  const activePlayers = players.filter((p) => p.is_active);

  function handleRemove(playerId: string) {
    startTransition(async () => {
      await removePlayer(playerId);
    });
  }

  function handleEloClick(player: Player) {
    setEditingId(player.id);
    setEditValue(String(player.elo));
  }

  function handleEloSave(playerId: string) {
    const newElo = parseInt(editValue, 10);
    if (!isNaN(newElo)) {
      startTransition(async () => {
        await updatePlayerElo(playerId, newElo);
      });
    }
    setEditingId(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">
        Players ({activePlayers.length})
      </h2>
      {activePlayers.length === 0 ? (
        <p className="text-sm text-gray-400 italic">
          No players yet. Share the QR code to get started.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {activePlayers.map((player) => (
            <li
              key={player.id}
              className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-sm">{player.name}</span>
                {editingId === player.id ? (
                  <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleEloSave(player.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleEloSave(player.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="w-20 text-sm border rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => handleEloClick(player)}
                    className="text-sm text-gray-500 hover:text-gray-800 hover:underline"
                    title="Click to edit Elo"
                  >
                    {player.elo}
                  </button>
                )}
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadgeClass(player.status)}`}
                >
                  {player.status}
                </span>
              </div>
              <button
                onClick={() => handleRemove(player.id)}
                disabled={isPending}
                className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
