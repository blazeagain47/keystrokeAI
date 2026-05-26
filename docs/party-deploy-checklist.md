# blazeKey 1v1 Party — Deploy Checklist

Phase 6 deployment hardening. This document is the single source of truth for
shipping the party feature to production. **Do not paste real secret values
into this file**; only document which variables go where.

The party feature spans three runtimes:

1. **Next.js (Vercel)** — `/party/*` pages and `/api/party/*` routes.
2. **PartyKit (`*.partykit.dev`)** — the live room server defined in
   `party/index.ts`.
3. **Firestore (Firebase project `keystroke-ai-879a4`)** — final-audit
   storage; never receives high-frequency progress.

If any of these three are misconfigured, party creation/join will fail. The
checklist below is ordered so issues surface early.

---

## 1. Environment variables

### 1a. Vercel (Next.js runtime)

Required:

| Variable | Scope | Notes |
| --- | --- | --- |
| `FIREBASE_PROJECT_ID` | Server | Existing — used by `firebaseAdmin`. |
| `FIREBASE_CLIENT_EMAIL` | Server | Existing — used by `firebaseAdmin`. |
| `FIREBASE_PRIVATE_KEY` | Server | Existing — JSON-escaped PEM. |
| `PARTYKIT_HOST` | Server | **NEW.** Hostname of the deployed PartyKit project (e.g. `blazekey-party.<username>.partykit.dev`). Used by `src/lib/party/serverConfig.ts` for server-to-server hydration calls. |
| `PARTYKIT_ADMIN_TOKEN` | Server | **NEW.** Shared bearer secret. Must match the same variable on PartyKit. Used to authorize the room-hydrate POST. |
| `NEXT_PUBLIC_PARTYKIT_HOST` | Client | **NEW.** Same hostname as `PARTYKIT_HOST`. This one is read by the browser bundle (`src/lib/party/client.ts`) to open the WebSocket. It is safe to expose (it's just a hostname). |
| `NEXT_PUBLIC_FIREBASE_*` | Client | Existing — unchanged. |

Forbidden in Vercel:

- Do **not** expose `PARTYKIT_ADMIN_TOKEN` via `NEXT_PUBLIC_*`. It's a
  server-to-server secret. The browser never needs it.
- Do **not** set `PARTYKIT_HOST=127.0.0.1:1999` in production. The
  `getServerPartyHost()` helper throws a clear `partykit_host_missing`
  error in production if neither host variable is set.

### 1b. PartyKit project

Required (set via `npx partykit env add <NAME>` from the repo root, or via
the PartyKit dashboard):

| Variable | Notes |
| --- | --- |
| `PARTYKIT_ADMIN_TOKEN` | Same value as Vercel. Read by `party/index.ts` to authorize the hydrate POST. |

Forbidden in PartyKit:

- Do **not** put Firebase Admin credentials in PartyKit. The PartyKit room
  never writes Firestore directly — it stays ephemeral on purpose.

### 1c. Local development

`.env.local`:

```
PARTYKIT_HOST=127.0.0.1:1999
NEXT_PUBLIC_PARTYKIT_HOST=127.0.0.1:1999
PARTYKIT_ADMIN_TOKEN=<any 16+ char dev token, e.g. openssl rand -hex 32>
# plus existing FIREBASE_* and NEXT_PUBLIC_FIREBASE_* values
```

Run two processes side by side:

```
npx partykit dev        # serves the room on http://127.0.0.1:1999
npm run dev             # serves Next.js on http://localhost:3000
```

The local PartyKit dev server reads `PARTYKIT_ADMIN_TOKEN` from the same
`.env.local` automatically.

---

## 2. Deploy order (first-time and updates)

1. **PartyKit first.** Any protocol or room-state change must already be
   live on PartyKit before Next.js clients try to connect against the new
   shape.

   ```
   npx partykit deploy
   ```

   Confirm the deploy URL ends in `*.partykit.dev` and matches what you
   stored as `PARTYKIT_HOST` / `NEXT_PUBLIC_PARTYKIT_HOST` in Vercel.

2. **Next.js second.** Push to the Vercel-connected branch (or
   `vercel --prod`).

3. **Smoke test.** See § 4 below.

If you deploy Next.js before PartyKit and the protocol changed, the
hydrate POST may 4xx and `POST /api/party/create` will return
`partykit_hydrate_failed`.

---

## 3. Production safety guarantees baked into the code

- `src/lib/party/serverConfig.ts::getServerPartyHost()` throws
  `partykit_host_missing` when `NODE_ENV === "production"` and neither
  `PARTYKIT_HOST` nor `NEXT_PUBLIC_PARTYKIT_HOST` is set. The
  `/api/party/create` route maps that to a 502 with body
  `{ error: "partykit_host_missing" }`.

- `src/lib/party/client.ts::getPartyHost()` logs a one-time
  `console.warn` in production if `NEXT_PUBLIC_PARTYKIT_HOST` is missing,
  so misconfigs are visible in browser DevTools.

- `src/lib/party/code.ts` is guarded by `import "server-only"` (uses
  `node:crypto`). All shape-only helpers live in `src/lib/party/codeShape.ts`
  which is browser-safe.

- `src/utils/safeCopy.ts` (used by the copy-code button) tolerates a
  missing/blocked clipboard via a textarea fallback.

- `src/lib/party/playerId.ts::getOrCreatePlayerId()` no-ops on the
  server, falls back to a session-only id if `localStorage` is blocked,
  and never throws.

- The PartyKit room (`party/index.ts`) uses storage alarms set at the
  party's `expiresAt` so the room marks itself `expired` at TTL and
  rejects new connections. Existing race state is preserved — see
  § "Multi-test compatibility" below.

---

## 4. Post-deploy smoke test (≈ 2 minutes)

Run these in order. Each should pass before declaring the deploy green.

1. Visit `https://<your-domain>/party`. Page loads without console
   errors. No `NEXT_PUBLIC_PARTYKIT_HOST` warning in the browser console.
2. Click **Create party**. Network panel shows
   `POST /api/party/create` → `200`. URL changes to `/party/{code}`.
3. In a second browser/incognito window, paste the code on
   `https://<your-domain>/party` → **Join party**. Network panel shows
   `POST /api/party/join` → `200`. Lobby renders both players.
4. Both players: click **I'm ready**. Countdown reaches 0; race screen
   appears in both windows.
5. Type for a few seconds in window A. Cyan ghost cursor moves in
   window B and vice versa. Phase 4 Debug HUD increments its sequence.
6. Click **Leave race** in one window. The other window shows the
   "Opponent disconnected — keep typing." banner (top-center).
7. Open Firestore: `parties_v1/{partyId}` exists with `active: true`.
   `party_results_v1` collection is empty (results persistence is a
   later phase — intentional for this checklist).

If any step fails, see § 6 troubleshooting.

---

## 5. Multi-test (rematch) compatibility note

The party room is intentionally **not** destroyed at the end of a single
race. The MVP only renders the first race; future work will add a
`next_test` / `play_again` flow that rerolls `testContent` and resets
`startsAt` without changing `partyId`. Therefore:

- **Do not** add code that deletes the Firestore party doc on finish.
- **Do not** add code that calls `room.storage.deleteAll()` after a race
  completes; the room's TTL alarm is the only thing that should advance
  it to `expired`.
- **Do** keep `expiresAt` as the single source of truth for the room's
  lifetime. The MVP rematch UI will land in a follow-up phase.

---

## 6. Troubleshooting matrix

| Symptom | Likely cause | Where to look |
| --- | --- | --- |
| `POST /api/party/create` → 502, body `{ error: "partykit_host_missing" }` | `PARTYKIT_HOST` / `NEXT_PUBLIC_PARTYKIT_HOST` missing on Vercel | Vercel → Project → Settings → Environment Variables |
| `POST /api/party/create` → 502, body `{ error: "partykit_hydrate_failed" }` | Wrong host, or PartyKit deploy down, or `PARTYKIT_ADMIN_TOKEN` mismatch between Vercel and PartyKit | Run `npx partykit list`; compare token in Vercel vs `npx partykit env list` |
| Page connects to `ws://127.0.0.1:1999` in production | Missing `NEXT_PUBLIC_PARTYKIT_HOST` on Vercel | Set on Vercel; rebuild (env var is baked into the client bundle) |
| Lobby loads but never transitions past "Waiting for opponent" after a guest joins | Different `partyId` between Firestore audit doc and PartyKit room | This should not happen; if it does, capture `partyId` and `code` and check Firestore vs PartyKit dashboard |
| Race screen blank for the joiner only | `testContent` empty in the Firestore audit doc | Inspect Firestore `parties_v1/{partyId}.testContent`; if blank, the create call's content gen failed — re-create party |
| Copy code button silently no-ops | Clipboard API blocked (e.g. insecure context, focus issue) | `safeCopy.ts` falls back to a textarea trick; this is best-effort. Document for the user. |

When a deploy fails, attach:

- The exact response body of the failed `/api/party/create` or
  `/api/party/join` call.
- The browser console output (including any
  `[blazeKey/party] NEXT_PUBLIC_PARTYKIT_HOST is not set` warning).
- The relevant Vercel build log line (look for compile warnings about
  `node:crypto`, `server-only`, or `process.env.PARTYKIT_*`).
- Output of `npx partykit list` (run from repo root).

---

## 7. Things explicitly NOT covered by this checklist

The MVP intentionally defers these to follow-up phases:

- Final results UI / winner card.
- `play_again` / rematch flow (although the room is designed to be
  compatible with it — see § 5).
- Time mode in the Create flow (room and engine support it; UI only
  exposes words mode for now).
- Anti-cheat / server-side result verification.
- Cross-user friend / lobby invites.
- Public matchmaking.

If a future phase needs to relax any guarantee in this file, update this
document in the same PR.
