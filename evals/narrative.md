## 3 failure modes discovered

**1. Streamed tool-call arguments arrived fragmented → dropped bookings.**
Root cause: Groq streams `tool_calls[].function.arguments` as partial JSON spread
across many SSE frames; parsing each frame independently yielded malformed JSON and
the booking tool never fired. Fix: accumulate argument fragments per tool index in
`streamGroq` and `JSON.parse` only once the stream ends.

**2. Provider failover duplicated tokens.**
Root cause: a naive `try Groq / catch → Gemini` re-emitted already-streamed tokens
when Groq failed mid-stream. Fix: pull Groq's *first* event under a 4s timeout and
only fall back before anything is emitted; a mid-stream failure ends gracefully
instead of restarting on Gemini.

**3. Cold/oversized corpus threatened the <2s voice budget.**
Root cause: bundling the embedding vectors into the Edge function risked the code-size
limit and slowed cold starts. Fix: serve the corpus as a static asset (`/corpus.json`)
and fetch + cache it at the edge on first request, keeping the function tiny.

## One conscious tradeoff
**In-memory brute-force cosine + Groq Llama-3.3-70B**, instead of a managed vector DB
and a frontier model. With a small corpus (hundreds of chunks) brute-force search is
microseconds and avoids a network hop in the voice hot path, and Groq's sub-second
first token is what makes <2s achievable on a <$20 budget. The cost is a recall ceiling
that would matter at much larger corpus sizes and slightly less reasoning headroom —
an acceptable trade at this scale, measured by the retrieval P/R and hallucination
numbers above.

## What I'd build with 2 more weeks
- Hybrid retrieval (BM25 + dense) with a cross-encoder reranker to lift recall.
- A per-utterance semantic cache to cut repeat voice/LLM cost.
- An eval CI gate that fails the build if hallucination rate regresses.
- Richer scheduling tools (reschedule/cancel, timezone negotiation).
- A latency-percentile observability dashboard for voice turns.
