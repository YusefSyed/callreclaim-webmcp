'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  Check,
  CheckCircle2,
  Clock3,
  MessageSquareText,
  PhoneIncoming,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { type DemoLead } from '@/lib/demo-leads';
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
  type LeadDeskState,
  WorkflowError,
} from '@/lib/lead-workflow';
import {
  registerWebMcpTools,
  type WebMcpRegistrationStatus,
} from '@/lib/register-webmcp-tools';

function ageLabel(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function money(value: number | null) {
  return value === null ? 'Not available' : `$${value.toLocaleString()}`;
}

function statusLabel(status: DemoLead['status']) {
  if (status === 'awaiting_owner_review') return 'Owner review';
  if (status === 'reviewed') return 'Reviewed';
  if (status === 'drafted') return 'Draft ready';
  return 'New';
}

export function LeadDesk() {
  const [state, setState] = useState(createInitialState);
  const stateRef = useRef(state);
  const [notice, setNotice] = useState<string | null>(null);
  const [webMcpStatus, setWebMcpStatus] =
    useState<WebMcpRegistrationStatus>('registering');
  const [webMcpDetail, setWebMcpDetail] = useState(
    'Checking this browser for WebMCP support.',
  );
  const selected =
    state.leads.find((lead) => lead.id === state.selectedLeadId) ??
    state.leads[0];
  const draft = state.drafts[selected.id];
  const draftText = state.editorText[selected.id] ?? '';
  const hasUnstagedEdits = Boolean(draft && draftText.trim() !== draft.text);
  const plannedLeads = (state.rescuePlan?.leadIds ?? [])
    .map((leadId) => state.leads.find((lead) => lead.id === leadId))
    .filter((lead): lead is DemoLead => Boolean(lead));
  const selectedPlanFacts = new Set(
    state.rescuePlan?.citations.find(
      (citation) => citation.leadId === selected.id,
    )?.factsUsed ?? [],
  );
  const selectedDraftFacts = new Set(draft?.factsUsed ?? []);
  const selectedIsInAcceptedPlan = Boolean(
    state.rescuePlan?.status === 'accepted' &&
    state.rescuePlan.leadIds.includes(selected.id),
  );

  const rankedLeads = useMemo(
    () =>
      [...state.leads].sort(
        (left, right) =>
          (right.opportunityValue ?? 0) - (left.opportunityValue ?? 0),
      ),
    [state.leads],
  );

  const applyState = useCallback(
    (update: (current: LeadDeskState) => LeadDeskState) => {
      const next = update(stateRef.current);
      stateRef.current = next;
      setState(next);
      setNotice(null);
      return next;
    },
    [],
  );

  const commit = useCallback(
    (update: (current: LeadDeskState) => LeadDeskState) => {
      try {
        return applyState(update);
      } catch (error) {
        setNotice(
          error instanceof WorkflowError
            ? error.message
            : 'That action could not be completed.',
        );
        return undefined;
      }
    },
    [applyState],
  );

  useEffect(
    () =>
      registerWebMcpTools({
        getState: () => stateRef.current,
        applyState,
        onStatus: (status, detail) => {
          setWebMcpStatus(status);
          if (detail) setWebMcpDetail(detail);
        },
      }),
    [applyState],
  );

  function openLead(lead: DemoLead) {
    const next = commit((current) => selectLead(current, lead.id, 'owner'));
    if (!next) return;
  }

  function handleStageDraft() {
    commit((current) =>
      stageDraft(
        current,
        {
          leadId: selected.id,
          replyText: draftText,
          factsUsed: [],
        },
        'owner',
      ),
    );
  }

  function handleDraftChange(value: string) {
    commit((current) => editDraftText(current, selected.id, value));
  }

  function handleCapacityChange(maxUrgentReplies: 1 | 2) {
    commit((current) => setOwnerReplyCapacity(current, maxUrgentReplies));
  }

  function resetDemo() {
    const next = createInitialState();
    stateRef.current = next;
    setState(next);
    setNotice(null);
  }

  const webMcpLabel =
    webMcpStatus === 'ready'
      ? '5 site tools ready'
      : webMcpStatus === 'registering'
        ? 'Registering site tools'
        : webMcpStatus === 'unsupported'
          ? 'Open in a WebMCP browser'
          : 'Site tools need attention';
  const webMcpDot =
    webMcpStatus === 'ready'
      ? 'bg-emerald-600'
      : webMcpStatus === 'error'
        ? 'bg-amber-500'
        : 'bg-stone-400';

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0a0d0b]/95 text-white backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-signal text-[#10160d] shadow-[0_0_24px_rgba(201,255,95,0.2)]">
              <PhoneIncoming className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold tracking-tight">
                  CallReclaim
                </p>
                <span className="hidden text-white/30 sm:inline">/</span>
                <p className="hidden text-xs text-white/60 sm:block">
                  Agent rescue desk
                </p>
              </div>
              <p className="truncate text-[11px] text-white/45">
                Harbor Detail Co. · entirely synthetic
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              className="hidden border-white/10 bg-white/5 text-white/70 md:flex"
              variant="outline"
            >
              <ShieldCheck data-icon="inline-start" /> Nothing can send
            </Badge>
            <Button
              className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              onClick={resetDemo}
              size="sm"
              variant="outline"
            >
              <RefreshCw data-icon="inline-start" /> Reset
            </Button>
          </div>
        </div>
      </header>

      <section className="border-b border-border bg-paper-deep/80">
        <div className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-center lg:px-8">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
              Shared live workspace
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-[-0.025em] sm:text-2xl">
              Find the missed call worth handling first.
            </h1>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-ink/55">
              Try: “I have time for one reply in the next 30 minutes. Compare
              the authorized leads and stage a rescue plan from the recorded
              facts.”
            </p>
            <span
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-900/10 bg-white px-3 py-1.5 text-xs text-muted-foreground"
              title={webMcpDetail}
            >
              <span className={`size-1.5 rounded-full ${webMcpDot}`} />
              <span aria-live="polite">WebMCP · {webMcpLabel}</span>
            </span>
          </div>
          <div className="rounded-2xl border border-ink/10 bg-white/80 p-4 shadow-[0_12px_35px_rgba(17,32,23,0.05)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-800">
                  Owner brief · revision {state.ownerBrief.revision}
                </p>
                <p className="mt-1 text-sm font-semibold">
                  I can handle up to {state.ownerBrief.maxUrgentReplies}{' '}
                  {state.ownerBrief.maxUrgentReplies === 1
                    ? 'reply'
                    : 'replies'}{' '}
                  in the next {state.ownerBrief.responseWindowMinutes} minutes.
                </p>
              </div>
              <ShieldCheck className="size-5 shrink-0 text-emerald-800" />
            </div>
            <div className="mt-3 flex items-center gap-2">
              {([1, 2] as const).map((capacity) => (
                <Button
                  aria-pressed={state.ownerBrief.maxUrgentReplies === capacity}
                  className={
                    state.ownerBrief.maxUrgentReplies === capacity
                      ? 'h-8 bg-ink text-white hover:bg-ink/90'
                      : 'h-8 border-ink/10 bg-transparent text-ink hover:bg-paper-deep'
                  }
                  disabled={state.ownerBrief.maxUrgentReplies === capacity}
                  key={capacity}
                  onClick={() => handleCapacityChange(capacity)}
                  size="sm"
                  variant={
                    state.ownerBrief.maxUrgentReplies === capacity
                      ? 'default'
                      : 'outline'
                  }
                >
                  {capacity} {capacity === 1 ? 'reply' : 'replies'}
                </Button>
              ))}
              <span className="ml-auto text-[10px] text-ink/45">
                Owner controlled
              </span>
            </div>
            <p className="mt-3 border-t border-ink/10 pt-3 text-[11px] leading-4 text-ink/55">
              {state.ownerBrief.priorityRule}
            </p>
          </div>
        </div>
      </section>

      <section
        className={`border-b ${
          state.rescuePlan?.status === 'accepted'
            ? 'border-emerald-900/15 bg-emerald-950 text-white'
            : 'border-border bg-white'
        }`}
      >
        <div className="mx-auto max-w-[1600px] px-4 py-3 sm:px-6 lg:px-8">
          {state.rescuePlan ? (
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={`font-mono text-[9px] font-semibold uppercase tracking-[0.16em] ${
                      state.rescuePlan.status === 'accepted'
                        ? 'text-mint'
                        : 'text-emerald-800'
                    }`}
                  >
                    {state.rescuePlan.status === 'accepted'
                      ? 'Owner accepted plan'
                      : 'Agent proposed plan'}{' '}
                    · revision {state.rescuePlan.revision}
                  </p>
                  <Badge
                    className={
                      state.rescuePlan.status === 'accepted'
                        ? 'border-white/15 bg-white/10 text-white'
                        : 'border-ink/10 bg-paper text-ink'
                    }
                    variant="outline"
                  >
                    {plannedLeads.length}{' '}
                    {plannedLeads.length === 1 ? 'reply slot' : 'reply slots'}
                  </Badge>
                </div>
                <p className="mt-1 text-sm font-medium leading-5">
                  {state.rescuePlan.reason}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {plannedLeads.map((lead) => (
                    <button
                      className={`rounded-xl border px-3 py-2 text-left text-[11px] font-medium ${
                        state.rescuePlan?.status === 'accepted'
                          ? 'border-white/15 bg-white/10 text-white'
                          : 'border-ink/10 bg-paper text-ink'
                      }`}
                      key={lead.id}
                      onClick={() => openLead(lead)}
                      type="button"
                    >
                      <span className="block">
                        {lead.caller} · {lead.service}
                      </span>
                      <span
                        className={`mt-0.5 block text-[10px] font-normal ${
                          state.rescuePlan?.status === 'accepted'
                            ? 'text-white/55'
                            : 'text-ink/50'
                        }`}
                      >
                        {state.rescuePlan?.citations
                          .find((citation) => citation.leadId === lead.id)
                          ?.factsUsed.join(' · ')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                {state.rescuePlan.status === 'proposed' ? (
                  <Button
                    className="bg-signal font-semibold text-[#10160d] hover:bg-[#dcff96]"
                    onClick={() => commit(acceptRescuePlan)}
                    size="sm"
                  >
                    <Check data-icon="inline-start" /> Use this plan
                  </Button>
                ) : (
                  <Badge className="bg-signal text-[#10160d]">
                    <Check data-icon="inline-start" /> Agent drafting unlocked
                  </Badge>
                )}
                <Button
                  className={
                    state.rescuePlan.status === 'accepted'
                      ? 'border-white/15 text-white hover:bg-white/10 hover:text-white'
                      : 'border-ink/10 text-ink hover:bg-paper-deep'
                  }
                  onClick={() => commit(clearRescuePlan)}
                  size="sm"
                  variant="outline"
                >
                  Clear
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-800">
                  Rescue plan
                </p>
                <p className="mt-0.5 text-xs text-ink/55">
                  Waiting for the agent to compare the inbox and cite its
                  choice.
                </p>
              </div>
              <Badge
                className="w-fit border-ink/10 bg-paper text-ink"
                variant="outline"
              >
                Owner acceptance required before agent drafting
              </Badge>
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto grid max-w-[1600px] grid-cols-[minmax(0,1fr)] gap-px bg-border lg:grid-cols-[280px_minmax(0,1fr)_340px] xl:grid-cols-[310px_minmax(0,1fr)_370px]">
        <aside className="min-w-0 bg-background lg:min-h-[calc(100vh-260px)]">
          <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
            <div>
              <p className="text-sm font-semibold">Missed-call inbox</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {state.leads.filter((lead) => lead.followUpAuthorized).length}{' '}
                authorized · ranked by sample job value
              </p>
            </div>
            <Badge className="bg-foreground text-background">
              {state.leads.length}
            </Badge>
          </div>
          <div
            className="flex w-full min-w-0 gap-px overflow-x-auto bg-border lg:block lg:divide-y lg:divide-border"
            aria-label="Synthetic missed calls"
          >
            {rankedLeads.map((lead) => {
              const active = selected.id === lead.id;
              const inPlan = state.rescuePlan?.leadIds.includes(lead.id);
              return (
                <button
                  className={`group min-w-[220px] flex-none px-4 py-3 text-left transition sm:min-w-[245px] sm:px-5 lg:w-full lg:min-w-0 lg:py-4 ${
                    active
                      ? 'bg-ink text-white'
                      : 'bg-background hover:bg-paper-deep'
                  }`}
                  key={lead.id}
                  onClick={() => openLead(lead)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`size-2 rounded-full ${
                            lead.urgency === 'high'
                              ? 'bg-amber-400'
                              : lead.urgency === 'medium'
                                ? 'bg-sky-400'
                                : 'bg-stone-400'
                          }`}
                        />
                        <p className="truncate text-sm font-semibold">
                          {lead.caller}
                        </p>
                      </div>
                      <p
                        className={`mt-1 truncate text-xs ${
                          active ? 'text-white/55' : 'text-muted-foreground'
                        }`}
                      >
                        {lead.service}
                      </p>
                    </div>
                    <span
                      className={`font-mono text-[10px] ${
                        active ? 'text-signal' : 'text-muted-foreground'
                      }`}
                    >
                      {ageLabel(lead.ageMinutes)}
                    </span>
                  </div>
                  <p
                    className={`mt-3 hidden line-clamp-2 text-xs leading-5 sm:block ${
                      active ? 'text-white/70' : 'text-foreground/70'
                    }`}
                  >
                    {lead.summary}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${
                        active ? 'text-white/45' : 'text-muted-foreground'
                      }`}
                    >
                      {inPlan ? 'In rescue plan' : statusLabel(lead.status)}
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        active ? 'text-signal' : 'text-emerald-800'
                      }`}
                    >
                      {money(lead.opportunityValue)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="min-w-0 bg-paper p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-3xl">
            <div className="flex flex-col justify-between gap-4 border-b border-ink/10 pb-6 sm:flex-row sm:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className="border-ink/10 bg-white text-ink"
                    variant="outline"
                  >
                    {selected.reference}
                  </Badge>
                  <Badge
                    className={
                      selected.followUpAuthorized
                        ? 'bg-emerald-950 text-mint'
                        : 'bg-amber-100 text-amber-950'
                    }
                  >
                    {selected.followUpAuthorized ? (
                      <Check data-icon="inline-start" />
                    ) : (
                      <AlertTriangle data-icon="inline-start" />
                    )}
                    {selected.followUpAuthorized
                      ? 'Follow-up requested'
                      : 'No follow-up request'}
                  </Badge>
                </div>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                  {selected.service}
                </h2>
                <p className="mt-1 text-sm text-ink/55">
                  {selected.caller} · received {selected.receivedAt}
                </p>
              </div>
              <div className="rounded-xl border border-ink/10 bg-white/70 px-4 py-3 text-left sm:text-right">
                <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-ink/45">
                  Sample job value
                </p>
                <p className="mt-1 text-xl font-semibold text-emerald-800">
                  {money(selected.opportunityValue)}
                </p>
              </div>
            </div>

            <div className="py-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Conversation</p>
                  <p className="text-xs text-ink/45">Conversation record</p>
                </div>
                <Badge
                  className="border-ink/10 bg-transparent text-ink/60"
                  variant="outline"
                >
                  <MessageSquareText data-icon="inline-start" />{' '}
                  {selected.transcript.length} events
                </Badge>
              </div>
              <div className="space-y-3">
                {selected.transcript.map((message) => (
                  <article
                    className={`max-w-[88%] rounded-2xl border px-4 py-3 ${
                      message.speaker === 'caller'
                        ? 'ml-auto border-emerald-900/10 bg-emerald-950 text-white'
                        : message.speaker === 'business'
                          ? 'border-ink/10 bg-white'
                          : 'max-w-full border-dashed border-ink/15 bg-transparent'
                    }`}
                    key={message.id}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p
                        className={`font-mono text-[9px] font-semibold uppercase tracking-[0.14em] ${
                          message.speaker === 'caller'
                            ? 'text-mint'
                            : 'text-ink/45'
                        }`}
                      >
                        {message.speaker === 'caller'
                          ? selected.caller
                          : message.speaker === 'business'
                            ? 'Harbor Detail Co.'
                            : 'Follow-up record'}
                      </p>
                      <span
                        className={`text-[10px] ${
                          message.speaker === 'caller'
                            ? 'text-white/45'
                            : 'text-ink/35'
                        }`}
                      >
                        {message.time}
                      </span>
                    </div>
                    <p
                      className={`mt-2 text-sm leading-6 ${
                        message.speaker === 'system' ? 'text-ink/60' : ''
                      }`}
                    >
                      {message.text}
                    </p>
                  </article>
                ))}
              </div>
              {selected.agentSafetyNote ? (
                <div
                  className="mt-4 flex items-start gap-3 rounded-xl border border-amber-700/20 bg-amber-50 px-3 py-3 text-amber-950"
                  role="note"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold">
                      Untrusted caller text
                    </p>
                    <p className="mt-1 text-xs leading-5 text-amber-950/70">
                      {selected.agentSafetyNote}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="grid gap-px overflow-hidden rounded-2xl border border-ink/10 bg-ink/10 sm:grid-cols-3">
              {[
                ['Intent', selected.intent],
                ['Timing', selected.timing],
                ['Location', selected.location],
              ].map(([label, value]) => (
                <div className="bg-white/65 px-4 py-4" key={label}>
                  <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-ink/40">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="bg-[#101512] p-4 text-white sm:p-6 lg:min-h-[calc(100vh-260px)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-signal">
                Owner checkpoint
              </p>
              <h2 className="mt-1 text-lg font-semibold">
                Draft for owner review
              </h2>
            </div>
            <span className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-mint">
              <UserRound className="size-4" aria-hidden="true" />
            </span>
          </div>

          <div
            className={`mt-4 rounded-xl border px-3 py-2 text-[11px] leading-5 ${
              selectedIsInAcceptedPlan
                ? 'border-mint/20 bg-mint/10 text-mint'
                : 'border-white/10 bg-white/[0.04] text-white/45'
            }`}
          >
            {selectedIsInAcceptedPlan
              ? 'Owner accepted this lead for agent drafting.'
              : 'Agent drafting stays locked until this lead is in an accepted plan.'}
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-white/70">
              <Bot className="size-4 text-mint" /> Recorded details
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {selected.facts.map((fact) => (
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] ${
                    selectedDraftFacts.has(fact)
                      ? 'border-signal/30 bg-signal/15 text-signal'
                      : selectedPlanFacts.has(fact)
                        ? 'border-mint/25 bg-mint/10 text-mint'
                        : 'border-white/10 bg-white/5 text-white/70'
                  }`}
                  key={fact}
                  title={
                    selectedDraftFacts.has(fact)
                      ? 'Declared citation in the current draft'
                      : selectedPlanFacts.has(fact)
                        ? 'Declared citation in the rescue plan'
                        : 'Recorded fact'
                  }
                >
                  {fact}
                </span>
              ))}
            </div>
            {selectedDraftFacts.size > 0 || selectedPlanFacts.size > 0 ? (
              <p className="mt-3 text-[10px] leading-4 text-white/40">
                Highlighted details are declared citations. The owner still
                reviews the reply text.
              </p>
            ) : null}
          </div>

          <div className="mt-5">
            <label
              className="text-xs font-semibold text-white/80"
              htmlFor="owner-draft"
            >
              Editable reply draft
            </label>
            <Textarea
              className="mt-2 min-h-32 resize-none border-white/10 bg-black/20 text-sm leading-6 text-white placeholder:text-white/30 focus-visible:border-mint/60 focus-visible:ring-mint/15"
              disabled={!selected.followUpAuthorized}
              id="owner-draft"
              maxLength={480}
              onChange={(event) => handleDraftChange(event.target.value)}
              placeholder={
                selected.followUpAuthorized
                  ? 'Prepare a reply from the recorded details.'
                  : 'Drafting is blocked without a follow-up request.'
              }
              value={draftText}
            />
            <div className="mt-2 flex items-center justify-between text-[10px] text-white/35">
              <span>Unsent · owner editable</span>
              <span>{draftText.length}/480</span>
            </div>
          </div>

          {notice ? (
            <p
              className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs leading-5 text-amber-100"
              role="alert"
            >
              {notice}
            </p>
          ) : null}

          <div className="mt-4 grid gap-2">
            <Button
              className="h-10 bg-signal font-semibold text-[#10160d] hover:bg-[#dcff96]"
              disabled={!selected.followUpAuthorized || !draftText.trim()}
              onClick={handleStageDraft}
            >
              <Sparkles data-icon="inline-start" /> Save owner draft
            </Button>
            <Button
              className="h-10 border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              disabled={
                !draft ||
                selected.status === 'awaiting_owner_review' ||
                selected.status === 'reviewed' ||
                hasUnstagedEdits
              }
              onClick={() =>
                draft &&
                commit((current) =>
                  queueForOwnerReview(
                    current,
                    {
                      leadId: selected.id,
                      expectedDraftRevision: draft.revision,
                    },
                    'owner',
                  ),
                )
              }
              variant="outline"
            >
              <ArrowUpRight data-icon="inline-start" /> Queue for my review
            </Button>
          </div>

          {hasUnstagedEdits ? (
            <p className="mt-2 text-[11px] leading-5 text-signal/80">
              Save this edit before queueing it for review.
            </p>
          ) : null}

          {selected.status === 'awaiting_owner_review' ? (
            <div className="mt-4 rounded-2xl border border-mint/20 bg-mint/10 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold text-mint">
                <CheckCircle2 className="size-4" /> Waiting for owner
              </p>
              <p className="mt-1 text-xs leading-5 text-white/55">
                The agent&apos;s work stops here. Review or discard manually.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  className="bg-white text-ink hover:bg-white/85"
                  onClick={() =>
                    commit((current) => markOwnerReviewed(current, selected.id))
                  }
                  size="sm"
                >
                  Mark reviewed
                </Button>
                <Button
                  className="border-white/10 text-white hover:bg-white/10 hover:text-white"
                  onClick={() =>
                    commit((current) => discardDraft(current, selected.id))
                  }
                  size="sm"
                  variant="outline"
                >
                  Discard
                </Button>
              </div>
            </div>
          ) : null}

          <div className="mt-7 border-t border-white/10 pt-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-white/70">
                Shared activity
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] text-white/35">
                <Clock3 className="size-3" /> latest first
              </span>
            </div>
            <ol className="mt-3 space-y-3">
              {state.activity.slice(0, 4).map((item) => (
                <li className="grid grid-cols-[22px_1fr] gap-2.5" key={item.id}>
                  <span
                    className={`mt-0.5 grid size-5 place-items-center rounded-full ${
                      item.source === 'agent'
                        ? 'bg-mint/15 text-mint'
                        : 'bg-white/10 text-white/60'
                    }`}
                  >
                    {item.source === 'agent' ? (
                      <Bot className="size-3" />
                    ) : (
                      <UserRound className="size-3" />
                    )}
                  </span>
                  <div>
                    <p className="text-xs font-medium text-white/75">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-4 text-white/35">
                      {item.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-6 flex items-start gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-[11px] leading-5 text-white/45">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-mint" />
            Challenge demo: every record is fictional, and no outside service is
            connected.
          </div>
        </aside>
      </div>
    </main>
  );
}
