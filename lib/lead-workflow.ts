import { DEMO_LEADS, type DemoLead, type LeadStatus } from '@/lib/demo-leads';

export type ActionSource = 'owner' | 'agent';
export type Draft = {
  text: string;
  factsUsed: string[];
  revision: number;
  queuedRevision: number | null;
};
export type OwnerBrief = {
  maxUrgentReplies: 1 | 2;
  responseWindowMinutes: 30;
  priorityRule: string;
  revision: number;
};
export type RescuePlanCitation = { leadId: string; factsUsed: string[] };
export type RescuePlan = {
  leadIds: string[];
  reason: string;
  citations: RescuePlanCitation[];
  expectedBriefRevision: number;
  briefRevision: number;
  revision: number;
  status: 'proposed' | 'accepted';
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
  ownerBrief: OwnerBrief;
  rescuePlan: RescuePlan | null;
  planCounter: number;
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
    selectedLeadId: leads[0].id,
    drafts: {},
    editorText: Object.fromEntries(
      leads.map((lead) => [lead.id, defaultReplyForLead(lead)]),
    ),
    ownerBrief: {
      maxUrgentReplies: 1,
      responseWindowMinutes: 30,
      priorityRule: 'Prioritize time pressure, then sample job value.',
      revision: 1,
    },
    rescuePlan: null,
    planCounter: 0,
    activity: [
      {
        id: 1,
        source: 'owner',
        title: 'Demo reset',
        detail: `${leads.length} synthetic missed calls are ready for review.`,
      },
    ],
    eventCounter: 1,
  };
}

function requireLead(state: LeadDeskState, leadId: string) {
  const lead = state.leads.find((candidate) => candidate.id === leadId);
  if (!lead)
    throw new WorkflowError(
      'lead_not_found',
      `No demo lead exists with id "${leadId}".`,
    );
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

function updateLeadStatus(
  state: LeadDeskState,
  leadId: string,
  status: LeadStatus,
) {
  return {
    ...state,
    leads: state.leads.map((lead) =>
      lead.id === leadId ? { ...lead, status } : lead,
    ),
  };
}

function validateFacts(lead: DemoLead, facts: string[]) {
  const normalized = [
    ...new Set(facts.map((fact) => fact.trim()).filter(Boolean)),
  ];
  const allowedFacts = new Set(lead.facts);
  const unsupportedFact = normalized.find((fact) => !allowedFacts.has(fact));
  if (unsupportedFact)
    throw new WorkflowError(
      'unsupported_fact',
      `"${unsupportedFact}" is not a recorded fact for this lead.`,
    );
  return normalized;
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

export function setOwnerReplyCapacity(
  state: LeadDeskState,
  maxUrgentReplies: 1 | 2,
) {
  if (maxUrgentReplies !== 1 && maxUrgentReplies !== 2) {
    throw new WorkflowError(
      'invalid_capacity',
      'The owner can reserve one or two urgent reply slots.',
    );
  }
  if (state.ownerBrief.maxUrgentReplies === maxUrgentReplies) return state;
  const next = {
    ...state,
    ownerBrief: {
      ...state.ownerBrief,
      maxUrgentReplies,
      revision: state.ownerBrief.revision + 1,
    },
    rescuePlan: null,
  };
  return addActivity(
    next,
    'owner',
    'Owner updated reply capacity',
    `${maxUrgentReplies} urgent reply ${maxUrgentReplies === 1 ? 'slot' : 'slots'} in the next 30 minutes. Existing rescue plan cleared.`,
  );
}

export function stageRescuePlan(
  state: LeadDeskState,
  input: {
    expectedBriefRevision: number;
    leadIds: string[];
    reason: string;
    citations: RescuePlanCitation[];
  },
  source: ActionSource = 'agent',
) {
  if (input.expectedBriefRevision !== state.ownerBrief.revision) {
    throw new WorkflowError(
      'stale_brief_revision',
      `Owner brief revision ${input.expectedBriefRevision} is stale; the current revision is ${state.ownerBrief.revision}.`,
    );
  }
  const leadIds = input.leadIds.map((leadId) => leadId.trim()).filter(Boolean);
  if (
    leadIds.length === 0 ||
    leadIds.length > state.ownerBrief.maxUrgentReplies
  ) {
    throw new WorkflowError(
      'capacity_exceeded',
      `Select one to ${state.ownerBrief.maxUrgentReplies} lead${state.ownerBrief.maxUrgentReplies === 1 ? '' : 's'} for the owner's current reply capacity.`,
    );
  }
  if (new Set(leadIds).size !== leadIds.length)
    throw new WorkflowError(
      'duplicate_lead',
      'A rescue plan cannot include the same lead twice.',
    );
  if (input.citations.length !== leadIds.length)
    throw new WorkflowError(
      'citation_group_required',
      'Include exactly one citation group for every selected lead.',
    );
  const citationIds = input.citations.map((citation) => citation.leadId.trim());
  if (
    new Set(citationIds).size !== citationIds.length ||
    citationIds.length !== leadIds.length ||
    citationIds.some((leadId) => !leadIds.includes(leadId))
  ) {
    throw new WorkflowError(
      'citation_group_required',
      'Include exactly one citation group for every selected lead.',
    );
  }
  const reason = input.reason.trim();
  if (reason.length < 12)
    throw new WorkflowError(
      'plan_reason_too_short',
      'The rescue-plan reason must contain at least 12 characters.',
    );
  if (reason.length > 240)
    throw new WorkflowError(
      'plan_reason_too_long',
      'The rescue-plan reason must be 240 characters or fewer.',
    );
  const citations = leadIds.map((leadId) => {
    const lead = requireLead(state, leadId);
    if (!lead.followUpAuthorized) {
      throw new WorkflowError(
        'follow_up_required',
        'A rescue plan cannot select a lead without a recorded follow-up request.',
      );
    }
    const citation = input.citations.find(
      (candidate) => candidate.leadId.trim() === leadId,
    )!;
    const factsUsed = validateFacts(lead, citation.factsUsed);
    if (factsUsed.length === 0)
      throw new WorkflowError(
        'citation_required',
        'Each selected lead needs at least one recorded fact citation.',
      );
    return { leadId, factsUsed };
  });
  const plan: RescuePlan = {
    leadIds,
    reason,
    citations,
    expectedBriefRevision: input.expectedBriefRevision,
    briefRevision: state.ownerBrief.revision,
    revision: state.planCounter + 1,
    status: 'proposed',
  };
  return addActivity(
    { ...state, rescuePlan: plan, planCounter: plan.revision },
    source,
    'Rescue plan staged',
    `${leadIds.length} selected lead${leadIds.length === 1 ? '' : 's'} await owner acceptance.`,
  );
}

export function acceptRescuePlan(state: LeadDeskState) {
  const plan = state.rescuePlan;
  if (!plan)
    throw new WorkflowError(
      'rescue_plan_required',
      'Stage a rescue plan before accepting it.',
    );
  if (plan.briefRevision !== state.ownerBrief.revision)
    throw new WorkflowError(
      'stale_rescue_plan',
      'This rescue plan is stale because the owner brief changed.',
    );
  if (plan.status === 'accepted') return state;
  return addActivity(
    {
      ...state,
      selectedLeadId: plan.leadIds[0],
      rescuePlan: { ...plan, status: 'accepted' },
    },
    'owner',
    'Owner accepted rescue plan',
    `${plan.leadIds.length} selected lead${plan.leadIds.length === 1 ? '' : 's'} may now receive an unsent draft.`,
  );
}

export function clearRescuePlan(state: LeadDeskState) {
  if (!state.rescuePlan) return state;
  return addActivity(
    { ...state, rescuePlan: null },
    'owner',
    'Owner cleared rescue plan',
    'No agent-authored draft can proceed until the owner accepts a new plan.',
  );
}

export function stageDraft(
  state: LeadDeskState,
  input: { leadId: string; replyText: string; factsUsed: string[] },
  source: ActionSource,
) {
  const lead = requireLead(state, input.leadId);
  const replyText = input.replyText.trim();
  if (!lead.followUpAuthorized)
    throw new WorkflowError(
      'follow_up_required',
      'A reply cannot be drafted because no follow-up request was recorded.',
    );
  if (source === 'agent') {
    const plan = state.rescuePlan;
    if (
      !plan ||
      plan.status !== 'accepted' ||
      plan.briefRevision !== state.ownerBrief.revision ||
      !plan.leadIds.includes(lead.id)
    ) {
      throw new WorkflowError(
        'owner_plan_required',
        'An agent can draft only after the owner accepts a current rescue plan for this lead.',
      );
    }
  }
  if (replyText.length < 10)
    throw new WorkflowError(
      'draft_too_short',
      'The draft must contain at least 10 characters.',
    );
  if (replyText.length > 480)
    throw new WorkflowError(
      'draft_too_long',
      'The draft must be 480 characters or fewer.',
    );
  const factsUsed = validateFacts(lead, input.factsUsed);
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
  if (!draft)
    throw new WorkflowError(
      'draft_required',
      'Stage a draft before queueing it for owner review.',
    );
  if (lead.status === 'reviewed' && draft.queuedRevision === draft.revision) {
    throw new WorkflowError(
      'owner_review_complete',
      'The owner already reviewed this revision. Stage a new revision before queueing it again.',
    );
  }
  if (draft.revision !== input.expectedDraftRevision)
    throw new WorkflowError(
      'stale_revision',
      `Draft revision ${input.expectedDraftRevision} is stale; the current revision is ${draft.revision}.`,
    );
  if ((state.editorText[lead.id] ?? '').trim() !== draft.text)
    throw new WorkflowError(
      'unstaged_edits',
      'The owner has unstaged edits. Stage them as a new revision before queueing.',
    );
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
  if (!draft?.queuedRevision)
    throw new WorkflowError(
      'review_queue_required',
      'Queue the current draft before marking it reviewed.',
    );
  return addActivity(
    updateLeadStatus(state, lead.id, 'reviewed'),
    'owner',
    'Owner reviewed draft',
    `${lead.caller} · still not sent`,
  );
}

export function reopenDraftForOwnerEdit(state: LeadDeskState, leadId: string) {
  const lead = requireLead(state, leadId);
  const draft = state.drafts[lead.id];
  if (!draft)
    throw new WorkflowError('draft_required', 'There is no draft to edit.');
  const next = updateLeadStatus(
    {
      ...state,
      drafts: {
        ...state.drafts,
        [lead.id]: { ...draft, queuedRevision: null },
      },
    },
    lead.id,
    'drafted',
  );
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
  if (!lead.followUpAuthorized)
    throw new WorkflowError(
      'follow_up_required',
      'A reply cannot be edited because no follow-up request was recorded.',
    );
  if (text.length > 480)
    throw new WorkflowError(
      'draft_too_long',
      'The draft must be 480 characters or fewer.',
    );
  let next = state;
  if (
    state.drafts[lead.id] &&
    (lead.status === 'awaiting_owner_review' || lead.status === 'reviewed')
  )
    next = reopenDraftForOwnerEdit(state, leadId);
  return {
    ...next,
    selectedLeadId: leadId,
    editorText: { ...next.editorText, [leadId]: text },
  };
}

export function discardDraft(state: LeadDeskState, leadId: string) {
  const lead = requireLead(state, leadId);
  if (!state.drafts[lead.id])
    throw new WorkflowError('draft_required', 'There is no draft to discard.');
  const drafts = { ...state.drafts };
  delete drafts[lead.id];
  const next = updateLeadStatus(
    { ...state, drafts, editorText: { ...state.editorText, [lead.id]: '' } },
    lead.id,
    'new',
  );
  return addActivity(
    next,
    'owner',
    'Owner discarded draft',
    `${lead.caller} · no message was sent`,
  );
}

export function defaultReplyForLead(lead: DemoLead) {
  if (!lead.followUpAuthorized) return '';
  if (lead.id === 'lead-paint-correction')
    return 'Thanks, Jordan. I have your request for a paint-correction estimate for the black SUV before noon today. I will review the options and follow up with the best next step.';
  if (lead.id === 'lead-full-detail')
    return 'Thanks, Maya. I have the details for your BMW X5 full detail in Cupertino on Friday afternoon. I will check availability and follow up with the best option.';
  if (lead.id === 'lead-agent-instruction')
    return 'Thanks, Taylor. I have your ceramic-coating question for a new crossover in Sunnyvale next month. I will review the options and follow up.';
  return 'Thanks, Sam. I have your request for an interior refresh on the family minivan next week. I will review the schedule and follow up with available options.';
}
