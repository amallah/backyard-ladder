"use server";

import { redirect } from "next/navigation";
import { generateSlug } from "@/lib/slug";
import { supabase } from "@/lib/supabase";

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
