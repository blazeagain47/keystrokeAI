"use client";

import React, { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Zap, LogIn } from "lucide-react";
import clsx from "clsx";

import { createParty, joinParty, PartyApiError } from "@/lib/party/api";
import { CODE_LENGTH } from "@/lib/party/codeShape";
import { getOrCreatePlayerId } from "@/lib/party/playerId";
import type { PartyTestConfig } from "@/lib/party/types";
import { usePartyStore } from "@/stores/usePartyStore";

import CodeInput from "./CodeInput";

const WORD_COUNTS = [10, 15, 20, 30, 50] as const;

export default function PartyEntry() {
  const router = useRouter();
  const setFromCreate = usePartyStore((s) => s.setFromCreate);
  const setFromJoin = usePartyStore((s) => s.setFromJoin);

  // Create form state
  const [wordCount, setWordCount] = useState<number>(15);
  const [punctuation, setPunctuation] = useState(false);
  const [numbers, setNumbers] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Join form state
  const [code, setCode] = useState<string>("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const handleCreate = useCallback(async () => {
    if (creating) return;
    setCreateError(null);
    const hostPlayerId = getOrCreatePlayerId();
    if (!hostPlayerId) {
      setCreateError("Couldn't get a player id. Try refreshing the page.");
      return;
    }
    const testConfig: PartyTestConfig = {
      mode: "words",
      wordCount,
      flags: { punctuation, numbers },
      language: "english",
    };
    setCreating(true);
    try {
      const resp = await createParty({ hostPlayerId, testConfig });
      setFromCreate({
        partyId: resp.partyId,
        code: resp.code,
        hostId: hostPlayerId,
        testConfig,
        testContent: resp.testContent,
        expiresAt: resp.expiresAt,
      });
      router.push(`/party/${resp.code}`);
    } catch (e) {
      const msg = e instanceof PartyApiError ? e.message : "Couldn't create party.";
      setCreateError(msg);
      setCreating(false);
    }
  }, [creating, wordCount, punctuation, numbers, setFromCreate, router]);

  const handleJoin = useCallback(async () => {
    if (joining) return;
    if (code.length !== CODE_LENGTH) {
      setJoinError("Enter all 6 digits.");
      return;
    }
    setJoinError(null);
    const guestPlayerId = getOrCreatePlayerId();
    if (!guestPlayerId) {
      setJoinError("Couldn't get a player id. Try refreshing the page.");
      return;
    }
    setJoining(true);
    try {
      const resp = await joinParty({ code, guestPlayerId });
      setFromJoin({
        partyId: resp.partyId,
        code: resp.code,
        hostId: resp.hostId,
        status: resp.status,
        testConfig: resp.testConfig,
        testContent: resp.testContent,
        expiresAt: resp.expiresAt,
      });
      router.push(`/party/${resp.code}`);
    } catch (e) {
      const msg = e instanceof PartyApiError ? e.message : "Couldn't join party.";
      setJoinError(msg);
      setJoining(false);
    }
  }, [joining, code, setFromJoin, router]);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-24 pb-16">
      <div className="flex items-center justify-center gap-3 mb-3">
        <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500/30 to-red-500/30 border border-orange-400/30">
          <Users className="h-6 w-6 text-orange-300" />
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold bg-[linear-gradient(135deg,#FF3D00,#FF6A00_55%,#FFD36E)] bg-clip-text text-transparent">
          1v1 Party
        </h1>
      </div>
      <p className="text-center text-gray-400 mb-10">
        Create a party and share the 6-digit code, or join your friend's party.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Create Party */}
        <section
          aria-label="Create a party"
          className="rounded-2xl border border-gray-700/40 bg-gray-900/40 backdrop-blur-sm p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-orange-400" />
            <h2 className="text-lg font-semibold text-gray-100">Create party</h2>
          </div>

          {/* Word count */}
          <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">
            Words
          </label>
          <div className="flex flex-wrap gap-2 mb-5">
            {WORD_COUNTS.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={wordCount === n}
                onClick={() => setWordCount(n)}
                className={clsx(
                  "px-4 py-2 rounded-lg text-sm font-semibold transition-colors",
                  wordCount === n
                    ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/20"
                    : "bg-gray-800/60 text-gray-300 hover:bg-gray-700/70 border border-gray-700/40",
                )}
              >
                {n}
              </button>
            ))}
          </div>

          {/* Flags */}
          <div className="flex flex-wrap gap-2 mb-6">
            <FlagToggle
              label="punctuation"
              checked={punctuation}
              onChange={setPunctuation}
            />
            <FlagToggle label="numbers" checked={numbers} onChange={setNumbers} />
          </div>

          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className={clsx(
              "w-full px-5 py-3 rounded-xl font-semibold text-white transition-all",
              "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400",
              "shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30",
              "disabled:opacity-60 disabled:cursor-not-allowed",
            )}
          >
            {creating ? "Creating party…" : "Create party"}
          </button>

          {createError && (
            <p className="mt-3 text-sm text-red-300/90" role="alert">
              {createError}
            </p>
          )}
          <p className="mt-3 text-[11px] text-gray-500">
            Codes expire after 30 minutes of inactivity.
          </p>
        </section>

        {/* Join Party */}
        <section
          aria-label="Join a party"
          className="rounded-2xl border border-gray-700/40 bg-gray-900/40 backdrop-blur-sm p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <LogIn className="h-5 w-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-gray-100">Join party</h2>
          </div>

          <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">
            6-digit code
          </label>
          <CodeInput
            value={code}
            onChange={setCode}
            onSubmit={handleJoin}
            disabled={joining}
            autoFocus
            className="mb-5"
          />

          <button
            type="button"
            onClick={handleJoin}
            disabled={joining || code.length !== CODE_LENGTH}
            className={clsx(
              "w-full px-5 py-3 rounded-xl font-semibold text-white transition-all",
              "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400",
              "shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30",
              "disabled:opacity-60 disabled:cursor-not-allowed",
            )}
          >
            {joining ? "Joining…" : "Join party"}
          </button>

          {joinError && (
            <p className="mt-3 text-sm text-red-300/90" role="alert">
              {joinError}
            </p>
          )}
          <p className="mt-3 text-[11px] text-gray-500">
            Paste a code and we'll strip everything that isn't a digit.
          </p>
        </section>
      </div>
    </div>
  );
}

function FlagToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={clsx(
        "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
        checked
          ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900"
          : "bg-gray-800/60 text-gray-300 hover:bg-gray-700/70 border border-gray-700/40",
      )}
    >
      {label}
    </button>
  );
}
