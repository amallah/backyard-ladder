import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { StatusToggle } from "./StatusToggle";

interface PlayerPageProps {
  params: Promise<{ slug: string; id: string }>;
}

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { slug, id } = await params;

  const { data: player } = await supabase
    .from("players")
    .select("id, name, elo, status, session_id")
    .eq("id", id)
    .maybeSingle();

  if (!player) notFound();

  const { data: session } = await supabase
    .from("sessions")
    .select("slug")
    .eq("id", player.session_id)
    .maybeSingle();

  if (!session || session.slug !== slug) notFound();

  const statusLabel =
    player.status === "available"
      ? "Available"
      : player.status === "resting"
      ? "Resting"
      : "Playing";

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm p-8 bg-white rounded-xl shadow-sm border flex flex-col gap-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">{player.name}</h1>
          <p className="text-gray-500 text-sm">Elo: {player.elo}</p>
          <p className="text-gray-500 text-sm">Status: {statusLabel}</p>
        </div>
        <StatusToggle playerId={player.id} status={player.status} />
        <Link
          href={`/session/${slug}`}
          className="text-sm text-blue-600 hover:underline text-center"
        >
          View Leaderboard →
        </Link>
      </div>
    </main>
  );
}
