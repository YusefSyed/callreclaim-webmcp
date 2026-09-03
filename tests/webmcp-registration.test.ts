import assert from 'node:assert/strict';
import test from 'node:test';

import {
  acceptRescuePlan,
  createInitialState,
  type LeadDeskState,
} from '../lib/lead-workflow';
import { registerWebMcpTools } from '../lib/register-webmcp-tools';

type CapturedTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute(input: unknown): unknown;
};

function assertPropertyDescriptions(schema: Record<string, unknown>) {
  const properties = (schema.properties ?? {}) as Record<
    string,
    { description?: string; items?: Record<string, unknown> }
  >;
  for (const [name, property] of Object.entries(properties)) {
    assert.ok(name.length <= 30);
    assert.equal(typeof property.description, 'string');
    assert.ok((property.description?.length ?? 0) <= 150);
    if (property.items && 'properties' in property.items) {
      assertPropertyDescriptions(property.items);
    }
  }
}

void test('registers five tools and executes the owner-constrained visible workflow', async () => {
  const originalDocument = globalThis.document;
  const tools: CapturedTool[] = [];
  const signals: AbortSignal[] = [];
  const statuses: string[] = [];
  let state = createInitialState();
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      modelContext: {
        registerTool(tool: CapturedTool, options?: { signal?: AbortSignal }) {
          tools.push(tool);
          if (options?.signal) signals.push(options.signal);
        },
      },
    },
  });
  try {
    const cleanup = registerWebMcpTools({
      getState: () => state,
      applyState(update: (current: LeadDeskState) => LeadDeskState) {
        state = update(state);
        return state;
      },
      onStatus(status) {
        statuses.push(status);
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.deepEqual(
      tools.map((tool) => tool.name),
      [
        'list_demo_leads',
        'inspect_demo_lead',
        'stage_rescue_plan',
        'draft_owner_reply',
        'queue_for_owner_review',
      ],
    );
    assert.deepEqual(statuses, ['registering', 'ready']);
    assert.equal(tools[0].annotations?.readOnlyHint, true);
    assert.equal(
      tools.slice(1).every((tool) => tool.annotations?.readOnlyHint === false),
      true,
    );
    assert.equal(
      tools
        .slice(0, 4)
        .every((tool) => tool.annotations?.untrustedContentHint === true),
      true,
    );
    assert.equal(tools[4].annotations?.untrustedContentHint, false);
    assert.equal(
      tools.every(
        (tool) => tool.name.length <= 30 && tool.description.length <= 500,
      ),
      true,
    );
    for (const tool of tools) assertPropertyDescriptions(tool.inputSchema);
    const list = (await tools[0].execute({})) as {
      leads: Array<{ id: string }>;
      ownerBrief: { revision: number };
      rescuePlan: unknown;
    };
    assert.equal(list.leads.length, state.leads.length);
    assert.equal(list.ownerBrief.revision, 1);
    assert.equal(list.rescuePlan, null);
    assert.ok(JSON.stringify(list).length <= 1500);
    const authorized = (await tools[0].execute({
      followUpAuthorized: true,
    })) as { leads: Array<{ followUpAuthorized: boolean }> };
    assert.equal(authorized.leads.length, state.leads.length - 1);
    assert.equal(
      authorized.leads.every((lead) => lead.followUpAuthorized),
      true,
    );
    const inspected = (await tools[1].execute({
      leadId: 'lead-paint-correction',
    })) as { recordedFacts: string[]; visibleStateUpdated: boolean };
    assert.equal(inspected.visibleStateUpdated, true);
    assert.deepEqual(inspected.recordedFacts, [
      'Black SUV',
      'Swirl marks',
      'Estimate requested',
      'Before noon today',
    ]);
    assert.ok(JSON.stringify(inspected).length <= 1500);
    const planned = (await tools[2].execute({
      expectedBriefRevision: 1,
      leadIds: ['lead-paint-correction'],
      reason:
        'The caller needs an estimate before noon today and has the highest sample job value.',
      citations: [
        {
          leadId: 'lead-paint-correction',
          factsUsed: ['Before noon today', 'Estimate requested'],
        },
      ],
    })) as { status: string; ownerMustAccept: boolean };
    assert.equal(planned.status, 'proposed');
    assert.equal(planned.ownerMustAccept, true);
    assert.ok(JSON.stringify(planned).length <= 1500);
    const planReadback = await tools[0].execute({});
    assert.ok(JSON.stringify(planReadback).length <= 1500);
    state = acceptRescuePlan(state);
    const drafted = (await tools[3].execute({
      leadId: 'lead-paint-correction',
      replyText:
        'Thanks, Jordan. I have your request for a paint-correction estimate on the black SUV before noon today. I will review the options.',
      factsUsed: ['Black SUV', 'Before noon today'],
    })) as { draftRevision: number; unsent: boolean };
    assert.equal(drafted.draftRevision, 1);
    assert.equal(drafted.unsent, true);
    assert.ok(JSON.stringify(drafted).length <= 1500);
    const queued = (await tools[4].execute({
      leadId: 'lead-paint-correction',
      expectedDraftRevision: 1,
    })) as { status: string; sent: boolean };
    assert.equal(queued.status, 'awaiting_owner_review');
    assert.equal(queued.sent, false);
    assert.ok(JSON.stringify(queued).length <= 1500);
    assert.equal(state.activity[0].source, 'agent');
    const adversarial = (await tools[1].execute({
      leadId: 'lead-agent-instruction',
    })) as { safetyNote: string | null; transcript: unknown[] };
    assert.match(adversarial.safetyNote ?? '', /untrusted/i);
    assert.ok(adversarial.transcript.length > 0);
    assert.ok(JSON.stringify(adversarial).length <= 1500);
    assert.throws(
      () =>
        tools[2].execute({
          expectedBriefRevision: 1,
          leadIds: ['lead-paint-correction'],
          reason: 'This is a valid reason for a plan.',
          citations: [
            {
              leadId: 'lead-paint-correction',
              factsUsed: ['Before noon today'],
              extra: true,
            },
          ],
        }),
      (error) =>
        error instanceof Error &&
        error.message.includes('Unexpected input field'),
    );
    assert.throws(
      () =>
        tools[3].execute({
          leadId: 'lead-no-follow-up',
          replyText: 'This must not be staged without a follow-up request.',
          factsUsed: ['No follow-up request recorded'],
        }),
      (error) =>
        error instanceof Error &&
        error.message.startsWith('follow_up_required:'),
    );
    cleanup();
    assert.equal(signals.length, 5);
    assert.equal(
      signals.every((signal) => signal.aborted),
      true,
    );
  } finally {
    if (originalDocument === undefined)
      Reflect.deleteProperty(globalThis, 'document');
    else
      Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: originalDocument,
      });
  }
});

void test('reports a synchronous registration error and aborts partial tools', () => {
  const originalDocument = globalThis.document;
  const statuses: string[] = [];
  const signals: AbortSignal[] = [];
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      modelContext: {
        registerTool(_tool: CapturedTool, options?: { signal?: AbortSignal }) {
          if (options?.signal) signals.push(options.signal);
          throw new Error('registration unavailable');
        },
      },
    },
  });

  try {
    const cleanup = registerWebMcpTools({
      getState: createInitialState,
      applyState: (update) => update(createInitialState()),
      onStatus: (status) => statuses.push(status),
    });
    assert.deepEqual(statuses, ['registering', 'error']);
    assert.equal(signals.length, 1);
    assert.equal(signals[0].aborted, true);
    cleanup();
  } finally {
    if (originalDocument === undefined)
      Reflect.deleteProperty(globalThis, 'document');
    else
      Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: originalDocument,
      });
  }
});

void test('reports unsupported browsers without registering a fake polyfill', () => {
  const originalDocument = globalThis.document;
  const statuses: string[] = [];
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {},
  });
  try {
    const cleanup = registerWebMcpTools({
      getState: createInitialState,
      applyState: (update) => update(createInitialState()),
      onStatus: (status) => statuses.push(status),
    });
    cleanup();
    assert.deepEqual(statuses, ['unsupported']);
  } finally {
    if (originalDocument === undefined)
      Reflect.deleteProperty(globalThis, 'document');
    else
      Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: originalDocument,
      });
  }
});
