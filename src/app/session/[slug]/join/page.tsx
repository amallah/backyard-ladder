import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { JoinForm } from "./JoinForm";

interface JoinPageProps {
  params: Promise<{ slug: string }>;
}

export default async function JoinPage({ params }: JoinPageProps) {
  const { slug } = await params;

  const { data: session } = await supabase
    .from("sessions")
    .select("id, slug, sport, status")
    .eq("slug", slug)
    .maybeSingle();

  if (!session) notFound();

  if (session.status === "ended") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-sm p-8 bg-white rounded-xl shadow-sm border text-center space-y-3">
          <h1 className="text-2xl font-bold">Session Ended</h1>
          <p className="text-gray-500 text-sm">
            This session has ended. No new players can join.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm p-8 bg-white rounded-xl shadow-sm border flex flex-col gap-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">Join Session</h1>
          <p className="text-gray-500 text-sm">{session.sport} · {slug}</p>
        </div>
        <JoinForm sessionId={session.id} slug={slug} />
      </div>
    </main>
  );
}
