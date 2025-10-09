export const JAVASCRIPT_SNIPPETS: string[] = [
  `const id = user?.id ?? "guest"; const add = (a,b) => a + b; for (let i = 0; i < 3; i++) console.log(add(i, 2));`,
  `export function sum(...xs){ return xs.reduce((a,b)=>a+b,0); } const ok = sum(1,2,3); if(ok>0) console.info("ok", ok);`,
  `class Store{#s=new Map(); set(k,v){this.#s.set(k,v);} get(k){return this.#s.get(k);} } const s=new Store(); s.set("k",42);`,
  `async function getJSON(url){ const r = await fetch(url); if(!r.ok) throw new Error("bad"); return r.json(); }`,
  `const state = {count:0}; const inc=()=>state.count++; const times = Array.from({length:5},(_,i)=>i); times.forEach(inc);`,
];


