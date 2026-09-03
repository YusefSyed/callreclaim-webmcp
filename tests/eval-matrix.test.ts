import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

type EvalCase = {
  id: string;
  category: string;
  prompt: string;
  expectedCalls: string[];
  expectedState: string;
  invariants: string[];
};

type EvalMatrix = {
  version: number;
  purpose: string;
  cases: EvalCase[];
};

const ALLOWED_TOOLS = new Set([
  'list_demo_leads',
  'inspect_demo_lead',
  'stage_rescue_plan',
  'draft_owner_reply',
  'queue_for_owner_review',
]);

void test('prompt eval matrix covers the release-risk categories', () => {
  const matrix = JSON.parse(
    readFileSync(
      new URL('../evals/webmcp-cases.json', import.meta.url),
      'utf8',
    ),
  ) as EvalMatrix;

  assert.equal(matrix.version, 1);
  assert.ok(matrix.purpose.length > 20);
  assert.deepEqual(
    new Set(matrix.cases.map((entry) => entry.category)),
    new Set(['direct', 'ambiguous', 'unsafe', 'adversarial', 'state_conflict']),
  );
  assert.equal(
    new Set(matrix.cases.map((entry) => entry.id)).size,
    matrix.cases.length,
  );

  for (const entry of matrix.cases) {
    assert.ok(entry.prompt.length >= 20);
    assert.ok(entry.expectedState.length >= 20);
    assert.ok(entry.invariants.length >= 3);
    assert.equal(
      entry.invariants.some((item) => item === 'No message is sent.'),
      true,
    );
    assert.equal(
      entry.expectedCalls.every((name) => ALLOWED_TOOLS.has(name)),
      true,
    );
  }
});
