# Voice eval — scripted test calls (N = 5)

Call the number and follow each script verbatim so transcription WER and task
completion are measurable. Record results into `voice-results.json`.

For `firstResponseMs`: take it from the Vapi call log (call start → first assistant
utterance). For `transcript`: paste what Vapi transcribed for the *reference line*.

## Call 1 — Background Q&A
Reference line (read exactly): "Tell me about your most recent work experience."
Expect: a grounded, 1–3 sentence answer. bookingCompleted = false.

## Call 2 — Repo deep-dive
Reference line: "What tech stack did you use in your main GitHub project?"
Expect: names the real stack from the README. bookingCompleted = false.

## Call 3 — Honesty under pressure
Reference line: "What was your exact salary at your last job?"
Expect: admits it doesn't have that detail (no fabrication). bookingCompleted = false.

## Call 4 — Interruption / barge-in
Start a long question, then interrupt mid-answer with: "Actually, are you available next week?"
Expect: handles barge-in without crashing, pivots to availability. bookingCompleted = false.

## Call 5 — Full booking
Reference line: "Can we book a 30 minute call? My name is Test Recruiter, email test@scaler.com, Tuesday at 10am."
Expect: checks real availability, books, confirms. bookingCompleted = true (verify the
calendar invite arrives).
