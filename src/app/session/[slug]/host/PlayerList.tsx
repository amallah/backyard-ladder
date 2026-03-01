"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@supabase/supabase-js";
import { removePlayer, updatePlayerElo, acceptMatch, submitScore } from "@/app/actions";

type Player = {
  id: string;
  name: string;
  elo: number;
  status: string;
  is_active: boolean;
};

type Match = {
  id: string;
  player_a1: string;
  player_a2: string;
  player_b1: string;
  player_b2: string;
  score_a: number | null;
  score_b: number | null;
};

type MatchSuggestion = {
  teamA: [Player, Player];
  teamB: [Player, Player];
  winPctA: number;
  winPctB: number;
  delta: number;
};

interface PlayerListProps {
  initialPlayers: Player[];
  initialMatches: Match[];
  sessionId: string;
}

function statusBadgeClass(status: string): string {
  if (status === "available") return "bg-green-100 text-green-800";
  if (status === "playing") return "bg-blue-100 text-blue-800";
  return "bg-gray-100 text-gray-800";
}

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  const withFirst = combinations(rest, k - 1).map((c) => [first, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

function generateAllSuggestions(available: Player[]): MatchSuggestion[] {
  const combos = combinations(available, 4);
  const results: MatchSuggestion[] = [];

  for (const [p0, p1, p2, p3] of combos) {
    const splits: [[Player, Player], [Player, Player]][] = [
      [[p0, p1], [p2, p3]],
      [[p0, p2], [p1, p3]],
      [[p0, p3], [p1, p2]],
    ];

    for (const [teamA, teamB] of splits) {
      const rA = (teamA[0].elo + teamA[1].elo) / 2;
      const rB = (teamB[0].elo + teamB[1].elo) / 2;
      const winPctA = 1 / (1 + Math.pow(10, (rB - rA) / 400));
      const winPctB = 1 - winPctA;
      const delta = Math.abs(winPctA - winPctB);
      results.push({ teamA, teamB, winPctA, winPctB, delta });
    }
  }

  results.sort((a, b) => a.delta - b.delta);
  return results;
}

export function PlayerList({ initialPlayers, initialMatches, sessionId }: PlayerListProps) {
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isPending, startTransition] = useTransition();

  const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [isAccepting, startAcceptTransition] = useTransition();

  const [scoreInputs, setScoreInputs] = useState<Record<string, { a: string; b: string }>>({});
  const [submittingMatchId, setSubmittingMatchId] = useState<string | null>(null);

  useEffect(() => {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const playerChannel = client
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
            // Clear suggestion when player statuses change
            setSuggestions([]);
          } else if (payload.eventType === "DELETE") {
            setPlayers((prev) =>
              prev.filter((p) => p.id !== (payload.old as { id: string }).id)
            );
            setSuggestions([]);
          }
        }
      )
      .subscribe();

    const matchChannel = client
      .channel(`matches-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newMatch = payload.new as Match;
            if (newMatch.score_a === null) {
              setMatches((prev) => [...prev, newMatch]);
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Match;
            if (updated.score_a !== null) {
              // Match scored — remove from active list
              setMatches((prev) => prev.filter((m) => m.id !== updated.id));
            }
          }
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(playerChannel);
      client.removeChannel(matchChannel);
    };
  }, [sessionId]);

  const activePlayers = players.filter((p) => p.is_active);
  const availablePlayers = activePlayers.filter((p) => p.status === "available");
  const playerMap = new Map(players.map((p) => [p.id, p]));

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

  function handleSuggestMatch() {
    const all = generateAllSuggestions(availablePlayers);
    setSuggestions(all);
    setSuggestionIndex(0);
  }

  function handleReshuffle() {
    setSuggestionIndex((prev) => (prev + 1) % suggestions.length);
  }

  function handleAccept() {
    const s = suggestions[suggestionIndex];
    startAcceptTransition(async () => {
      await acceptMatch(
        sessionId,
        s.teamA[0].id,
        s.teamA[1].id,
        s.teamB[0].id,
        s.teamB[1].id
      );
      setSuggestions([]);
    });
  }

  function getScoreInput(matchId: string) {
    return scoreInputs[matchId] ?? { a: "", b: "" };
  }

  function setScore(matchId: string, team: "a" | "b", value: string) {
    setScoreInputs((prev) => ({
      ...prev,
      [matchId]: { ...getScoreInput(matchId), [team]: value },
    }));
  }

  async function handleSubmitScore(matchId: string) {
    const { a, b } = getScoreInput(matchId);
    const scoreA = parseInt(a, 10);
    const scoreB = parseInt(b, 10);
    if (isNaN(scoreA) || isNaN(scoreB) || scoreA < 0 || scoreB < 0) return;

    setSubmittingMatchId(matchId);
    try {
      await submitScore(matchId, scoreA, scoreB);
    } catch (e) {
      console.error("Failed to submit score:", e);
    } finally {
      setSubmittingMatchId(null);
    }
  }

  const currentSuggestion = suggestions[suggestionIndex] ?? null;

  return (
    <div className="flex flex-col gap-4">
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

      {/* Active Matches Section */}
      {matches.length > 0 && (
        <div className="border-t pt-4 flex flex-col gap-3">
          <h2 className="text-base font-semibold">Active Matches</h2>
          {matches.map((match) => {
            const pa1 = playerMap.get(match.player_a1);
            const pa2 = playerMap.get(match.player_a2);
            const pb1 = playerMap.get(match.player_b1);
            const pb2 = playerMap.get(match.player_b2);
            const { a: scoreA, b: scoreB } = getScoreInput(match.id);
            const isSubmitting = submittingMatchId === match.id;
            const canSubmit =
              scoreA !== "" &&
              scoreB !== "" &&
              !isNaN(parseInt(scoreA, 10)) &&
              !isNaN(parseInt(scoreB, 10)) &&
              parseInt(scoreA, 10) >= 0 &&
              parseInt(scoreB, 10) >= 0;

            return (
              <div
                key={match.id}
                className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex flex-col gap-3"
              >
                <div className="flex items-stretch gap-2">
                  <div className="flex-1 bg-white rounded-lg border p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">Team A</p>
                    <p className="text-sm font-medium">{pa1?.name ?? "?"}</p>
                    <p className="text-sm font-medium">{pa2?.name ?? "?"}</p>
                    <input
                      type="number"
                      min={0}
                      value={scoreA}
                      onChange={(e) => setScore(match.id, "a", e.target.value)}
                      placeholder="Score"
                      className="mt-2 w-full text-center text-sm border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-400"
                    />
                  </div>

                  <div className="flex items-center text-gray-400 font-bold text-sm">
                    vs
                  </div>

                  <div className="flex-1 bg-white rounded-lg border p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">Team B</p>
                    <p className="text-sm font-medium">{pb1?.name ?? "?"}</p>
                    <p className="text-sm font-medium">{pb2?.name ?? "?"}</p>
                    <input
                      type="number"
                      min={0}
                      value={scoreB}
                      onChange={(e) => setScore(match.id, "b", e.target.value)}
                      placeholder="Score"
                      className="mt-2 w-full text-center text-sm border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-400"
                    />
                  </div>
                </div>

                <button
                  onClick={() => handleSubmitScore(match.id)}
                  disabled={!canSubmit || isSubmitting}
                  className="w-full py-2 px-4 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Submitting..." : "Submit Score"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Match Suggestion Section */}
      <div className="border-t pt-4 flex flex-col gap-3">
        <button
          onClick={handleSuggestMatch}
          disabled={availablePlayers.length < 4}
          className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {availablePlayers.length < 4
            ? `Suggest Match (need ${4 - availablePlayers.length} more available)`
            : "Suggest Match"}
        </button>

        {currentSuggestion && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-blue-900 text-center">
              Suggested Match
            </h3>

            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white rounded-lg border p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Team A</p>
                <p className="text-sm font-medium">{currentSuggestion.teamA[0].name}</p>
                <p className="text-sm font-medium">{currentSuggestion.teamA[1].name}</p>
                <p className="text-xs text-blue-600 mt-1 font-semibold">
                  {Math.round(currentSuggestion.winPctA * 100)}% win
                </p>
              </div>

              <div className="text-gray-400 font-bold text-sm">vs</div>

              <div className="flex-1 bg-white rounded-lg border p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Team B</p>
                <p className="text-sm font-medium">{currentSuggestion.teamB[0].name}</p>
                <p className="text-sm font-medium">{currentSuggestion.teamB[1].name}</p>
                <p className="text-xs text-blue-600 mt-1 font-semibold">
                  {Math.round(currentSuggestion.winPctB * 100)}% win
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleReshuffle}
                disabled={suggestions.length <= 1}
                className="flex-1 py-1.5 px-3 border border-blue-300 text-blue-700 text-sm rounded-lg hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Re-shuffle
              </button>
              <button
                onClick={handleAccept}
                disabled={isAccepting}
                className="flex-1 py-1.5 px-3 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-40"
              >
                {isAccepting ? "Starting..." : "Accept"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
