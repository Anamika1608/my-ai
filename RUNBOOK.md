# Go-Live Runbook

Everything in `src/` is built and tested. These are the remaining **live** steps
that need your accounts/keys. Do them in order — each is verifiable before moving on.

## 0. Fill `.env`
```bash
cp .env.example .env
```
Set: `GITHUB_USERNAME`, `GITHUB_TOKEN`, `CANDIDATE_NAME`, `GROQ_API_KEY`,
`GEMINI_API_KEY`, `BRAIN_API_TOKEN` (any long random string), `CALCOM_API_KEY`,
`CALCOM_EVENT_TYPE_ID`. Put your real résumé at `data/resume.pdf`.

## 1. Ingest
```bash
npm run ingest          # → public/corpus.json
```
✅ Verify: the per-source table shows résumé + repo_readme + repo_commit chunks.
Spot-check a README-only fact appears in `public/corpus.json`. Commit it.

## 2. Deploy
```bash
npx vercel            # link project
npx vercel --prod
```
In the Vercel project → Settings → Environment Variables, add the **same** vars
(except `APP_BASE_URL`, which you set to the deployed URL). Redeploy.
✅ Verify: `curl https://<app>.vercel.app/v1/chat/completions` (GET) → `{"status":"ok"}`.
✅ Verify chat: open the URL, ask a résumé question → grounded answer streams.
✅ Verify honesty: ask something not in your corpus → it admits it doesn't know.

## 3. Voice (Vapi) — includes the <2s latency proof
1. Create an assistant from `vapi/assistant.json` (replace name + app URL).
2. Custom-LLM credential: paste `BRAIN_API_TOKEN` as the API key (or append
   `&key=<BRAIN_API_TOKEN>` to `model.url`).
3. Attach a phone number (import a Twilio US number, or use a Vapi number).
4. **Call it.** ✅ first response `<2s`, ✅ barge-in works, ✅ answers grounded,
   ✅ says "I don't know" when appropriate.
   - If first response is slow: confirm the brain is on Edge and Groq key is valid;
     check Vapi logs for where time goes.

## 4. Booking (Cal.com → Google Calendar)
Connect Google Calendar in Cal.com, make a 30-min event type, set its id in
`CALCOM_EVENT_TYPE_ID`. ✅ From chat: "book me Tuesday 10am, I'm X, x@y.com" →
confirmation streams and the invite lands on your calendar. ✅ Repeat by voice.

## 5. Evals → 1-page PDF
1. Edit `evals/golden.json`: replace every `<REPLACE...>` with real repos/facts
   (include 1 README-only and 1 commit-only question). See `evals/README.md`.
2. Run 5 scripted calls (`evals/voice-scripts.md`) → fill `evals/voice-results.json`
   (copy from the `.example.json`).
3. Update `evals/narrative.md` with your **real** findings (the defaults reflect this
   build's actual decisions — adjust the 3 failure modes to what you saw).
```bash
npm run eval          # → evals/metrics.json + evals/report.html
```
Open `report.html` → Print → Save as PDF (confirm it's **one page**).

## 6. Loom + submit
- Record ≤4 min: architecture walkthrough + one hard problem (recommended: hitting
  `<2s` over a custom-LLM hop — the failover + Edge-corpus work).
- Submit: phone number, chat URL, GitHub repo, eval PDF, Loom link.
- **Keep everything live ≥7 days.** Graders call/chat unannounced.
```bash
git push -u origin build/ai-persona   # then open a PR / merge to main and make the repo public
```
