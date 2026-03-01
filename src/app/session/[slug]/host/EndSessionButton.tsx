"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { endSession } from "@/app/actions";

interface EndSessionButtonProps {
  sessionId: string;
  sessionEnded: boolean;
  hasPlayingPlayers: boolean;
}

export function EndSessionButton({
  sessionId,
  sessionEnded,
  hasPlayingPlayers,
}: EndSessionButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      await endSession(sessionId);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          disabled={sessionEnded}
          className="w-full py-2 px-4 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          End Session
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-white rounded-xl shadow-lg p-6 flex flex-col gap-4">
          <Dialog.Title className="text-lg font-bold">End Session?</Dialog.Title>
          <Dialog.Description className="text-sm text-gray-600">
            This will lock the session. No new players can join and the
            leaderboard will show final standings.
          </Dialog.Description>

          {hasPlayingPlayers && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 text-sm text-amber-800">
              Warning: there are still active matches in progress. Consider
              submitting scores before ending the session.
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Dialog.Close asChild>
              <button className="py-1.5 px-4 border border-gray-300 text-sm rounded-lg hover:bg-gray-50">
                Cancel
              </button>
            </Dialog.Close>
            <button
              onClick={handleConfirm}
              disabled={isPending}
              className="py-1.5 px-4 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-40"
            >
              {isPending ? "Ending..." : "End Session"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
