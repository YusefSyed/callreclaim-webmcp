export type LeadUrgency = 'high' | 'medium' | 'low';
export type LeadStatus = 'new' | 'drafted' | 'awaiting_owner_review' | 'reviewed';

export type TranscriptMessage = {
  id: string;
  speaker: 'business' | 'caller' | 'system';
  text: string;
  time: string;
};

export type DemoLead = {
  id: string;
  caller: string;
  reference: string;
  service: string;
  summary: string;
  intent: string;
  ageMinutes: number;
  receivedAt: string;
  urgency: LeadUrgency;
  status: LeadStatus;
  consentVerified: boolean;
  opportunityValue: number | null;
  location: string;
  timing: string;
  facts: string[];
  transcript: TranscriptMessage[];
};

export const DEMO_BUSINESS = 'Harbor Detail Co.';

export const DEMO_LEADS: DemoLead[] = [
  {
    id: 'lead-paint-correction',
    caller: 'Jordan Lee',
    reference: 'DEMO-204',
    service: 'Paint correction',
    summary: 'Black SUV with visible swirl marks; wants an estimate before Saturday.',
    intent: 'High intent',
    ageMinutes: 47,
    receivedAt: '9:18 AM',
    urgency: 'high',
    status: 'new',
    consentVerified: true,
    opportunityValue: 780,
    location: 'Cupertino',
    timing: 'Before Saturday',
    facts: ['Black SUV', 'Swirl marks', 'Estimate requested', 'Before Saturday'],
    transcript: [
      {
        id: 'pc-system',
        speaker: 'system',
        text: 'Missed call detected. Caller requested one follow-up text by pressing 1.',
        time: '9:18 AM',
      },
      {
        id: 'pc-business',
        speaker: 'business',
        text: 'Hi Jordan — this is Harbor Detail Co. Sorry we missed your call. What can we help with? Reply STOP to opt out.',
        time: '9:19 AM',
      },
      {
        id: 'pc-caller',
        speaker: 'caller',
        text: 'I have a black SUV with a lot of swirl marks. Could I get a paint-correction estimate before Saturday?',
        time: '9:23 AM',
      },
    ],
  },
  {
    id: 'lead-full-detail',
    caller: 'Maya Chen',
    reference: 'DEMO-101',
    service: 'Full detail',
    summary: '2022 BMW X5; Friday afternoon preferred.',
    intent: 'Ready to book',
    ageMinutes: 23,
    receivedAt: '9:42 AM',
    urgency: 'high',
    status: 'new',
    consentVerified: true,
    opportunityValue: 320,
    location: 'Cupertino',
    timing: 'Friday afternoon',
    facts: ['2022 BMW X5', 'Full detail', 'Friday afternoon', 'Cupertino'],
    transcript: [
      {
        id: 'fd-system',
        speaker: 'system',
        text: 'Missed call detected. Caller requested one follow-up text by pressing 1.',
        time: '9:42 AM',
      },
      {
        id: 'fd-business',
        speaker: 'business',
        text: 'Hi Maya — this is Harbor Detail Co. Sorry we missed your call. What can we help with? Reply STOP to opt out.',
        time: '9:43 AM',
      },
      {
        id: 'fd-caller',
        speaker: 'caller',
        text: 'I need a full detail for my black 2022 BMW X5. Friday afternoon in Cupertino works best.',
        time: '9:46 AM',
      },
    ],
  },
  {
    id: 'lead-interior',
    caller: 'Sam Rivera',
    reference: 'DEMO-319',
    service: 'Interior refresh',
    summary: 'Family minivan; flexible next week.',
    intent: 'Comparing options',
    ageMinutes: 138,
    receivedAt: '7:47 AM',
    urgency: 'medium',
    status: 'new',
    consentVerified: true,
    opportunityValue: 190,
    location: 'San Jose',
    timing: 'Next week',
    facts: ['Family minivan', 'Interior refresh', 'Next week', 'Flexible timing'],
    transcript: [
      {
        id: 'in-system',
        speaker: 'system',
        text: 'Missed call detected. Caller requested one follow-up text by pressing 1.',
        time: '7:47 AM',
      },
      {
        id: 'in-business',
        speaker: 'business',
        text: 'Hi Sam — this is Harbor Detail Co. Sorry we missed your call. What can we help with? Reply STOP to opt out.',
        time: '7:48 AM',
      },
      {
        id: 'in-caller',
        speaker: 'caller',
        text: 'Looking for an interior refresh on our family minivan sometime next week. I am flexible on timing.',
        time: '7:55 AM',
      },
    ],
  },
  {
    id: 'lead-no-consent',
    caller: 'Unknown caller',
    reference: 'DEMO-401',
    service: 'Unknown request',
    summary: 'Caller hung up without requesting a follow-up.',
    intent: 'No reply received',
    ageMinutes: 12,
    receivedAt: '9:53 AM',
    urgency: 'low',
    status: 'new',
    consentVerified: false,
    opportunityValue: null,
    location: 'Unknown',
    timing: 'Unknown',
    facts: ['No consent recorded', 'No customer reply'],
    transcript: [
      {
        id: 'nc-system',
        speaker: 'system',
        text: 'Missed call detected. No follow-up permission was recorded, so no message was sent.',
        time: '9:53 AM',
      },
    ],
  },
];
