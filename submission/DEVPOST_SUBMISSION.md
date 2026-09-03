# Devpost submission copy

## Project name

CallReclaim — Agent Rescue Desk

## Tagline

A WebMCP missed-call rescue desk where an agent prepares the work and the business owner keeps the final decision.

## Live app

https://callreclaim-agent-desk.yoosefseed.chatgpt.site

## Public repository

https://github.com/YusefSyed/callreclaim-webmcp

## Demo video

Add the public YouTube URL after the final recording is uploaded.

## Inspiration

When a detailing shop misses a call between jobs, the useful details can end up split across a missed-call alert, a consent record, and a text thread. The owner still has to find the important inquiry, reconstruct what the caller asked for, and decide how to respond.

While working on CallReclaim's original missed-call flow, I kept returning to one design question: what should an agent be allowed to prepare, and what should stay with the owner? WebMCP made it possible to express that boundary in the product itself. The agent works inside the same lead desk the owner sees and stops at owner review.

## What it does

The challenge edition opens with four clearly labeled synthetic missed calls. In a WebMCP-capable browser, an agent can:

1. Compare the bounded inbox by urgency, consent, age, value, and status.
2. Open one lead and inspect its conversation transcript and recorded facts.
3. Stage an editable reply for a consented lead.
4. Queue the current draft revision for owner review.

Every tool invocation updates the visible interface. The owner can edit, review, discard, or reset the demo manually. The agent cannot approve or send anything because no such tool or backend capability exists.

The workflow also demonstrates two deliberate failure paths: drafting is rejected when follow-up consent is absent, and queueing is rejected when a draft revision is stale or the owner has unstaged edits.

## How we built it

CallReclaim is a one-page React and TypeScript application built with Next.js-compatible Vinext and deployed on OpenAI Sites. It registers four imperative page-scoped tools with `document.modelContext.registerTool(...)`.

The visible controls and WebMCP handlers share one deterministic state machine. Tool registrations are feature-detected, cleaned up with an `AbortSignal`, and tested without a fake browser polyfill. Static fixtures keep the demo fast and repeatable; there is no database, model API, authentication, telephony provider, tracking, or secret configuration.

Safety checks include consent gating, bounded text, an allowlist for declared fact provenance, revision tokens, unstaged-edit detection, and human-only review/discard actions.

## Challenges we ran into

The hardest part was not registering a function—it was preserving a truthful human-agent boundary. A visually edited draft and an agent's stored revision can diverge, so queueing must reject stale work rather than silently overwrite the owner. We moved the editor buffer into shared state so both the UI and WebMCP tools observe the same revision and unstaged-edit condition.

We also treated real browser discovery as a release gate. Source code containing `registerTool` is not enough. We verified that the built-in browser discovered exactly four tools on the deployed origin and executed the complete list → inspect → draft → queue workflow with visible state changes.

## Accomplishments that we're proud of

- WebMCP is the primary product interaction, not a decorative shortcut.
- The full deployed workflow is deterministic and requires no external account or API key.
- The agent has useful preparation tools but no send or approval capability.
- Missing-consent, unsupported-fact, stale-revision, unstaged-edit, and unsupported-browser paths fail intentionally.
- Seven focused tests, lint, type checking, production build, and the production dependency audit pass.
- The public challenge repository is isolated from the existing private product and contains only synthetic, inspectable code and data.

## What we learned

Human oversight is strongest when it is expressed in the product's capabilities, not only in copy. Removing a `send` tool is clearer than asking an agent not to send. Revision tokens make the handoff robust when a human and agent touch the same visible draft. WebMCP makes that shared-state contract possible without asking an agent to infer the workflow from pixels.

## What's next

This submission stays deliberately synthetic. A production version would require customer authorization and a separate operational rollout.

## Built with

- WebMCP
- TypeScript
- React
- Next.js / Vinext
- OpenAI Sites
- Cloudflare Workers runtime
