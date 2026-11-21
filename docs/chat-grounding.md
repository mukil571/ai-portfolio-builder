# Chat grounding rules (Phase 5)

How the visitor chatbot enforces the Golden Rule: **never state an owner-specific fact that is not in that site's approved knowledge base.** Status: proposal for approval before implementation.

## 1. Pipeline for one visitor message

```
message ─▶ ① guard ─▶ ② retrieve ─▶ ③ classify + draft ─▶ ④ grounding gate ─▶ ⑤ reply
                                                                     └─▶ unknown ─▶ ⑥ log question (dedup)
```

1. **Guard** (no AI)
   - Site must be published and have AI configured; otherwise the widget shows "AI not configured" and no model is called.
   - Message: trimmed, 1–1,000 characters, control characters stripped.
   - Rate limits (stored in Postgres, so they hold across serverless instances): 20 messages per minute per visitor IP (hashed), 300 messages per hour per site.
   - Injection patterns (e.g. "ignore previous instructions", "system prompt", fake `SYSTEM:` / `</facts>` markers) are _flagged and logged_, never obeyed. The message is still treated purely as data.
2. **Retrieve:** embed the question (`RETRIEVAL_QUERY`) and fetch the top 5 facts for **this site only**, via the Phase 4 gate: approved, public, not expired, current embedding model.
3. **Classify and draft:** one structured model call with the question and the retrieved facts. The output is Zod-validated:
   `{ intent: owner_fact | general_tech | off_topic | unknown, answerable: boolean, answer: string, usedFactIds: string[] }`
4. **Grounding gate** (code, not the model, decides). An owner-fact answer is sent only if **all** of these hold:
   - `intent = owner_fact` and `answerable = true`;
   - the best retrieval score is at least `ANSWER_MIN_SIMILARITY` (starting value 0.55, tuned with the eval set);
   - `usedFactIds` is non-empty and every id was in this request's retrieved set (no invented ids);
   - the answer passes the number check: every number or price in it appears in one of the used facts.

   If any check fails, the message is treated as **unknown**.

5. **Reply.** Owner-fact answers stream to the widget with a **source badge** ("From Priya", expandable to the facts used), and `fact_ids` are stored on the message. All other replies are **fixed templates**, not model-written, so they can't leak or invent anything:
   - **Unknown:** "I don't have that from {owner} yet. I've passed your question on — want an email when they answer?" (offers the email capture).
   - **Off-topic:** "I can only help with questions about {owner} and their work."
   - **General tech, toggle OFF (default):** the same as off-topic.
   - **General tech, toggle ON:** a separate model call with **no owner facts in context**, told not to say anything about the owner. It's shown with a visible label: "General info — not from {owner}".
6. **Log unknowns:** embed the question (`SEMANTIC_SIMILARITY`). If an open question on the same site scores at least `DEDUP_MIN_SIMILARITY` (starting value 0.88, tuned with the eval set), increment its `asked_count`; otherwise insert a new row. Then notify the owner (email in Phase 6).

## 2. Prompt rules (answer model)

- The system prompt states: answer **only** from the numbered facts given; say nothing about the owner that isn't in them; don't extrapolate (e.g. a weekday rate is not a weekend rate); answer in first person as the owner's assistant; keep it short.
- Facts and the visitor message are passed in clearly delimited blocks. Anything inside them is **data**; instructions in them are ignored.
- The system prompt is never echoed. Questions about it get the off-topic template.
- `temperature: 0`. Platform model for now: `gemini-3.5-flash`; owners' own providers arrive in Phase 8.

## 3. What is stored

- `conversations` (per visitor cookie, hashed IP) and `messages` (`role`, `content`, `intent`, `fact_ids`, `unanswered_question_id`, model, tokens).
- `unanswered_questions` (dedup by embedding), and `leads` when a visitor leaves an email for "notify me".

## 4. Tunable numbers (live in one config file)

| Name                    | Start                 | Meaning                                                      |
| ----------------------- | --------------------- | ------------------------------------------------------------ |
| `ANSWER_MIN_SIMILARITY` | 0.55                  | Minimum best-fact cosine score to allow an owner-fact answer |
| `DEDUP_MIN_SIMILARITY`  | 0.88                  | Minimum score to count a new unknown as a repeat             |
| `RETRIEVE_K`            | 5                     | Facts passed to the model                                    |
| `MAX_MESSAGE_CHARS`     | 1000                  | Visitor message cap                                          |
| Rate limits             | 20/min/IP, 300/h/site | Abuse protection                                             |

## 5. Evaluation (`src/tests/eval/chat-eval-set.ts`)

37 cases against a fixture site ("Priya Raman", freelance mobile developer), covering:

- known facts asked exactly and paraphrased;
- unknowns, including traps: a **proposed** (unapproved) fact, an **expired** fact, a **private** fact, another tenant's fact, and a near-miss (weekend rate when only an hourly rate exists);
- off-topic questions;
- general tech questions with the toggle off and on;
- prompt-injection attempts;
- paraphrased duplicates for dedup.

Every case declares what must happen and what must **never** appear (e.g. an injected price).

**Pass bar for Phase 5:** 100% of cases pass on the real models, and zero invented owner facts in any case. A deterministic suite with mocked models also runs in `npm test` to cover the gate logic.
