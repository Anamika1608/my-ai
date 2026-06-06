# Architecture (diagram source)

The canonical diagram lives in the README. This file is the editable source.

```mermaid
flowchart LR
  Caller["Recruiter (phone)"] --> Vapi
  Browser["Recruiter (web)"] --> ChatUI

  Vapi["Vapi: Deepgram STT, TTS, barge-in"] -->|OpenAI-compatible custom LLM| Brain
  ChatUI["Chat UI (Next.js)"] --> Proxy["/api/chat proxy (hides token)"]
  Proxy --> Brain

  Brain["Brain /v1/chat/completions (Edge): auth, rate-limit, retrieve, ground, stream, tools"]
  Brain --> Embed["Gemini text-embedding-004"]
  Brain --> Retr["in-memory cosine top-k"]
  Brain --> LLM["Groq Llama-3.3-70B -> Gemini 2.0 Flash fallback"]
  Brain -->|check_availability / book_meeting| Cal["Cal.com API v2 -> Google Calendar"]

  Ingest["scripts/ingest.ts: GitHub READMEs+commits + résumé"] --> Corpus[("public/corpus.json")]
  Corpus --> Retr
```

## Request path (voice turn)
1. Caller speaks → Vapi (Deepgram) transcribes.
2. Vapi POSTs OpenAI-compatible `/v1/chat/completions?mode=voice` to the brain.
3. Brain: auth + rate-limit → embed query (Gemini) → cosine top-6 over in-memory corpus
   → grounded+anti-injection system prompt → stream Groq (Gemini fallback).
4. If the model calls a tool, the brain runs Cal.com server-side and loops the result back.
5. Brain streams OpenAI SSE chunks → Vapi (TTS) → caller. Target first token `<2s`.
