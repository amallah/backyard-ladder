"use client";

import { useActionState } from "react";
import { joinSession, type JoinSessionState } from "@/app/actions";

interface JoinFormProps {
  sessionId: string;
  slug: string;
}

export function JoinForm({ sessionId, slug }: JoinFormProps) {
  const [state, formAction, isPending] = useActionState<JoinSessionState, FormData>(
    joinSession,
    null
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="session_id" value={sessionId} />
      <input type="hidden" name="slug" value={slug} />
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="text-sm font-medium">
          Nickname
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="e.g. swift-fox"
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
        {state?.error && (
          <p className="text-red-500 text-sm">{state.error}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="bg-black text-white rounded-md px-4 py-2 font-medium text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Joining..." : "Join"}
      </button>
    </form>
  );
}
