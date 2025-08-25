// src/lib/devLog.ts
export const devLog = (...args: any[]) => {
  try { console.log("[bk-typing]", ...args); } catch {}
};


