import { EN_CORE_5K } from "@/lib/wordbanks/en_core_5k";

export type GenerateIn = {
  mode?: "words" | "time";
  count?: number | null;
  duration?: number | null;
  language?: string | null;
  include_punctuation?: boolean | null;
  include_numbers?: boolean | null;
  difficulty?: "easy" | "medium" | "hard" | "auto" | null;
  recent_wpm?: number | null;
  recent_accuracy?: number | null;
};

export type GenerateOut = {
  text: string;
  mode: "words";
  count: number;
  seed: number;
  difficulty: "easy" | "medium" | "hard";
  flags: { punctuation: boolean; numbers: boolean };
};

const ALLOWED_COUNTS = new Set([10, 15, 20, 30, 50]);

function chooseDifficultyAuto(wpm = 0, acc = 100): "easy" | "medium" | "hard" {
  if (wpm >= 70 && acc >= 96) return "hard";
  if (wpm >= 40 && acc >= 94) return "medium";
  return "easy";
}

function resolveDifficulty(
  d: GenerateIn["difficulty"],
  wpm?: number | null,
  acc?: number | null
) {
  if (!d || d === "auto") return chooseDifficultyAuto(Number(wpm || 0), Number(acc || 100));
  return d;
}

function resolveFlags(
  difficulty: "easy" | "medium" | "hard",
  include_punctuation: boolean | null | undefined,
  include_numbers: boolean | null | undefined
) {
  const tierDefaults = {
    easy: { punct: false, nums: false },
    medium: { punct: true, nums: true },
    hard: { punct: true, nums: true },
  } as const;

  const td = tierDefaults[difficulty];
  const punctuation = include_punctuation == null ? td.punct : !!include_punctuation;
  const numbers = include_numbers == null ? td.nums : !!include_numbers;
  return { punctuation, numbers };
}

function rng(seed: number) {
  // Mulberry32
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function partitionBanks(words: string[]) {
  const easy: string[] = [];
  const medium: string[] = [];
  const hard: string[] = [];
  for (const w of words) {
    const s = (w || "").trim();
    if (!s) continue;
    const len = s.length;
    if (len <= 4) easy.push(s);
    else if (len <= 7) medium.push(s);
    else hard.push(s);
  }
  return { easy, medium, hard };
}

function pickWeighted<T>(rand: () => number, items: T[], weights: number[]) {
  const total = weights.reduce((a, b) => a + b, 0);
  const r = rand() * total;
  let acc = 0;
  for (let i = 0; i < items.length; i++) {
    acc += weights[i];
    if (r <= acc) return items[i];
  }
  return items[items.length - 1];
}

function injectNumbers(rand: () => number, tokens: string[], rate: number) {
  if (rate <= 0 || tokens.length === 0) return tokens.slice();
  const out = tokens.slice();
  const n = Math.max(1, Math.round(out.length * rate));
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(rand() * out.length);
    out[idx] = String(1 + Math.floor(rand() * 999));
  }
  return out;
}

function assembleSentences(
  rand: () => number,
  tokens: string[],
  opts: { punctuation: boolean; span: [number, number]; commaChance: number; enderWeights: [number, number, number] }
) {
  if (!opts.punctuation) return tokens.join(" ");

  const [minS, maxS] = opts.span;
  const out: string[] = [];
  let i = 0;

  while (i < tokens.length) {
    const span = Math.min(tokens.length - i, Math.floor(minS + rand() * (maxS - minS + 1)));
    const slice = tokens.slice(i, i + span);
    i += span;

    if (slice[0]) slice[0] = slice[0].charAt(0).toUpperCase() + slice[0].slice(1);

    if (slice.length >= 8) {
      let commas = 0;
      for (let k = 1; k < slice.length - 1; k++) {
        if (rand() < opts.commaChance) {
          slice[k] = slice[k] + ",";
          commas++;
          if (commas >= 2) break;
        }
      }
    }

    const ender = pickWeighted(rand, [".", "?", "!"], opts.enderWeights);
    out.push(slice.join(" ") + ender);
  }

  return out.join(" ");
}

export async function generatePrompt(input: GenerateIn): Promise<GenerateOut> {
  const mode = (input.mode === "time" ? "time" : "words") as "words" | "time";
  const count =
    mode === "time"
      ? Math.max(200, Number.isFinite(input.count || 0) ? Number(input.count) : 200)
      : (ALLOWED_COUNTS.has(Number(input.count)) ? Number(input.count) : 25);

  const difficulty = resolveDifficulty(input.difficulty, input.recent_wpm, input.recent_accuracy);
  const flags = resolveFlags(difficulty, input.include_punctuation, input.include_numbers);

  const tierParams = {
    easy:   { bankMix: [0.85, 0.14, 0.01] as [number, number, number], numberRate: 0.02, span: [6, 10] as [number, number], commaChance: 0.10, enders: [0.90, 0.07, 0.03] as [number, number, number] },
    medium: { bankMix: [0.65, 0.30, 0.05] as [number, number, number], numberRate: 0.06, span: [8, 12] as [number, number], commaChance: 0.14, enders: [0.85, 0.10, 0.05] as [number, number, number] },
    hard:   { bankMix: [0.40, 0.40, 0.20] as [number, number, number], numberRate: 0.10, span: [10, 14] as [number, number], commaChance: 0.18, enders: [0.78, 0.15, 0.07] as [number, number, number] },
  }[difficulty];

  const { easy, medium, hard } = partitionBanks(EN_CORE_5K);
  const banks = [easy, medium, hard];

  const seed = Math.floor(Math.random() * 2_000_000_000) + 1;
  const rand = rng(seed);

  const tokens: string[] = [];
  for (let i = 0; i < count; i++) {
    const bankIdx = pickWeighted(rand, [0, 1, 2], tierParams.bankMix);
    const bank = banks[bankIdx];
    tokens.push(bank[Math.floor(rand() * bank.length)]);
  }

  const withNums = flags.numbers ? injectNumbers(rand, tokens, tierParams.numberRate) : tokens;

  const text = assembleSentences(rand, withNums, {
    punctuation: flags.punctuation,
    span: tierParams.span,
    commaChance: tierParams.commaChance,
    enderWeights: tierParams.enders,
  });

  return {
    text,
    mode: "words",
    count,
    seed,
    difficulty,
    flags: { punctuation: flags.punctuation, numbers: flags.numbers },
  };
}


