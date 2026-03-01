"use client";

import QRCode from "react-qr-code";

interface QRDisplayProps {
  joinUrl: string;
  slug: string;
  sport: string;
}

export function QRDisplay({ joinUrl, slug, sport }: QRDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="bg-white p-4 rounded-xl border shadow-sm">
        <QRCode value={joinUrl} size={256} />
      </div>
      <div className="text-center space-y-1">
        <p className="text-gray-500 text-sm">
          Or join manually at:{" "}
          <span className="font-mono font-medium text-black">{joinUrl}</span>
        </p>
        <p className="text-sm text-gray-400">
          Session: <span className="font-medium text-gray-700">{slug}</span>
          {" · "}
          Sport: <span className="font-medium text-gray-700">{sport}</span>
        </p>
      </div>
    </div>
  );
}
