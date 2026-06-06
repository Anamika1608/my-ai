# Evals

Run after the app is deployed and `corpus.json` is ingested:

```bash
# .env needs: APP_BASE_URL, BRAIN_API_TOKEN, GEMINI_API_KEY
npm run eval
# → writes evals/metrics.json and evals/report.html
# open evals/report.html, print to PDF (one page) for submission
```

## golden.json — customize before running
Each item:
- `question` — what we ask the deployed brain.
- `relevant.titleIncludes` / `relevant.textIncludes` — a marker that identifies the
  corpus chunks that *should* be retrieved (used for precision/recall). Titles look
  like `Résumé — Experience`, `README — <repo>`, `Recent commits — <repo>`.

**Replace every `<REPLACE...>`** with your real repos/facts. Include at least:
- 1–2 résumé-grounded questions,
- 1 README-only question (answer not in the résumé),
- 1 commit-history-only question.

These last two prove the RAG reads READMEs + commits — exactly what graders probe.

## voice-results.json — fill from scripted calls
Copy `voice-results.example.json` → `voice-results.json` and fill in from your
5 scripted test calls (see `voice-scripts.md`). `metrics.json`/`report.html`
will then include voice latency, WER, and booking completion automatically.

## narrative.md
The qualitative half of the 1-page report (3 failure modes + root cause + fix,
the conscious tradeoff, the 2-more-weeks roadmap). Edit it with your **real**
findings before printing.
