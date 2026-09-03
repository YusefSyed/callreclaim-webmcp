# Demo video script

Target length: 1 minute 55 seconds

Use a fresh reset of the public deployment. Record the app and the WebMCP interaction only. Do not show private repositories, browser history, notifications, account details, or credentials. Start already logged in. Record short clips, remove loading and typing, and use narration without music.

## 0:00 to 0:12 | Show the working product

**Visual:** Open on the full CallReclaim desk. Keep the owner brief, empty rescue plan, inbox, and selected call visible.

**Narration:** "This is CallReclaim. The owner has time for one reply in the next 30 minutes. The agent's job is to decide which missed call deserves it and show why."

## 0:12 to 0:24 | Show the tool boundary

**Visual:** Open Site tools. Show all five names without lingering on setup.

**Narration:** "The page exposes five WebMCP tools. They read the live desk, stage a plan, inspect a conversation, draft, and queue. There is no approve tool and no send tool."

## 0:24 to 0:46 | Compare and stage a plan

**Prompt shown before recording:** "I have time for one reply in the next 30 minutes. Compare the authorized leads and stage a rescue plan. Use the recorded facts to explain the choice."

**Visual:** Show `list_demo_leads`, then `stage_rescue_plan`. Keep the visible plan in frame.

**Narration:** "The agent gets a short list with timing, urgency, sample job value, follow-up permission, and the owner's current brief. It chooses Jordan's paint-correction request and cites two details: an estimate is requested before noon today. The proposal appears on the page I am already using."

## 0:46 to 0:57 | Owner acceptance

**Visual:** Click **Use this plan**. Show the accepted state and drafting-unlocked label.

**Narration:** "The agent cannot accept its own plan. I can clear it or use it. I accept this one, which unlocks agent drafting for that lead only."

## 0:57 to 1:22 | Inspect, draft, and queue

**Prompt shown before recording:** "Inspect the accepted lead. Draft a short reply using only the recorded details, then queue the current revision for my review. Do not claim to send anything."

**Visual:** Show `inspect_demo_lead`, `draft_owner_reply`, and `queue_for_owner_review`. End on the owner checkpoint with highlighted citations and revision one in the activity.

**Narration:** "Inspecting opens the same conversation I see. The agent stages a short reply and declares the exact facts it used. Those citations light up in the owner checkpoint. Queueing requires the current draft revision. The text is still editable and unsent."

## 1:22 to 1:39 | Protect the owner's edit

**Visual:** Change one phrase in the textarea. Show the draft reopen. Attempt to queue revision one and show the intentional `unstaged_edits` error.

**Narration:** "Now I change the text. The review state reopens, and the old queue request fails. My edit stays on screen. The agent has to work from a new revision instead of overwriting me."

## 1:39 to 1:51 | Test hostile and unauthorized input

**Visual:** Open DEMO-517 and show the untrusted caller warning. Briefly show the no-follow-up record in the inbox.

**Narration:** "One caller even puts an instruction inside the message. The transcript is marked untrusted, and caller text cannot create approval or send powers. A record without a follow-up request is blocked from planning and drafting."

## 1:51 to 2:01 | Close

**Visual:** Return to the accepted plan and owner checkpoint. Keep **Nothing can send** visible.

**Narration:** "The agent sorts the call. It prepares the reply. The owner decides whether it goes anywhere."
