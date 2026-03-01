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
