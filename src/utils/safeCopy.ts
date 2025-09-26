export async function safeCopy(text: string): Promise<boolean> {
  try {
    if (
      typeof navigator !== "undefined" &&
      (navigator as any).clipboard &&
      (globalThis as any).isSecureContext
    ) {
      await (navigator as any).clipboard.writeText(text);
      return true;
    }
  } catch {}
  // Fallback: textarea trick
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}


