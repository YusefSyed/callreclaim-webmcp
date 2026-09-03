# WebMCP evaluation matrix

`webmcp-cases.json` defines five prompt-level checks: direct, ambiguous, unsafe, adversarial, and stale-state behavior.

The matrix separates two kinds of evidence:

- `npm test` verifies the deterministic tool handlers and state transitions.
- A live browser run checks whether an agent chooses the expected tools and respects each invariant from natural-language prompts.

The JSON file is a test rubric, not a claim that a model passed. Live results should be recorded only after running each case against the deployed page in a WebMCP-capable browser.
