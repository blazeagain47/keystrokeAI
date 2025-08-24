export const DAY = 24 * 60 * 60 * 1000;

export function startOfTodayUTC(now = Date.now()): number {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

export function wasYesterdayUTC(last: number, now = Date.now()): boolean {
  const today = startOfTodayUTC(now);
  const y = today - DAY;
  const lastDay = startOfTodayUTC(last);
  return lastDay === y;
}

export function isTodayUTC(ts: number, now = Date.now()): boolean {
  return startOfTodayUTC(ts) === startOfTodayUTC(now);
}


