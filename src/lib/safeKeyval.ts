export type KV = { get<T>(k: string): Promise<T | null>; set<T>(k: string, v: T): Promise<void> };
let impl: KV = {
  async get<T>(k) {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : null; } catch { return null; }
  },
  async set<T>(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
  }
};
// At runtime on the client, swap in idb-keyval if available.
if (typeof window !== 'undefined') {
  import('idb-keyval').then(mod => {
    const { get, set } = mod as { get: <T>(k: string)=>Promise<T|undefined>, set: <T>(k:string,v:T)=>Promise<void> };
    impl = {
      async get<T>(k) { const v = await get<T|undefined>(k); return (v === undefined ? null : v); },
      async set<T>(k, v) { await set<T>(k, v); },
    };
  }).catch(() => { /* stay on localStorage fallback */ });
}
export const kv: KV = {
  get: <T>(k: string) => impl.get<T>(k),
  set: <T>(k: string, v: T) => impl.set<T>(k, v),
};


