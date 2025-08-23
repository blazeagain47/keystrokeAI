export function formatSettingChip(k: string, v: any): string {
  const label = (
    {
      words: "Words",
      language: "Language",
      punctuation: "Punctuation",
      numbers: "Numbers",
      time: "Time",
    } as Record<string, string>
  )[k] ?? (k ? k[0].toUpperCase() + k.slice(1) : "");

  let value: any = v;
  if (typeof v === "boolean") value = v ? "On" : "Off";
  if (k === "language" && typeof v === "string" && v.length) {
    value = v[0].toUpperCase() + v.slice(1);
  }
  return `${label}: ${value}`;
}


