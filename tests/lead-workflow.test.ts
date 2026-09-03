import assert from 'node:assert/strict';
import test from 'node:test';

import {
  acceptRescuePlan,
  clearRescuePlan,
  createInitialState,
  discardDraft,
  editDraftText,
  markOwnerReviewed,
  queueForOwnerReview,
  selectLead,
  setOwnerReplyCapacity,
  stageDraft,
  stageRescuePlan,
  WorkflowError,
} from '../lib/lead-workflow';

const mayaPlan = {
  expectedBriefRevision: 1,
  leadIds: ['lead-full-detail'],
  reason: 'Friday afternoon has the nearest stated time pressure.',
  citations: [
    {
      leadId: 'lead-full-detail',
      factsUsed: ['Friday afternoon', '2022 BMW X5'],
    },
  ],
};
const mayaDraft = {
  leadId: 'lead-full-detail',
  replyText:
    'Thanks, Maya. I have your Friday afternoon request and will check availability.',
  factsUsed: ['Friday afternoon'],
};

void test('starts with deterministic synthetic leads and an owner brief', () => {
  const state = createInitialState();
  assert.ok(state.leads.length >= 4);
  assert.equal(state.selectedLeadId, 'lead-paint-correction');
  assert.equal(
    state.leads.filter((lead) => lead.followUpAuthorized).length,
    state.leads.length - 1,
  );
  assert.equal(state.ownerBrief.maxUrgentReplies, 1);
  assert.equal(state.ownerBrief.responseWindowMinutes, 30);
  assert.equal(state.ownerBrief.revision, 1);
  assert.equal(state.rescuePlan, null);
  assert.equal(state.planCounter, 0);
  assert.equal(
    state.leads.some((lead) => /^\+?\d[\d\s()-]{7,}$/.test(lead.caller)),
    false,
  );
});

void test('rescue-plan revisions stay monotonic after an owner clears a plan', () => {
  let state = stageRescuePlan(createInitialState(), mayaPlan, 'agent');
  assert.equal(state.rescuePlan?.revision, 1);
  state = clearRescuePlan(state);
  state = stageRescuePlan(state, mayaPlan, 'agent');
  assert.equal(state.rescuePlan?.revision, 2);
});

void test('agent workflow requires owner acceptance and shares visible state', () => {
  let state = createInitialState();
  state = selectLead(state, 'lead-full-detail', 'agent');
  state = stageRescuePlan(state, mayaPlan, 'agent');
  assert.equal(state.rescuePlan?.status, 'proposed');
  assert.equal(state.activity[0].title, 'Rescue plan staged');
  state = acceptRescuePlan(state);
  assert.equal(state.rescuePlan?.status, 'accepted');
  state = stageDraft(state, mayaDraft, 'agent');
  assert.equal(state.drafts['lead-full-detail'].revision, 1);
  state = queueForOwnerReview(
    state,
    { leadId: 'lead-full-detail', expectedDraftRevision: 1 },
    'agent',
  );
  assert.equal(
    state.leads.find((lead) => lead.id === 'lead-full-detail')?.status,
    'awaiting_owner_review',
  );
  state = markOwnerReviewed(state, 'lead-full-detail');
  assert.equal(
    state.leads.find((lead) => lead.id === 'lead-full-detail')?.status,
    'reviewed',
  );
  state = discardDraft(state, 'lead-full-detail');
  assert.equal(state.drafts['lead-full-detail'], undefined);
  assert.equal(
    state.leads.find((lead) => lead.id === 'lead-full-detail')?.status,
    'new',
  );
});

void test('enforces capacity while allowing fewer leads than the maximum', () => {
  assert.throws(
    () =>
      stageRescuePlan(
        createInitialState(),
        { ...mayaPlan, leadIds: ['lead-full-detail', 'lead-paint-correction'] },
        'agent',
      ),
    (error) =>
      error instanceof WorkflowError && error.code === 'capacity_exceeded',
  );
  const twoSlots = setOwnerReplyCapacity(createInitialState(), 2);
  const oneLeadPlan = stageRescuePlan(
    twoSlots,
    { ...mayaPlan, expectedBriefRevision: 2 },
    'agent',
  );
  assert.deepEqual(oneLeadPlan.rescuePlan?.leadIds, ['lead-full-detail']);
});

void test('rejects duplicate, unauthorized, unsupported citations, and stale briefs', () => {
  const twoSlots = setOwnerReplyCapacity(createInitialState(), 2);
  assert.throws(
    () =>
      stageRescuePlan(
        twoSlots,
        {
          ...mayaPlan,
          expectedBriefRevision: 2,
          leadIds: ['lead-full-detail', 'lead-full-detail'],
          citations: [mayaPlan.citations[0], mayaPlan.citations[0]],
        },
        'agent',
      ),
    (error) =>
      error instanceof WorkflowError && error.code === 'duplicate_lead',
  );
  assert.throws(
    () =>
      stageRescuePlan(
        createInitialState(),
        {
          ...mayaPlan,
          leadIds: ['lead-no-follow-up'],
          citations: [
            {
              leadId: 'lead-no-follow-up',
              factsUsed: ['No follow-up request recorded'],
            },
          ],
        },
        'agent',
      ),
    (error) =>
      error instanceof WorkflowError && error.code === 'follow_up_required',
  );
  assert.throws(
    () =>
      stageRescuePlan(
        createInitialState(),
        {
          ...mayaPlan,
          citations: [
            {
              leadId: 'lead-full-detail',
              factsUsed: ['Confirmed Sunday appointment'],
            },
          ],
        },
        'agent',
      ),
    (error) =>
      error instanceof WorkflowError && error.code === 'unsupported_fact',
  );
  assert.throws(
    () =>
      stageRescuePlan(
        setOwnerReplyCapacity(createInitialState(), 2),
        mayaPlan,
        'agent',
      ),
    (error) =>
      error instanceof WorkflowError && error.code === 'stale_brief_revision',
  );
});

void test('agent drafts require the accepted plan but owner manual drafts remain allowed', () => {
  assert.throws(
    () => stageDraft(createInitialState(), mayaDraft, 'agent'),
    (error) =>
      error instanceof WorkflowError && error.code === 'owner_plan_required',
  );
  const ownerDraft = stageDraft(createInitialState(), mayaDraft, 'owner');
  assert.equal(ownerDraft.drafts['lead-full-detail'].revision, 1);
  let accepted = acceptRescuePlan(
    stageRescuePlan(createInitialState(), mayaPlan, 'agent'),
  );
  accepted = setOwnerReplyCapacity(accepted, 2);
  assert.throws(
    () => stageDraft(accepted, mayaDraft, 'agent'),
    (error) =>
      error instanceof WorkflowError && error.code === 'owner_plan_required',
  );
});

void test('an owner brief change blocks an agent from queueing an old planned draft', () => {
  let state = acceptRescuePlan(
    stageRescuePlan(createInitialState(), mayaPlan, 'agent'),
  );
  state = stageDraft(state, mayaDraft, 'agent');
  state = setOwnerReplyCapacity(state, 2);
  assert.equal(state.rescuePlan, null);
  assert.throws(
    () =>
      queueForOwnerReview(
        state,
        { leadId: 'lead-full-detail', expectedDraftRevision: 1 },
        'agent',
      ),
    (error) =>
      error instanceof WorkflowError && error.code === 'owner_plan_required',
  );
  const ownerQueued = queueForOwnerReview(
    state,
    { leadId: 'lead-full-detail', expectedDraftRevision: 1 },
    'owner',
  );
  assert.equal(
    ownerQueued.leads.find((lead) => lead.id === 'lead-full-detail')?.status,
    'awaiting_owner_review',
  );
});

void test('a replacement rescue plan makes the earlier agent draft stale', () => {
  let state = acceptRescuePlan(
    stageRescuePlan(createInitialState(), mayaPlan, 'agent'),
  );
  state = stageDraft(state, mayaDraft, 'agent');
  state = stageRescuePlan(state, mayaPlan, 'agent');
  state = acceptRescuePlan(state);
  assert.throws(
    () =>
      queueForOwnerReview(
        state,
        { leadId: 'lead-full-detail', expectedDraftRevision: 1 },
        'agent',
      ),
    (error) =>
      error instanceof WorkflowError && error.code === 'stale_rescue_plan',
  );
});

void test('blocks missing follow-up requests and stale draft revisions', () => {
  assert.throws(
    () =>
      stageDraft(
        createInitialState(),
        {
          leadId: 'lead-no-follow-up',
          replyText:
            'This message must never be staged without a follow-up request.',
          factsUsed: ['No follow-up request recorded'],
        },
        'owner',
      ),
    (error) =>
      error instanceof WorkflowError && error.code === 'follow_up_required',
  );
  const staged = stageDraft(createInitialState(), mayaDraft, 'owner');
  assert.throws(
    () =>
      queueForOwnerReview(
        staged,
        { leadId: 'lead-full-detail', expectedDraftRevision: 2 },
        'owner',
      ),
    (error) =>
      error instanceof WorkflowError && error.code === 'stale_revision',
  );
});

void test('reviewed draft cannot requeue until an owner edit creates a new revision', () => {
  let state = stageDraft(createInitialState(), mayaDraft, 'owner');
  state = queueForOwnerReview(
    state,
    { leadId: 'lead-full-detail', expectedDraftRevision: 1 },
    'owner',
  );
  state = markOwnerReviewed(state, 'lead-full-detail');
  assert.throws(
    () =>
      queueForOwnerReview(
        state,
        { leadId: 'lead-full-detail', expectedDraftRevision: 1 },
        'owner',
      ),
    (error) =>
      error instanceof WorkflowError && error.code === 'owner_review_complete',
  );
  state = editDraftText(
    state,
    'lead-full-detail',
    'Thanks, Maya. I have your Friday request and will check the updated options.',
  );
  state = stageDraft(
    state,
    { ...mayaDraft, replyText: state.editorText['lead-full-detail'] },
    'owner',
  );
  state = queueForOwnerReview(
    state,
    { leadId: 'lead-full-detail', expectedDraftRevision: 2 },
    'owner',
  );
  assert.equal(
    state.leads.find((lead) => lead.id === 'lead-full-detail')?.status,
    'awaiting_owner_review',
  );
});
