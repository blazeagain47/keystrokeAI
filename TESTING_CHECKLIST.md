# blazeKey — Manual Testing Checklist

This is the step-by-step pass to run through whenever we've touched auth, data
storage/sync, or local dev tooling. There have been a lot of moving parts
change recently (Postgres migration, identity unification, local cache fixes,
retry queue), so this is intentionally thorough — work through it top to
bottom rather than spot-checking.

**How to use this doc:** check items off as you go. Where a section says
`📋 REPORT BACK`, copy that exact information into your reply so it can be
diagnosed without extra round trips (screenshots, exact text shown, browser
console/network output, etc). If a step fails, stop, capture the
`📋 REPORT BACK` info for that step, and move on to the next *section*
(don't skip the rest of the checklist just because one thing failed).

---

## 0. Before you start

- [ ] Close any leftover terminal windows from a previous session (backend /
      frontend / partykit).
- [ ] Open `.env.local` and confirm `NEXT_PUBLIC_API_URL="http://127.0.0.1:8000"`
      (**not** an `onrender.com` URL — if it's wrong, all testing below is
      silently pointless, this bit us once already).
- [ ] Double-click `start-local.bat`. Confirm all 3 windows open cleanly with
      no errors (Postgres healthy → migrations applied → uvicorn running →
      Next.js ready → partykit dev running).
- [ ] Have three browser contexts ready: **Browser 1** (normal window),
      **Browser 2** (a *different* browser, e.g. Edge if Browser 1 is Chrome,
      or a fully separate incognito/private window), and the DevTools
      Network + Console tabs open in both.

`📋 REPORT BACK`: Did `start-local.bat` fully succeed? Paste any red/error
text from any of the 3 windows, or say "all clean."

---

## 1. Core auth flow (the original bug)

This is the most important section — it's the bug that started all of this.

1. [ ] In **Browser 1**, go to `http://localhost:3000/login`, create a brand
   new account (pick a unique username you haven't used before, e.g.
   `test_<today's date>`).
2. [ ] Confirm you land on `/account` and it shows **0 sessions / no stats**
   (a truly new account should never show existing data — this was a real
   bug we just fixed).
3. [ ] Play **one** typing test. Go back to `/account` and confirm it now
   shows **1 session** with the right WPM/accuracy.
4. [ ] Log out in Browser 1.
5. [ ] In **Browser 2** (different browser/incognito), log in with the
   *same* username/password.
6. [ ] Confirm login succeeds and `/account` shows **the same 1 session**
   you just played in Browser 1 (this is the exact scenario that used to be
   completely broken).
7. [ ] Play a second typing test in Browser 2. Confirm `/account` now shows
   **2 sessions**.
8. [ ] Switch back to **Browser 1**, refresh `/account`. Confirm it now also
   shows **2 sessions** (proves both browsers see the same server-side
   truth, not stale local caches).

`📋 REPORT BACK`: For each numbered step above, ✅ or ❌. For any ❌,
include: a screenshot of `/account`, and anything red in the DevTools
Console/Network tab at that moment.

---

## 2. New account isolation (the "inherited stats" bug)

1. [ ] While still logged in as your test account, open a **third** browser
   context (or clear Browser 2's site data for localhost) and register yet
   another brand-new account.
2. [ ] Confirm this new account shows **0 sessions**, not the previous
   account's data.
3. [ ] Play one run on this new account, confirm only **that** account shows
   it — flip back to your first test account and confirm its count didn't
   change.

`📋 REPORT BACK`: ✅/❌ per step. If ❌, note which account showed which
number, and whether the session/run details (WPM, timestamp) match a
*different* account's real data (that's the specific symptom to watch for).

---

## 3. Run-save reliability (retry queue)

This exercises the fix where a failed/slow run-save used to silently vanish
while the UI still claimed success.

1. [ ] Open DevTools → Network tab → set throttling to **Offline**.
2. [ ] Play a typing test to completion while offline.
3. [ ] Confirm the UI still shows the completed result screen normally (no
   crash), and `/account` shows the new session locally.
4. [ ] Set Network back to **Online**.
5. [ ] Wait ~20-30 seconds (the retry driver flushes every 20s), then hard
   refresh `/account`.
6. [ ] Confirm the run is still there after refresh (i.e. it actually made
   it to the server, not just sitting in a local-only cache that'll vanish
   on another device).
7. [ ] Log into the *same* account from a different browser and confirm that
   offline-completed run shows up there too.

`📋 REPORT BACK`: ✅/❌ per step, plus: open DevTools Console, search for
`[TypingTest]` — paste any lines mentioning "queued for retry" or "Failed to
save run."

---

## 4. Rate limiting / brute force protection

1. [ ] On the login page, deliberately enter the **wrong password** for an
   existing account and submit **11 times in a row**, fairly quickly (within
   ~1 minute).
2. [ ] Confirm attempts 1–10 return a normal "Invalid username or password"
   error, and attempt **11 or later returns a "Too many attempts" error**
   (HTTP 429). This should reset after 5 minutes.
3. [ ] Try registering **9 brand-new accounts** in under a minute. The 9th
   should be rejected with "Too many attempts" (register limit is 8/hour per
   IP).

`📋 REPORT BACK`: Which attempt number first showed "Too many attempts" for
each of login/register? (Expected: 11th for login, 9th for register.)

---

## 5. Data durability (the actual root-cause fix)

This directly tests that we're no longer on ephemeral storage.

1. [ ] With `start-local.bat` running and at least one test account/run
   created, fully stop everything: close the backend window (Ctrl+C), then
   run `stop-local.bat`.
2. [ ] Re-run `start-local.bat` from scratch.
3. [ ] Log into your test account again and confirm all previous sessions,
   XP, and streak are still there (Postgres persisted to its Docker volume,
   unlike the old SQLite-on-Render setup).
4. [ ] From a terminal, run:
   `docker compose -f docker-compose.local.yml restart postgres`
   Wait ~10s, then refresh `/account` again — data should be unaffected.

`📋 REPORT BACK`: ✅/❌. If ❌ (data disappeared after a restart), that's a
severe regression — say so explicitly and include what you saw.

---

## 6. Security spot-checks

1. [ ] In DevTools → Application/Storage → Cookies, find the `ks_session`
   cookie. Confirm it's marked **HttpOnly** (should NOT be readable via
   `document.cookie` in the Console — try typing `document.cookie` in the
   console and confirm the session token is *not* in the output).
2. [ ] Try visiting `http://localhost:3000/account` in a browser with no
   cookies at all (or after clearing site data) — confirm it redirects to
   `/login` rather than showing any data or crashing.

`📋 REPORT BACK`: ✅/❌ per step.

---

## 7. General regression pass (unrelated systems, quick sanity only)

We didn't touch these directly, but they share infrastructure (auth session,
Firestore) that changed underneath them — quick smoke test only, not deep
testing.

- [ ] Typing test itself: normal words mode, time mode, and (if enabled)
  Blaze mode all complete normally and show a results screen.
- [ ] AI feedback card on the results screen loads without an error state.
- [ ] Leaderboard page loads and shows your test accounts' XP.
- [ ] Streak counter increments correctly after a day boundary (skip if
  time-consuming — note as "not tested" instead).
- [ ] Party/1v1 mode: create a room, confirm the ghost cursor / opponent
  connection works with two browser windows.
- [ ] `/dev/console` page (if you use it) loads without errors.

`📋 REPORT BACK`: ✅/❌/"not tested" per bullet. For any ❌, console errors +
screenshot.

---

## 8. Automated checks (run these yourself, paste the output)

From the project root, with `start-local.bat` **not** required to be running
for these (except e2e):

```bash
npm run lint
npm run type-check
npm run build
npm run test:e2e
```

`📋 REPORT BACK`: Paste the final pass/fail summary line from each command
(not the full output — just confirm which ones are clean vs which have
errors, and paste only the actual error text for any that fail).

---

## Final report template

When you're done, reply using this shape so everything can be triaged in one
pass:

```
## Section 1 — Core auth flow: ✅ / ❌
## Section 2 — New account isolation: ✅ / ❌
## Section 3 — Run-save reliability: ✅ / ❌
## Section 4 — Rate limiting: ✅ / ❌
## Section 5 — Data durability: ✅ / ❌
## Section 6 — Security spot-checks: ✅ / ❌
## Section 7 — General regression: ✅ / ❌ / partial
## Section 8 — Automated checks: lint ✅/❌, type-check ✅/❌, build ✅/❌, e2e ✅/❌

Details for anything that failed:
- ...
```
