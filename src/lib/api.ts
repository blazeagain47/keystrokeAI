export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

export type PromptOptions = {
  language?: string;
  difficulty?: "easy" | "medium" | "hard";
  include_punctuation?: boolean;
  include_numbers?: boolean;
  quotes_mode?: boolean;
  zen_mode?: boolean;
  topic?: string;
  word_target?: number;
  seed?: number;
};

export async function generatePrompt(options: PromptOptions) {
  const res = await fetch(`${API_BASE}/prompt/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });
  if (!res.ok) {
    throw new Error(`Failed to generate prompt: ${res.status}`);
  }
  const data = await res.json();
  return data as { text: string };
}

export async function fetchPrompt(params: {
  mode: "words" | "time";
  count?: number;
  durationSec?: number;
  include_punctuation?: boolean;
  include_numbers?: boolean;
  language?: string;
}) {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL || API_BASE;
  const res = await fetch(`${base}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: params.mode,
      count: params.count,
      duration: params.durationSec,
      include_punctuation: params.include_punctuation ?? false,
      include_numbers: params.include_numbers ?? false,
      language: params.language ?? "english",
    }),
  });
  if (!res.ok) throw new Error("Failed to fetch prompt");
  return res.json() as Promise<{ text: string; mode: "words"; count: number; seed: number }>;
}



