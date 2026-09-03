import { DEMO_LEADS, type DemoLead, type LeadStatus } from '@/lib/demo-leads';

export type ActionSource = 'owner' | 'agent';

export type Draft = {
  text: string;
  factsUsed: string[];
  revision: number;
  queuedRevision: number | null;
};

export type Activity = {
  id: number;
  source: ActionSource;
  title: string;
  detail: string;
};

export type LeadDeskState = {
  leads: DemoLead[];
  selectedLeadId: string;
  drafts: Record<string, Draft>;
  editorText: Record<string, string>;
  activity: Activity[];
  eventCounter: number;
};

export class WorkflowError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'WorkflowError';
  }
}

export function createInitialState(): LeadDeskState {
  const leads = DEMO_LEADS.map((lead) => ({
    ...lead,
    facts: [...lead.facts],
    transcript: lead.transcript.map((message) => ({ ...message })),
  }));
  return {
    leads,
    selectedLeadId: DEMO_LEADS[0].id,
    drafts: {},
    editorText: Object.fromEntries(
      leads.map((lead) => [lead.id, defaultReplyForLead(lead)]),
    ),
    activity: [
      {
        id: 1,
        source: 'owner',
        title: 'Demo reset',
        detail: 'Four synthetic missed calls are ready for review.',
      },
    ],
    eventCounter: 1,
  };
}

function requireLead(state: LeadDeskState, leadId: string) {
  const lead = state.leads.find((candidate) => candidate.id === leadId);
  if (!lead) {
    throw new WorkflowError('lead_not_found', `No demo lead exists with id “${leadId}”.`);
  }
  return lead;
}

function addActivity(
  state: LeadDeskState,
  source: ActionSource,
  title: string,
  detail: string,
) {
  const id = state.eventCounter + 1;
  return {
    ...state,
    eventCounter: id,
    activity: [{ id, source, title, detail }, ...state.activity].slice(0, 8),
  };
}

function updateLeadStatus(state: LeadDeskState, leadId: string, status: LeadStatus) {
  return {
    ...state,
    leads: state.leads.map((lead) =>
      lead.id === leadId ? { ...lead, status } : lead,
    ),
  };
}

export function selectLead(
  state: LeadDeskState,
  leadId: string,
  source: ActionSource,
) {
  const lead = requireLead(state, leadId);
  return addActivity(
    { ...state, selectedLeadId: leadId },
    source,
    `Opened ${lead.caller}`,
    `${lead.service} · ${lead.reference}`,
  );
}

export function stageDraft(
  state: LeadDeskState,
  input: { leadId: string; replyText: string; factsUsed: string[] },
  source: ActionSource,
) {
  const lead = requireLead(state, input.leadId);
  const replyText = input.replyText.trim();
  if (!lead.consentVerified) {
    throw new WorkflowError(
      'consent_required',
      'A reply cannot be drafted because follow-up consent was not recorded.',
    );
  }
  if (replyText.length < 10) {
    throw new WorkflowError('draft_too_short', 'The draft must contain at least 10 characters.');
  }
  if (replyText.length > 480) {
    throw new WorkflowError('draft_too_long', 'The draft must be 480 characters or fewer.');
  }

  const allowedFacts = new Set(lead.facts);
  const factsUsed = [
    ...new Set(input.factsUsed.map((fact) => fact.trim()).filter(Boolean)),
  ];
  const unsupportedFact = factsUsed.find((fact) => !allowedFacts.has(fact));
  if (unsupportedFact) {
    throw new WorkflowError(
      'unsupported_fact',
      `“${unsupportedFact}” is not a verified fact for this lead.`,
    );
  }

  const revision = (state.drafts[lead.id]?.revision ?? 0) + 1;
  let next: LeadDeskState = {
    ...state,
    selectedLeadId: lead.id,
    drafts: {
      ...state.drafts,
      [lead.id]: { text: replyText, factsUsed, revision, queuedRevision: null },
    },
    editorText: { ...state.editorText, [lead.id]: replyText },
  };
  next = updateLeadStatus(next, lead.id, 'drafted');
  return addActivity(
    next,
    source,
    `Draft ${revision} staged`,
    `${lead.caller} · unsent and editable`,
  );
}

export function queueForOwnerReview(
  state: LeadDeskState,
  input: { leadId: string; expectedDraftRevision: number },
  source: ActionSource,
) {
  const lead = requireLead(state, input.leadId);
  const draft = state.drafts[lead.id];
  if (!draft) {
    throw new WorkflowError(
      'draft_required',
      'Stage a draft before queueing it for owner review.',
    );
  }
  if (draft.revision !== input.expectedDraftRevision) {
    throw new WorkflowError(
      'stale_revision',
      `Draft revision ${input.expectedDraftRevision} is stale; the current revision is ${draft.revision}.`,
    );
  }
  if ((state.editorText[lead.id] ?? '').trim() !== draft.text) {
    throw new WorkflowError(
      'unstaged_edits',
      'The owner has unstaged edits. Stage them as a new revision before queueing.',
    );
  }

  let next: LeadDeskState = {
    ...state,
    selectedLeadId: lead.id,
    drafts: {
      ...state.drafts,
      [lead.id]: { ...draft, queuedRevision: draft.revision },
    },
  };
  next = updateLeadStatus(next, lead.id, 'awaiting_owner_review');
  return addActivity(
    next,
    source,
    'Queued for owner review',
    `${lead.caller} · draft ${draft.revision} remains unsent`,
  );
}

export function markOwnerReviewed(state: LeadDeskState, leadId: string) {
  const lead = requireLead(state, leadId);
  const draft = state.drafts[lead.id];
  if (!draft?.queuedRevision) {
    throw new WorkflowError(
      'review_queue_required',
      'Queue the current draft before marking it reviewed.',
    );
  }
  const next = updateLeadStatus(state, lead.id, 'reviewed');
  return addActivity(next, 'owner', 'Owner reviewed draft', `${lead.caller} · still not sent`);
}

export function reopenDraftForOwnerEdit(state: LeadDeskState, leadId: string) {
  const lead = requireLead(state, leadId);
  const draft = state.drafts[lead.id];
  if (!draft) {
    throw new WorkflowError('draft_required', 'There is no draft to edit.');
  }
  let next: LeadDeskState = {
    ...state,
    drafts: {
      ...state.drafts,
      [lead.id]: { ...draft, queuedRevision: null },
    },
  };
  next = updateLeadStatus(next, lead.id, 'drafted');
  return addActivity(
    next,
    'owner',
    'Owner reopened draft',
    `${lead.caller} · stage the edit as a new revision before queueing`,
  );
}

export function editDraftText(
  state: LeadDeskState,
  leadId: string,
  text: string,
) {
  const lead = requireLead(state, leadId);
  if (!lead.consentVerified) {
    throw new WorkflowError(
      'consent_required',
      'A reply cannot be edited because follow-up consent was not recorded.',
    );
  }
  if (text.length > 480) {
    throw new WorkflowError('draft_too_long', 'The draft must be 480 characters or fewer.');
  }

  let next = state;
  if (
    state.drafts[lead.id] &&
    (lead.status === 'awaiting_owner_review' || lead.status === 'reviewed')
  ) {
    next = reopenDraftForOwnerEdit(state, leadId);
  }
  return {
    ...next,
    selectedLeadId: leadId,
    editorText: { ...next.editorText, [leadId]: text },
  };
}

export function discardDraft(state: LeadDeskState, leadId: string) {
  const lead = requireLead(state, leadId);
  if (!state.drafts[lead.id]) {
    throw new WorkflowError('draft_required', 'There is no draft to discard.');
  }
  const drafts = { ...state.drafts };
  delete drafts[lead.id];
  const next = updateLeadStatus(
    {
      ...state,
      drafts,
      editorText: { ...state.editorText, [lead.id]: '' },
    },
    lead.id,
    'new',
  );
  return addActivity(next, 'owner', 'Owner discarded draft', `${lead.caller} · no message was sent`);
}

export function defaultReplyForLead(lead: DemoLead) {
  if (!lead.consentVerified) return '';
  if (lead.id === 'lead-paint-correction') {
    return 'Thanks, Jordan — I have your request for a paint-correction estimate for the black SUV before Saturday. I’ll review the options and follow up with the best next step.';
  }
  if (lead.id === 'lead-full-detail') {
    return 'Thanks, Maya — I have the details for your BMW X5 full detail in Cupertino on Friday afternoon. I’ll check availability and follow up with the best option.';
  }
  return 'Thanks, Sam — I have your request for an interior refresh on the family minivan next week. I’ll review the schedule and follow up with available options.';
}
