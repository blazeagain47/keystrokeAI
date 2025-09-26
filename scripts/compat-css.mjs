import { globSync } from "glob";
import { spawnSync } from "node:child_process";

const patterns = [".next/**/*.css", "src/**/*.css", "styles/**/*.css"];
const files = [...new Set(globSync(patterns, { ignore: ["**/node_modules/**"] }))];

if (!files.length) {
  console.log("compat:css — no CSS files found (skipping).");
  process.exit(0);
}

const args = [
  "-y",
  "doiuse@^6",
  "--browsers",
  "last 2 Chrome versions, last 2 Firefox versions, last 2 Edge versions, last 2 Safari major versions, iOS >= 15.5",
  ...files,
];

const r = spawnSync("npx", args, { stdio: "inherit" });
process.exit(r.status ?? 0);


