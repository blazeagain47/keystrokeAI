"use client";

import React from "react";
import { useParams } from "next/navigation";

import { normalizeCodeInput } from "@/lib/party/codeShape";

import PartyLobby from "@/components/party/PartyLobby";

/**
 * /party/[code]
 *
 * Phase 2: renders the lobby shell. The code segment is validated
 * client-side; the actual party state is fetched by PartyLobby via
 * /api/party/join (or read from the store if the host just navigated here
 * from the Create flow).
 *
 * Countdown, ready state, race screen, ghost cursor — none of that lives
 * here yet. They'll be added in subsequent phases as new components mounted
 * by this same page based on party status.
 */
export default function PartyByCodePage() {
  const params = useParams<{ code: string }>();
  const raw = typeof params?.code === "string" ? params.code : "";
  const normalized = normalizeCodeInput(raw);

  if (!normalized) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 pt-32 pb-16 text-center">
        <p className="text-red-300/90">
          That doesn't look like a valid party code.
        </p>
        <a
          href="/party"
          className="mt-4 inline-block px-4 py-2 rounded-xl bg-gray-800/60 hover:bg-gray-700/70 border border-gray-700/40 text-sm text-gray-200"
        >
          Back
        </a>
      </div>
    );
  }

  return <PartyLobby code={normalized} />;
}
