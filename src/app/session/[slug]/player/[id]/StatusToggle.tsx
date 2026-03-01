"use client";

import { useTransition } from "react";
import { togglePlayerStatus } from "@/app/actions";
import { useRouter } from "next/navigation";

interface StatusToggleProps {
  playerId: string;
  status: string;
}

export function StatusToggle({ playerId, status }: StatusToggleProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isPlaying = status === "playing";
  const isAvailable = status === "available";

  function handleToggle() {
    startTransition(async () => {
      await togglePlayerStatus(playerId);
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPlaying || isPending}
      className={[
        "w-full rounded-md px-4 py-2 font-medium text-sm transition-colors",
        isPlaying
          ? "bg-blue-500 text-white cursor-not-allowed opacity-75"
          : isAvailable
          ? "bg-green-500 text-white hover:bg-green-600"
          : "bg-gray-400 text-white hover:bg-gray-500",
        isPending ? "opacity-50 cursor-not-allowed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {isPlaying ? "Playing" : isAvailable ? "Available" : "Resting"}
    </button>
  );
}
