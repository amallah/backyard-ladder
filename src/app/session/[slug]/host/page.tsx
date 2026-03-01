import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { supabase } from "@/lib/supabase";
import { QRDisplay } from "./QRDisplay";

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

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const joinUrl = `${protocol}://${host}/session/${slug}/join`;

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white rounded-xl border shadow-sm p-8 flex flex-col gap-8">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">Host Dashboard</h1>
          <p className="text-gray-500 text-sm">{session.sport} · {slug}</p>
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-medium text-gray-600">
            Scan to join the session
          </p>
          <QRDisplay joinUrl={joinUrl} slug={slug} sport={session.sport} />
        </div>
      </div>
    </main>
  );
}
