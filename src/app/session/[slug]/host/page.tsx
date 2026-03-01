import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { QRDisplay } from "./QRDisplay";
import { PlayerList } from "./PlayerList";

interface HostPageProps {
  params: Promise<{ slug: string }>;
}

export default async function HostPage({ params }: HostPageProps) {
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

  const { data: matches } = await supabase
    .from("matches")
    .select("id, player_a1, player_a2, player_b1, player_b2, score_a, score_b")
    .eq("session_id", session.id)
    .is("score_a", null);

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const joinUrl = `${protocol}://${host}/session/${slug}/join`;

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-6">
      <div className="w-full max-w-lg flex flex-col gap-6">
        <div className="bg-white rounded-xl border shadow-sm p-8 flex flex-col gap-8">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold">Host Dashboard</h1>
            <p className="text-gray-500 text-sm">{session.sport} · {slug}</p>
            <Link
              href={`/session/${slug}`}
              className="text-sm text-blue-600 hover:underline"
            >
              View Leaderboard →
            </Link>
          </div>

          <div className="flex flex-col items-center gap-2">
            <p className="text-sm font-medium text-gray-600">
              Scan to join the session
            </p>
            <QRDisplay joinUrl={joinUrl} slug={slug} sport={session.sport} />
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-6">
          <PlayerList
            initialPlayers={players ?? []}
            initialMatches={matches ?? []}
            sessionId={session.id}
          />
        </div>
      </div>
    </main>
  );
}
