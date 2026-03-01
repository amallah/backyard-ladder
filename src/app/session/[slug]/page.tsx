import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Leaderboard } from "./Leaderboard";

interface LeaderboardPageProps {
  params: Promise<{ slug: string }>;
}

export default async function LeaderboardPage({ params }: LeaderboardPageProps) {
  const { slug } = await params;

  const { data: session } = await supabase
    .from("sessions")
    .select("id, slug, sport, status")
    .eq("slug", slug)
    .maybeSingle();

  if (!session) notFound();

  const { data: players } = await supabase
    .from("players")
    .select("id, name, elo, status, is_active")
    .eq("session_id", session.id)
    .eq("is_active", true)
    .order("elo", { ascending: false });

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-6">
      <div className="w-full max-w-lg flex flex-col gap-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">{session.sport} Leaderboard</h1>
          <p className="text-gray-500 text-sm">{slug}</p>
        </div>

        <Leaderboard
          initialPlayers={players ?? []}
          sessionId={session.id}
          sessionEnded={session.status === "ended"}
        />
      </div>
    </main>
  );
}
