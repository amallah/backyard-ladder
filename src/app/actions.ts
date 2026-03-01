"use server";

import { redirect } from "next/navigation";
import { generateSlug } from "@/lib/slug";
import { supabase } from "@/lib/supabase";
import { calculateEloChange } from "@/lib/elo";

export async function createSession(formData: FormData) {
  const sport = formData.get("sport") as string;
  const slug = await generateSlug();

  const { error } = await supabase
    .from("sessions")
    .insert({ slug, sport, status: "active" });

  if (error) throw new Error(`Failed to create session: ${error.message}`);

  redirect(`/session/${slug}/host`);
}

export type JoinSessionState = { error: string } | null;

export async function joinSession(
  _prevState: JoinSessionState,
  formData: FormData
): Promise<JoinSessionState> {
  const name = (formData.get("name") as string).trim();
  const sessionId = formData.get("session_id") as string;
  const slug = formData.get("slug") as string;

  const { data: existing } = await supabase
    .from("players")
    .select("id")
    .eq("session_id", sessionId)
    .eq("name", name)
    .maybeSingle();

  if (existing) {
    return { error: "That nickname is already taken. Try another." };
  }

  const { data: player, error } = await supabase
    .from("players")
    .insert({ session_id: sessionId, name, status: "available", elo: 1000, is_active: true })
    .select("id")
    .single();

  if (error || !player) {
    return { error: "Failed to join session. Please try again." };
  }

  redirect(`/session/${slug}/player/${player.id}`);
}

export async function togglePlayerStatus(playerId: string): Promise<void> {
  const { data: player, error: fetchError } = await supabase
    .from("players")
    .select("status")
    .eq("id", playerId)
    .maybeSingle();

  if (fetchError || !player) throw new Error("Player not found");
  if (player.status === "playing") return;

  const newStatus = player.status === "available" ? "resting" : "available";

  const { error } = await supabase
    .from("players")
    .update({ status: newStatus })
    .eq("id", playerId);

  if (error) throw new Error(`Failed to update status: ${error.message}`);
}

export async function removePlayer(playerId: string): Promise<void> {
  const { error } = await supabase
    .from("players")
    .update({ is_active: false })
    .eq("id", playerId);

  if (error) throw new Error(`Failed to remove player: ${error.message}`);
}

export async function updatePlayerElo(
  playerId: string,
  elo: number
): Promise<void> {
  const { error } = await supabase
    .from("players")
    .update({ elo })
    .eq("id", playerId);

  if (error) throw new Error(`Failed to update Elo: ${error.message}`);
}

export async function submitScore(
  matchId: string,
  scoreA: number,
  scoreB: number
): Promise<void> {
  const { data: match, error: matchFetchError } = await supabase
    .from("matches")
    .select("player_a1, player_a2, player_b1, player_b2")
    .eq("id", matchId)
    .single();

  if (matchFetchError || !match) throw new Error("Match not found");

  const playerIds = [
    match.player_a1,
    match.player_a2,
    match.player_b1,
    match.player_b2,
  ];

  const { data: playersData, error: playersFetchError } = await supabase
    .from("players")
    .select("id, elo")
    .in("id", playerIds);

  if (playersFetchError || !playersData) throw new Error("Failed to fetch players");

  const eloMap = new Map(playersData.map((p) => [p.id, p.elo as number]));

  const result = calculateEloChange({
    eloA1: eloMap.get(match.player_a1) ?? 1000,
    eloA2: eloMap.get(match.player_a2) ?? 1000,
    eloB1: eloMap.get(match.player_b1) ?? 1000,
    eloB2: eloMap.get(match.player_b2) ?? 1000,
    score_a: scoreA,
    score_b: scoreB,
  });

  const { error: matchUpdateError } = await supabase
    .from("matches")
    .update({ score_a: scoreA, score_b: scoreB, elo_change: result.elo_change })
    .eq("id", matchId);

  if (matchUpdateError)
    throw new Error(`Failed to update match: ${matchUpdateError.message}`);

  await Promise.all([
    supabase
      .from("players")
      .update({ elo: result.newEloA1, status: "available" })
      .eq("id", match.player_a1),
    supabase
      .from("players")
      .update({ elo: result.newEloA2, status: "available" })
      .eq("id", match.player_a2),
    supabase
      .from("players")
      .update({ elo: result.newEloB1, status: "available" })
      .eq("id", match.player_b1),
    supabase
      .from("players")
      .update({ elo: result.newEloB2, status: "available" })
      .eq("id", match.player_b2),
  ]);
}

export async function acceptMatch(
  sessionId: string,
  playerA1: string,
  playerA2: string,
  playerB1: string,
  playerB2: string
): Promise<void> {
  const { error: matchError } = await supabase
    .from("matches")
    .insert({
      session_id: sessionId,
      player_a1: playerA1,
      player_a2: playerA2,
      player_b1: playerB1,
      player_b2: playerB2,
    });

  if (matchError) throw new Error(`Failed to create match: ${matchError.message}`);

  const { error: playerError } = await supabase
    .from("players")
    .update({ status: "playing" })
    .in("id", [playerA1, playerA2, playerB1, playerB2]);

  if (playerError) throw new Error(`Failed to update player statuses: ${playerError.message}`);
}
