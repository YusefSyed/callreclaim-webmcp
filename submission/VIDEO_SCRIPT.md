# Demo video script — target 2:10

Use a fresh reset of the public deployment. Record only the challenge app and the WebMCP tool surface; do not show private repositories, browser history, notifications, accounts, or credentials. Use narration without music.

## 0:00–0:12 — What this is

**Visual:** Title and full rescue desk.

**Narration:** “This is CallReclaim, a synthetic missed-call rescue desk built for people and WebMCP agents to use together. There is no customer data, phone connection, or send capability.”

## 0:12–0:25 — Show the contract

**Visual:** Open Site tools and show the four registered tools.

**Narration:** “The page exposes four explicit tools: list the demo leads, inspect one lead, stage an owner reply, and queue the current draft for review. The agent can prepare the work, but it cannot approve or send it.”

## 0:25–0:43 — Compare the inbox

**Prompt:** “Compare the consented missed calls and identify the highest-value lead.”

**Visual:** Agent calls `list_demo_leads`; show the bounded result and unchanged inbox.

**Narration:** “Instead of guessing through the interface, the agent receives structured urgency, consent, age, value, and status. It identifies the paint-correction request.”

## 0:43–1:02 — Inspect exact evidence

**Visual:** Agent calls `inspect_demo_lead`; the selected conversation changes visibly.

**Narration:** “Inspecting the lead opens the same record I see and returns the exact synthetic transcript plus its verified fact list. Those facts become the provenance for a proposed reply.”

## 1:02–1:23 — Stage, do not send

**Visual:** Agent calls `draft_owner_reply`; the editable text appears and activity log updates.

**Narration:** “The draft tool validates consent, text bounds, and declared fact provenance. It stages revision one in the owner checkpoint. The response is visible, editable, and explicitly unsent.”

## 1:23–1:39 — Revision-gated handoff

**Visual:** Agent calls `queue_for_owner_review`; status changes to Owner review and human-only controls appear.

**Narration:** “Queueing requires the exact current revision. The agent stops here. Only the owner can review or discard the draft.”

## 1:39–1:55 — Human and agent do not overwrite each other

**Visual:** Manually edit one word. Show the review status reopen and queue action remain blocked until the edit is staged as a new revision.

**Narration:** “If I edit the queued text, the handoff reopens. The old revision can no longer be queued, preventing an agent from overwriting or approving work I changed.”

## 1:55–2:05 — Consent failure

**Visual:** Attempt `draft_owner_reply` for `lead-no-consent`; show the intentional tool error and unchanged reviewed lead.

**Narration:** “A lead without follow-up permission rejects drafting at the state boundary. This is enforced behavior, not just a warning.”

## 2:05–2:15 — Close

**Visual:** Return to the full desk with the “Nothing can send” and WebMCP status labels visible.

**Narration:** “CallReclaim shows where agents are useful and where they should stop: organize the evidence, prepare the response, and leave the consequential decision with the person.”
