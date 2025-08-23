export function isAbort(err: unknown): boolean {
  // DOMException name or code, plus some browser strings
  // Safari/old Chromium sometimes use code 20
  // We also check message fragments as a fallback.
  const anyErr = err as any;
  return (
    anyErr?.name === "AbortError" ||
    anyErr?.code === 20 ||
    String(anyErr?.message || "").toLowerCase().includes("abort")
  );
}


