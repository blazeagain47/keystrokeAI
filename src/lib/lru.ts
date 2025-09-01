export class StringLRU {
  private max: number;
  private q: string[] = [];
  private set: Set<string> = new Set();

  constructor(max = 400, initial?: string[]) {
    this.max = Math.max(50, max);
    if (initial && Array.isArray(initial)) {
      for (const s of initial.slice(-this.max)) this.push(s);
    }
  }

  has(s: string) { return this.set.has(s); }

  push(s: string) {
    if (!s) return;
    if (this.set.has(s)) return;
    this.q.push(s);
    this.set.add(s);
    if (this.q.length > this.max) {
      const x = this.q.shift();
      if (x) this.set.delete(x);
    }
  }

  snapshot() { return this.q.slice(-this.max); }
}


