import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createInitialState,
  type LeadDeskState,
  WorkflowError,
} from '../lib/lead-workflow';
import { registerWebMcpTools } from '../lib/register-webmcp-tools';

type CapturedTool = {
  name: string;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute(input: unknown): unknown;
};

void test('registers exactly four tools and executes the full visible workflow', async () => {
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
        'draft_owner_reply',
        'queue_for_owner_review',
      ],
    );
    assert.deepEqual(statuses, ['registering', 'ready']);
    assert.equal(tools[0].annotations?.readOnlyHint, true);
    assert.equal(tools.slice(1).every((tool) => tool.annotations?.readOnlyHint === false), true);

    const list = (await tools[0].execute({ consentVerified: true })) as {
      count: number;
      leads: Array<{ id: string }>;
    };
    assert.equal(list.count, 3);

    const inspected = (await tools[1].execute({
      leadId: 'lead-paint-correction',
    })) as { verifiedFacts: string[]; visibleStateUpdated: boolean };
    assert.equal(inspected.visibleStateUpdated, true);
    assert.deepEqual(inspected.verifiedFacts, [
      'Black SUV',
      'Swirl marks',
      'Estimate requested',
      'Before Saturday',
    ]);

    const drafted = (await tools[2].execute({
      leadId: 'lead-paint-correction',
      replyText:
        'Thanks, Jordan — I have your request for a paint-correction estimate on the black SUV before Saturday. I will review the options.',
      factsUsed: ['Black SUV', 'Before Saturday'],
    })) as { draftRevision: number; unsent: boolean };
    assert.equal(drafted.draftRevision, 1);
    assert.equal(drafted.unsent, true);

    const queued = (await tools[3].execute({
      leadId: 'lead-paint-correction',
      expectedDraftRevision: 1,
    })) as { status: string; sent: boolean };
    assert.equal(queued.status, 'awaiting_owner_review');
    assert.equal(queued.sent, false);
    assert.equal(state.activity[0].source, 'agent');

    assert.throws(
      () =>
        tools[2].execute({
          leadId: 'lead-no-consent',
          replyText: 'This must not be staged because consent is absent.',
          factsUsed: ['No consent recorded'],
        }),
      (error) =>
        error instanceof WorkflowError && error.code === 'consent_required',
    );

    cleanup();
    assert.equal(signals.length, 4);
    assert.equal(signals.every((signal) => signal.aborted), true);
  } finally {
    if (originalDocument === undefined) {
      Reflect.deleteProperty(globalThis, 'document');
    } else {
      Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: originalDocument,
      });
    }
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
    if (originalDocument === undefined) {
      Reflect.deleteProperty(globalThis, 'document');
    } else {
      Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: originalDocument,
      });
    }
  }
});
