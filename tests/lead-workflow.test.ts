import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createInitialState,
  discardDraft,
  editDraftText,
  markOwnerReviewed,
  queueForOwnerReview,
  selectLead,
  stageDraft,
  WorkflowError,
} from '../lib/lead-workflow';

void test('starts with four deterministic synthetic leads', () => {
  const state = createInitialState();
  assert.equal(state.leads.length, 4);
  assert.equal(state.selectedLeadId, 'lead-paint-correction');
  assert.equal(state.leads.filter((lead) => lead.consentVerified).length, 3);
  assert.equal(state.leads.some((lead) => /^\+?\d[\d\s()-]{7,}$/.test(lead.caller)), false);
});

void test('select, draft, queue, and owner review share one state machine', () => {
  let state = createInitialState();
  state = selectLead(state, 'lead-full-detail', 'agent');
  state = stageDraft(
    state,
    {
      leadId: 'lead-full-detail',
      replyText:
        'Thanks, Maya — I have your BMW X5 full-detail request for Friday afternoon in Cupertino. I will check availability for you.',
      factsUsed: ['2022 BMW X5', 'Friday afternoon', 'Cupertino'],
    },
    'agent',
  );

  assert.equal(state.drafts['lead-full-detail'].revision, 1);
  assert.equal(state.leads.find((lead) => lead.id === 'lead-full-detail')?.status, 'drafted');

  state = queueForOwnerReview(
    state,
    { leadId: 'lead-full-detail', expectedDraftRevision: 1 },
    'agent',
  );
  assert.equal(
    state.leads.find((lead) => lead.id === 'lead-full-detail')?.status,
    'awaiting_owner_review',
  );
  assert.equal(state.drafts['lead-full-detail'].queuedRevision, 1);

  state = markOwnerReviewed(state, 'lead-full-detail');
  assert.equal(state.leads.find((lead) => lead.id === 'lead-full-detail')?.status, 'reviewed');
  assert.equal(state.activity[0].source, 'owner');

  state = discardDraft(state, 'lead-full-detail');
  assert.equal(state.drafts['lead-full-detail'], undefined);
  assert.equal(state.leads.find((lead) => lead.id === 'lead-full-detail')?.status, 'new');
});

void test('blocks drafting when follow-up consent is missing', () => {
  assert.throws(
    () =>
      stageDraft(
        createInitialState(),
        {
          leadId: 'lead-no-consent',
          replyText: 'This message must never be staged for the unconsented caller.',
          factsUsed: ['No consent recorded'],
        },
        'agent',
      ),
    (error) =>
      error instanceof WorkflowError && error.code === 'consent_required',
  );
});

void test('blocks unsupported facts and stale draft revisions', () => {
  assert.throws(
    () =>
      stageDraft(
        createInitialState(),
        {
          leadId: 'lead-full-detail',
          replyText: 'I have your confirmed Sunday appointment and deposit on file.',
          factsUsed: ['Confirmed Sunday appointment'],
        },
        'agent',
      ),
    (error) =>
      error instanceof WorkflowError && error.code === 'unsupported_fact',
  );

  const staged = stageDraft(
    createInitialState(),
    {
      leadId: 'lead-full-detail',
      replyText: 'Thanks, Maya — I have your Friday afternoon request and will check availability.',
      factsUsed: ['Friday afternoon'],
    },
    'agent',
  );
  assert.throws(
    () =>
      queueForOwnerReview(
        staged,
        { leadId: 'lead-full-detail', expectedDraftRevision: 2 },
        'agent',
      ),
    (error) =>
      error instanceof WorkflowError && error.code === 'stale_revision',
  );
});

void test('owner editing reopens a queued draft and requires a new revision', () => {
  let state = stageDraft(
    createInitialState(),
    {
      leadId: 'lead-full-detail',
      replyText: 'Thanks, Maya — I have your Friday afternoon request and will check availability.',
      factsUsed: ['Friday afternoon'],
    },
    'agent',
  );
  state = queueForOwnerReview(
    state,
    { leadId: 'lead-full-detail', expectedDraftRevision: 1 },
    'agent',
  );
  state = editDraftText(
    state,
    'lead-full-detail',
    'Thanks, Maya — I have your Friday request and will check the updated options.',
  );

  assert.equal(state.drafts['lead-full-detail'].queuedRevision, null);
  assert.equal(state.leads.find((lead) => lead.id === 'lead-full-detail')?.status, 'drafted');
  assert.equal(state.activity[0].source, 'owner');
  assert.throws(
    () =>
      queueForOwnerReview(
        state,
        { leadId: 'lead-full-detail', expectedDraftRevision: 1 },
        'agent',
      ),
    (error) =>
      error instanceof WorkflowError && error.code === 'unstaged_edits',
  );
});
