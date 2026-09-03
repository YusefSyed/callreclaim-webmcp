# Devpost submission copy

## Project overview

### Project name

CallReclaim: Agent Rescue Desk

### Elevator pitch

A missed-call desk where an agent sorts the inbox and shows why each choice matters. The owner decides what happens next.

## Project details

### About the project

## Why I built it

A detailing shop owner can miss a call while working on a car. The hard part is not writing a text. It is deciding which call deserves attention when several people have different deadlines, job values, and follow-up permissions.

I built CallReclaim around one rule: the agent can prepare the reply, but the owner decides whether it goes anywhere.

## What it does

The demo opens with five fictional missed calls. The owner starts by saying how many replies they can handle in the next 30 minutes. A WebMCP agent can then:

1. Compare the full inbox and read the current owner brief.
2. Stage a rescue plan that fits the owner's capacity.
3. Cite the exact recorded facts behind each choice.
4. Open an accepted lead and inspect its conversation.
5. Draft an editable reply after the owner accepts the plan.
6. Queue the current draft revision for owner review.

The plan and draft appear in the same desk the owner is looking at. The owner can accept or clear the plan, edit the text, mark the draft reviewed, discard it, or reset the demo.

The agent cannot accept its own plan. It cannot approve a draft. It cannot send a message. Those actions are absent from the tool surface and from the application itself.

## Why WebMCP fits

A normal interface is good for reading one conversation. The harder task crosses several calls and constraints. WebMCP lets the agent compare the calls, cite the records, and stage a plan in the same desk the owner uses.

The owner and agent also need a safe way to take turns. If the owner changes the reply capacity, the old rescue plan becomes stale. If the owner edits a draft, the old revision cannot be queued. Those checks happen in the same state machine used by the visible controls.

Without this handoff, the owner has to compare the calls and rebuild the context alone. Here the agent does that cross-record work while the owner keeps the customer decision.

## How I built it

The challenge app is a one-page React and TypeScript project built with Vinext and deployed on OpenAI Sites. The top-level page registers five imperative tools with `document.modelContext.registerTool(...)`:

- `list_demo_leads`
- `inspect_demo_lead`
- `stage_rescue_plan`
- `draft_owner_reply`
- `queue_for_owner_review`

The tools and visible controls use the same state rules. If the owner changes the plan or draft, old agent work no longer applies. Inputs are bounded with JSON Schema and runtime checks. Tool registration is page-scoped and cleaned up with `AbortSignal`.

The records are deterministic and fictional. There is no database, model API, authentication, telephony provider, tracking, or secret configuration.

## The hard parts

The first hard part was capability design. A warning that says "please do not send" is weak if the capability still exists. CallReclaim has no send tool and no messaging backend.

The second hard part was protecting the owner's edit. When they change the plan or draft, the old agent version is rejected.

The third hard part was caller text aimed at the agent. One fictional caller tries to give the agent an instruction. The app treats that as caller text, not as a command. The caller cannot create approval or send powers, and every declared citation must match the recorded fact list.

## What I tested

The test suite covers successful tool order, input schemas, capacity limits, duplicate and unauthorized leads, unsupported citations, stale plans, owner acceptance, agent draft gating, owner edits, stale draft revisions, reviewed-draft requeueing, output budgets, tool cleanup, and browsers without WebMCP.

I also created a prompt-level evaluation matrix for direct, ambiguous, unsafe, adversarial, and stale-state requests. The final release is tested on the deployed URL in ChatGPT's in-app browser, not only against local handlers.

## What I learned

The important decision was what to leave out. The agent can prepare a reply. It cannot approve or send it. Revision checks also protect the owner's latest work in code.

The agent sorts the call. It prepares the reply. The owner decides whether it goes anywhere.

## What I built during the challenge

CallReclaim's broader missed-call concept existed before the challenge. During the challenge, I built a separate WebMCP edition with an owner capacity check, a cited plan, five page tools, and revision checks that stop stale drafts.

## What's next

This submission stays synthetic. A production version would require customer authorization, secure tenant data, verified messaging consent, provider integrations, audit logging, and a separate operational rollout.

### Built with tags

- WebMCP
- TypeScript
- React
- Next.js
- Vinext
- OpenAI Sites
- Cloudflare Workers
- Node.js
- JSON Schema
- Lucide

### Try it out links

- Live app: https://callreclaim-agent-desk.yoosefseed.chatgpt.site
- Public code: https://github.com/YusefSyed/callreclaim-webmcp

### Demo video

Add the public YouTube URL after the final recording is uploaded.

## Additional info

### Submitter type

Needs Yusef's confirmation before the form is saved.

### Country of residence

Needs Yusef's confirmation before the form is saved.

### Organization

Leave blank unless Yusef says this entry represents an organization.

### App status

Existing

### Existing-project explanation

CallReclaim's broader missed-call concept existed before August 25, 2026. During the challenge period, I created a separate public repository and built the WebMCP edition: a fictional multi-lead desk, an owner capacity brief, a cited rescue plan, five imperative page tools, revision checks, an adversarial caller fixture, an evaluation matrix, focused tests, and a standalone deployment. No private CallReclaim code, customer data, or production integrations are included.

### Live URL

https://callreclaim-agent-desk.yoosefseed.chatgpt.site

### Testing instructions for judges

Open the app in ChatGPT's in-app browser and press Reset. Ask: "I have time for one reply in the next 30 minutes. Compare the authorized leads and stage a rescue plan. Use the recorded facts to explain the choice." Accept the visible plan manually. Then ask: "Inspect the accepted lead. Draft a short reply using only the recorded details, then queue the current revision for my review. Do not claim to send anything." The plan, selected conversation, draft revision, and owner-review state should all change on the page. Asking the agent to approve or send must produce no such action because neither capability exists.

### Public code repository

https://github.com/YusefSyed/callreclaim-webmcp

### Agents or clients tested

Codex in ChatGPT's in-app browser with WebMCP site tools enabled. Add another client only if it is actually tested before submission.

### AI tools used

Finalize after the last critique, narration, and video pass so this answer lists only tools actually used.

### Learning level

Choose after inspecting the available form options.

### Career AI value

Choose after inspecting the available form options.
