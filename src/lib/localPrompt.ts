const WORDS = [
  "calm","clean","cursor","pattern","flow","swift","grace","model","track","keyboard",
  "practice","steady","simple","day","clear","paper","sound","light","focus","motion"
];

export type LocalPromptOpts = {
  mode?: "time"|"words";
  wordCount?: number; // for words mode
  durationSec?: number; // for time mode (ignored here)
  punctuation?: boolean;
  numbers?: boolean;
};

export function generateLocalPrompt(opts: LocalPromptOpts = {}) {
  const wc = opts.wordCount ?? 50;
  const out: string[] = [];
  for (let i = 0; i < wc; i++) {
    out.push(WORDS[(Math.random() * WORDS.length) | 0]);
  }
  return out.join(" ");
}


