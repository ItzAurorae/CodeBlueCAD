import type {
  BoloStatus,
  CallStatus,
  CitationStatus,
  IncidentStatus,
  IncidentType,
  LicenseStatus,
  PenalCategory,
  RegStatus,
  UnitStatus,
  WeaponRegStatus,
  WarrantStatus,
} from '@/lib/types';

export const UNIT_STATUS_META: Record<
  UnitStatus,
  { label: string; dot: string; text: string; bg: string }
> = {
  available: {
    label: 'Available',
    dot: 'bg-emerald-400',
    text: 'text-emerald-300',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
  },
  busy: {
    label: 'Busy',
    dot: 'bg-amber-400',
    text: 'text-amber-300',
    bg: 'bg-amber-500/10 border-amber-500/30',
  },
  enroute: {
    label: 'En Route',
    dot: 'bg-sky-400',
    text: 'text-sky-300',
    bg: 'bg-sky-500/10 border-sky-500/30',
  },
  onscene: {
    label: 'On Scene',
    dot: 'bg-brand-400',
    text: 'text-brand-400',
    bg: 'bg-brand-500/10 border-brand-500/30',
  },
  panic: {
    label: 'Panic',
    dot: 'bg-red-500 animate-pulse-ring',
    text: 'text-red-300',
    bg: 'bg-red-500/15 border-red-500/40',
  },
  offduty: {
    label: 'Off Duty',
    dot: 'bg-slate-500',
    text: 'text-slate-400',
    bg: 'bg-slate-500/10 border-slate-500/30',
  },
};

export const CALL_STATUS_META: Record<
  CallStatus,
  { label: string; text: string; bg: string }
> = {
  pending: {
    label: 'Pending',
    text: 'text-amber-300',
    bg: 'bg-amber-500/10 border-amber-500/30',
  },
  active: {
    label: 'Active',
    text: 'text-emerald-300',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
  },
  closed: {
    label: 'Closed',
    text: 'text-slate-400',
    bg: 'bg-slate-500/10 border-slate-500/30',
  },
};

export const PRIORITY_META: Record<
  number,
  { label: string; text: string; bg: string; bar: string }
> = {
  1: {
    label: 'P1',
    text: 'text-red-300',
    bg: 'bg-red-500/10 border-red-500/40',
    bar: 'bg-red-500',
  },
  2: {
    label: 'P2',
    text: 'text-amber-300',
    bg: 'bg-amber-500/10 border-amber-500/40',
    bar: 'bg-amber-500',
  },
  3: {
    label: 'P3',
    text: 'text-sky-300',
    bg: 'bg-sky-500/10 border-sky-500/40',
    bar: 'bg-sky-500',
  },
};

export const STATUS_PILL: Record<
  LicenseStatus | RegStatus | WarrantStatus,
  string
> = {
  valid: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  suspended: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  revoked: 'bg-red-500/10 text-red-300 border-red-500/30',
  none: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  expired: 'bg-red-500/10 text-red-300 border-red-500/30',
  active: 'bg-red-500/10 text-red-300 border-red-500/30',
  served: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
};

export const BOLO_STATUS_META: Record<
  BoloStatus,
  { label: string; text: string; bg: string }
> = {
  active: {
    label: 'Active',
    text: 'text-red-300',
    bg: 'bg-red-500/10 border-red-500/30',
  },
  cancelled: {
    label: 'Cancelled',
    text: 'text-slate-400',
    bg: 'bg-slate-500/10 border-slate-500/30',
  },
};

export const WEAPON_REG_META: Record<
  WeaponRegStatus,
  { label: string; pill: string }
> = {
  registered: {
    label: 'Registered',
    pill: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  },
  unregistered: {
    label: 'Unregistered',
    pill: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  },
  stolen: {
    label: 'Stolen',
    pill: 'bg-red-500/10 text-red-300 border-red-500/30',
  },
};

export const CITATION_STATUS_META: Record<
  CitationStatus,
  { label: string; pill: string }
> = {
  pending: {
    label: 'Pending',
    pill: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  },
  paid: {
    label: 'Paid',
    pill: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  },
  contested: {
    label: 'Contested',
    pill: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  },
  dismissed: {
    label: 'Dismissed',
    pill: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  },
};

export const INCIDENT_STATUS_META: Record<
  IncidentStatus,
  { label: string; pill: string }
> = {
  draft: {
    label: 'Draft',
    pill: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  },
  submitted: {
    label: 'Submitted',
    pill: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  },
  approved: {
    label: 'Approved',
    pill: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  },
  rejected: {
    label: 'Rejected',
    pill: 'bg-red-500/10 text-red-300 border-red-500/30',
  },
};

export const INCIDENT_TYPE_META: Record<
  IncidentType,
  { label: string; icon: string }
> = {
  arrest: { label: 'Arrest', icon: 'Handcuffs' },
  incident: { label: 'Incident', icon: 'FileText' },
  'field-contact': { label: 'Field Contact', icon: 'Users' },
  'use-of-force': { label: 'Use of Force', icon: 'Swords' },
};

export const PENAL_CATEGORY_META: Record<
  PenalCategory,
  { label: string; pill: string }
> = {
  felony: {
    label: 'Felony',
    pill: 'bg-red-500/10 text-red-300 border-red-500/30',
  },
  misdemeanor: {
    label: 'Misdemeanor',
    pill: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  },
  infraction: {
    label: 'Infraction',
    pill: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  },
};

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
