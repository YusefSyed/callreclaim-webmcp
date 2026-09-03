import { type DemoLead, type LeadStatus, type LeadUrgency } from '@/lib/demo-leads';
import {
  queueForOwnerReview,
  selectLead,
  stageDraft,
  type LeadDeskState,
  WorkflowError,
} from '@/lib/lead-workflow';

export type WebMcpRegistrationStatus =
  | 'registering'
  | 'ready'
  | 'unsupported'
  | 'error';

type RegistrationActions = {
  getState(): LeadDeskState;
  applyState(update: (state: LeadDeskState) => LeadDeskState): LeadDeskState;
  onStatus(status: WebMcpRegistrationStatus, detail?: string): void;
};

type InputRecord = Record<string, unknown>;

const LEAD_STATUSES: LeadStatus[] = [
  'new',
  'drafted',
  'awaiting_owner_review',
  'reviewed',
];
const LEAD_URGENCIES: LeadUrgency[] = ['high', 'medium', 'low'];

function record(input: unknown): InputRecord {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Tool input must be a JSON object.');
  }
  return input as InputRecord;
}

function rejectExtraKeys(input: InputRecord, allowed: string[]) {
  const extras = Object.keys(input).filter((key) => !allowed.includes(key));
  if (extras.length > 0) {
    throw new TypeError(`Unexpected input field${extras.length === 1 ? '' : 's'}: ${extras.join(', ')}.`);
  }
}

function requiredString(input: InputRecord, key: string, maxLength: number) {
  const value = input[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${key} must be a non-empty string.`);
  }
  if (value.length > maxLength) {
    throw new TypeError(`${key} must be ${maxLength} characters or fewer.`);
  }
  return value.trim();
}

function optionalEnum<T extends string>(
  input: InputRecord,
  key: string,
  values: readonly T[],
) {
  const value = input[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !values.includes(value as T)) {
    throw new TypeError(`${key} must be one of: ${values.join(', ')}.`);
  }
  return value as T;
}

function requiredInteger(input: InputRecord, key: string, minimum: number) {
  const value = input[key];
  if (!Number.isInteger(value) || (value as number) < minimum) {
    throw new TypeError(`${key} must be an integer greater than or equal to ${minimum}.`);
  }
  return value as number;
}

function requiredStringArray(
  input: InputRecord,
  key: string,
  maxItems: number,
) {
  const value = input[key];
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > maxItems ||
    value.some((item) => typeof item !== 'string' || !item.trim())
  ) {
    throw new TypeError(
      `${key} must be a non-empty array of up to ${maxItems} non-empty strings.`,
    );
  }
  return value.map((item) => (item as string).trim());
}

function leadSummary(lead: DemoLead, revision: number | null) {
  return {
    id: lead.id,
    caller: lead.caller,
    reference: lead.reference,
    service: lead.service,
    summary: lead.summary,
    urgency: lead.urgency,
    ageMinutes: lead.ageMinutes,
    consentVerified: lead.consentVerified,
    opportunityValue: lead.opportunityValue,
    status: lead.status,
    draftRevision: revision,
  };
}

function runWorkflow<T>(run: () => T) {
  try {
    return run();
  } catch (error) {
    if (error instanceof WorkflowError) {
      throw new Error(`${error.code}: ${error.message}`);
    }
    throw error;
  }
}

export function registerWebMcpTools(actions: RegistrationActions) {
  const context =
    typeof document === 'undefined' ? undefined : document.modelContext;
  if (!context?.registerTool) {
    actions.onStatus(
      'unsupported',
      'Open this page in a browser with WebMCP site tools enabled.',
    );
    return () => undefined;
  }

  const lifecycle = new AbortController();
  actions.onStatus('registering', 'Registering four page-scoped tools.');

  const tools: WebMcpToolDefinition[] = [
    {
      name: 'list_demo_leads',
      title: 'List demo leads',
      description:
        'List the bounded synthetic missed-call leads visible in the CallReclaim rescue desk. Use this first to compare urgency, consent, age, sample job value, and current review status. This tool never reads real customer data.',
      inputSchema: {
        type: 'object',
        properties: {
          urgency: {
            type: 'string',
            enum: LEAD_URGENCIES,
            description: 'Return leads with this urgency only.',
          },
          status: {
            type: 'string',
            enum: LEAD_STATUSES,
            description: 'Return leads in this workflow state only.',
          },
          consentVerified: {
            type: 'boolean',
            description: 'Filter by whether one follow-up message was authorized.',
          },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute(input) {
        const parsed = record(input);
        rejectExtraKeys(parsed, ['urgency', 'status', 'consentVerified']);
        const urgency = optionalEnum(parsed, 'urgency', LEAD_URGENCIES);
        const status = optionalEnum(parsed, 'status', LEAD_STATUSES);
        if (
          parsed.consentVerified !== undefined &&
          typeof parsed.consentVerified !== 'boolean'
        ) {
          throw new TypeError('consentVerified must be a boolean.');
        }

        const state = actions.getState();
        const leads = state.leads
          .filter((lead) => !urgency || lead.urgency === urgency)
          .filter((lead) => !status || lead.status === status)
          .filter(
            (lead) =>
              parsed.consentVerified === undefined ||
              lead.consentVerified === parsed.consentVerified,
          )
          .sort(
            (left, right) =>
              (right.opportunityValue ?? 0) - (left.opportunityValue ?? 0),
          )
          .map((lead) =>
            leadSummary(lead, state.drafts[lead.id]?.revision ?? null),
          );

        return {
          demo: true,
          count: leads.length,
          leads,
          selectedLeadId: state.selectedLeadId,
          safety: 'Synthetic records only. No send tool exists.',
        };
      },
    },
    {
      name: 'inspect_demo_lead',
      title: 'Inspect demo lead',
      description:
        'Open one synthetic lead in the visible desk and return its exact transcript and verified facts. Use the returned facts to ground a proposed reply; do not invent customer details.',
      inputSchema: {
        type: 'object',
        properties: {
          leadId: {
            type: 'string',
            minLength: 1,
            maxLength: 80,
            description: 'Stable lead id returned by list_demo_leads.',
          },
        },
        required: ['leadId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute(input) {
        const parsed = record(input);
        rejectExtraKeys(parsed, ['leadId']);
        const leadId = requiredString(parsed, 'leadId', 80);
        const next = runWorkflow(() =>
          actions.applyState((state) => selectLead(state, leadId, 'agent')),
        );
        const lead = next.leads.find((candidate) => candidate.id === leadId)!;
        return {
          demo: true,
          selectedLeadId: lead.id,
          caller: lead.caller,
          reference: lead.reference,
          service: lead.service,
          consentVerified: lead.consentVerified,
          verifiedFacts: lead.facts,
          transcript: lead.transcript,
          currentDraftRevision: next.drafts[lead.id]?.revision ?? null,
          visibleStateUpdated: true,
        };
      },
    },
    {
      name: 'draft_owner_reply',
      title: 'Draft owner reply',
      description:
        'Stage an editable, explicitly unsent reply for a consented synthetic lead. Pass only facts returned by inspect_demo_lead. This updates the visible owner checkpoint but cannot approve or send a message.',
      inputSchema: {
        type: 'object',
        properties: {
          leadId: {
            type: 'string',
            minLength: 1,
            maxLength: 80,
            description: 'Stable lead id returned by list_demo_leads.',
          },
          replyText: {
            type: 'string',
            minLength: 10,
            maxLength: 480,
            description: 'Proposed reply to stage. It remains editable and unsent.',
          },
          factsUsed: {
            type: 'array',
            items: { type: 'string', minLength: 1, maxLength: 80 },
            minItems: 1,
            maxItems: 8,
            description: 'Exact fact entries returned by inspect_demo_lead.',
          },
        },
        required: ['leadId', 'replyText', 'factsUsed'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute(input) {
        const parsed = record(input);
        rejectExtraKeys(parsed, ['leadId', 'replyText', 'factsUsed']);
        const leadId = requiredString(parsed, 'leadId', 80);
        const replyText = requiredString(parsed, 'replyText', 480);
        const factsUsed = requiredStringArray(parsed, 'factsUsed', 8);
        const next = runWorkflow(() =>
          actions.applyState((state) =>
            stageDraft(state, { leadId, replyText, factsUsed }, 'agent'),
          ),
        );
        const draft = next.drafts[leadId];
        return {
          demo: true,
          leadId,
          status: 'drafted',
          draftRevision: draft.revision,
          replyText: draft.text,
          factsUsed: draft.factsUsed,
          unsent: true,
          ownerCanEdit: true,
          visibleStateUpdated: true,
        };
      },
    },
    {
      name: 'queue_for_owner_review',
      title: 'Queue for owner review',
      description:
        'Move the exact current synthetic draft into the visible owner-review queue. Requires its revision so a stale agent cannot queue an overwritten draft. This tool cannot approve or send anything.',
      inputSchema: {
        type: 'object',
        properties: {
          leadId: {
            type: 'string',
            minLength: 1,
            maxLength: 80,
            description: 'Stable lead id whose draft should enter owner review.',
          },
          expectedDraftRevision: {
            type: 'integer',
            minimum: 1,
            description: 'Current revision returned by draft_owner_reply.',
          },
        },
        required: ['leadId', 'expectedDraftRevision'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const parsed = record(input);
        rejectExtraKeys(parsed, ['leadId', 'expectedDraftRevision']);
        const leadId = requiredString(parsed, 'leadId', 80);
        const expectedDraftRevision = requiredInteger(
          parsed,
          'expectedDraftRevision',
          1,
        );
        const next = runWorkflow(() =>
          actions.applyState((state) =>
            queueForOwnerReview(
              state,
              { leadId, expectedDraftRevision },
              'agent',
            ),
          ),
        );
        return {
          demo: true,
          leadId,
          status: next.leads.find((lead) => lead.id === leadId)?.status,
          queuedDraftRevision: expectedDraftRevision,
          sent: false,
          nextAction: 'The owner may now edit, review, or discard the draft manually.',
          visibleStateUpdated: true,
        };
      },
    },
  ];

  Promise.all(
    tools.map((tool) =>
      Promise.resolve(
        context.registerTool(tool, { signal: lifecycle.signal }),
      ),
    ),
  )
    .then(() => {
      if (!lifecycle.signal.aborted) {
        actions.onStatus('ready', 'Exactly four WebMCP site tools are ready.');
      }
    })
    .catch((error: unknown) => {
      if (!lifecycle.signal.aborted) {
        actions.onStatus(
          'error',
          error instanceof Error ? error.message : 'Tool registration failed.',
        );
      }
    });

  return () => lifecycle.abort();
}
