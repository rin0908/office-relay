---
name: testing-office-relay
description: How to run and end-to-end test the OFFICE RELAY app (Next.js 16 + Supabase, local stack or the hosted Vercel deployment) in the browser, including the Golden Path (assets → needs → matches → double acceptance → transfer), private Storage/RLS checks, realtime, and Connector Factory failure behavior.
---

# Testing OFFICE RELAY end-to-end

## Bring the stack up (in this order)
1. Local Supabase: `~/.local/bin/supabase status` (API http://127.0.0.1:54321, Studio :54323, DB :54322). Start with `~/.local/bin/supabase start` if down.
2. Edge functions (needed for `embed` used by pgvector similarity, and `connector-factory`):
   `~/.local/bin/supabase functions serve --no-verify-jwt` in a background shell. Verify the process exists before assuming it's up; a 500 from `/functions/v1/embed` does not necessarily mean the process died.
3. App with **local** env:
   ```bash
   export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22
   npm run dev     # picks up .env.development.local
   ```
   Never use `.env.local` — it points at a hosted project whose schema may not be migrated.
4. Seed only if data is missing: `npm run seed` (scripts/seed-demo.mjs). Never use service_role key / DB password.

## Testing the HOSTED deployment instead (Vercel + hosted Supabase)
Do **not** start `npm run dev` for this; drive the public URL only (e.g. `https://office-relay.vercel.app`, backed by a hosted Supabase project). Everything in the Golden Path below behaves identically; the differences that matter:
- Hosted Supabase Auth **rejects `.demo` email domains** — hosted seed accounts use a real-looking TLD (e.g. `donor@officerelay.dev` / `startup@officerelay.dev`). Seed them with `node scripts/seed-demo.mjs --email-domain <domain>`.
- Prove the Storage bucket is private without secrets: `curl -o /dev/null -w '%{http_code}' https://<ref>.supabase.co/storage/v1/object/public/item-images/<any-path>` should return 400/`NoSuchBucket` while the app still renders the photos — that combination proves signed URLs are working. Image `src` should be `https://<ref>.supabase.co/storage/v1/object/sign/item-images/...`.
- Expect **slow revalidation** after `マッチを再計算` on Vercel: the success message and the realtime `matches INSERT` event can appear ~15-20s before the match list itself renders. Wait before calling it a failure.

## Demo accounts (password `OfficeRelay!2026`)
- `donor@office-relay.demo` (local) / `donor@officerelay.dev` (hosted) — NEXTMOVE株式会社 (DONOR): assets + service wants
- `startup@office-relay.demo` (local) / `startup@officerelay.dev` (hosted) — AI Seed株式会社 (STARTUP): needs + service offers

Use a normal Chrome window for one org and an **incognito** window for the other; both sessions can then be live simultaneously (required for double acceptance and realtime tests).

## Golden Path order that works
`/items` → `/items/new` (submit form first, photos are uploaded on the following step) → `/needs` (startup) → `/matches` → click `マッチを再計算` → open top match → **startup accepts first** (`この資産を受け取りたい`) → **then donor** (`提供を承認する`) → `/transfers`.

Key expectations:
- Donor's `提供を承認する` button is **not rendered at all** before `startup_accepted_at` is set (src/app/(app)/matches/[id]/page.tsx `canDonorAccept`) — the negative case is "button absent", not "button disabled".
- Status labels are in `src/lib/format.ts`: item `reserved` renders as **受け渡し確定** (not 予約済み) and need `fulfilled` renders as **マッチ成立** (not 充足済み). Check the label map before calling a status assertion a failure.
- Transfer is created by a DB trigger; the match detail then shows `MATCH ACCEPTED — 双方の承認により受け渡しが自動生成されました。`
- RLS: recipient sees `正確な住所` / `連絡事項` only after both acceptances; before that a gated message is shown. Owner (donor) always sees its own values.
- Photo uploader: `MAX_PHOTOS = 3`, error `写真は最大3枚までです。` Real images available under `/home/ubuntu/photos/small/` and `<repo>/demo-photos/`.
- Connector Factory without `DEVIN_API_KEY` is *expected* to fail loudly: job badge 失敗 + log `DEVIN_API_KEY 未設定のため中止しました（ダミー処理は行いません）。`

## Realtime testing (two windows side by side)
Tiling with `wmctrl -e` sometimes silently no-ops; this sequence works on this box:
```bash
export DISPLAY=:0   # NOT :1
wmctrl -l           # get window ids
for w in <id1> <id2>; do wmctrl -r $w -b remove,maximized_vert,maximized_horz; done
xdotool windowsize <id1> 800 1150; xdotool windowmove <id1> 0 0
xdotool windowsize <id2> 800 1150; xdotool windowmove <id2> 800 0
```
If `wmctrl -r <id> -b remove,maximized_*` is ignored (window stays 1600 wide), force it with
`xdotool windowstate --remove MAXIMIZED_VERT <id>; xdotool windowstate --remove MAXIMIZED_HORZ <id>` followed by `xdotool windowsize --sync` / `windowmove --sync`.
Avoid clicking near the title bar afterwards — it re-maximizes the window and hides the other one.
The realtime indicator renders `リアルタイム更新: 接続中 — 最終受信 hh:mm:ss <table> <EVENT>`, which is the cleanest proof that the page refreshed itself (`src/components/realtime-refresher.tsx`).

## Mobile viewport
`xdotool windowsize` on the Chrome window is often ignored by the WM. Use DevTools device mode instead, and note the shortcut only works when focus is inside the DevTools panel:
F12 → **click inside the DevTools pane** → `ctrl+shift+m` → set the width field (e.g. 375). Pressing `ctrl+shift+m` with page focus opens the Chrome profile menu instead.

## Japanese text entry
Typing Japanese directly into fields is unreliable; copy via clipboard instead (`xclip` may need installing: `sudo -n apt-get install -y xclip`).

`xdotool` also cannot type `@` in this environment — split email entry into `type "donor"`, `key at`, `type "officerelay.dev"`, otherwise the field silently gets `donorofficerelay.dev` and the browser shows `Please include an '@' in the email address.`

`datetime-local` fields are the most fragile control here. Click the **month segment**, then type each segment separately with a short wait between them, and press `Right` before the hour segment; typing all digits in one `type` call makes the year segment swallow the following digits (e.g. `202607`). Verify the resulting value in the DOM (`text="2026-08-25T10:30"`) before submitting.

## Devin Secrets Needed
- `DEVIN_API_KEY` — only if you want Connector Factory to actually succeed; absent it must fail explicitly (that's the tested behavior).
