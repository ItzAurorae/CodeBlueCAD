import { useEffect, useState } from 'react';
import {
  Activity,
  Radio,
  Siren,
  Gavel,
  Car,
  Users,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Bolo, Citation, Incident, Warrant } from '@/lib/types';
import {
  PRIORITY_META,
  CALL_STATUS_META,
  UNIT_STATUS_META,
  CITATION_STATUS_META,
  INCIDENT_STATUS_META,
  timeAgo,
} from '@/lib/ui';

export function Dashboard() {
  const { calls, units, assignments } = useData();
  const { profile } = useAuth();
  const [bolos, setBolos] = useState<Bolo[]>([]);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [warrants, setWarrants] = useState<Warrant[]>([]);

  useEffect(() => {
    (async () => {
      const [boloRes, citRes, incRes, warRes] = await Promise.all([
        supabase.from('bolos').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(5),
        supabase.from('citations').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('incidents').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('warrants').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(5),
      ]);
      setBolos(boloRes.data ?? []);
      setCitations(citRes.data ?? []);
      setIncidents(incRes.data ?? []);
      setWarrants(warRes.data ?? []);
    })();
  }, []);

  const activeCalls = calls.filter((c) => c.status !== 'closed');
  const pendingCalls = calls.filter((c) => c.status === 'pending');
  const onlineUnits = units.filter((u) => u.status !== 'offduty');
  const availableUnits = units.filter((u) => u.status === 'available');
  const p1Calls = activeCalls.filter((c) => c.priority === 1);
  const panicUnits = units.filter((u) => u.status === 'panic');

  const callsToday = calls.filter((c) => {
    const d = new Date(c.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  const closedToday = calls.filter((c) => {
    if (!c.closed_at) return false;
    const d = new Date(c.closed_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  const stats = [
    {
      label: 'Active Calls',
      value: activeCalls.length,
      sub: `${pendingCalls.length} pending`,
      icon: Siren,
      color: 'text-red-300',
      bg: 'bg-red-500/10',
      trend: p1Calls.length > 0 ? `${p1Calls.length} P1` : null,
    },
    {
      label: 'Units Online',
      value: onlineUnits.length,
      sub: `${availableUnits.length} available`,
      icon: Radio,
      color: 'text-emerald-300',
      bg: 'bg-emerald-500/10',
      trend: panicUnits.length > 0 ? `${panicUnits.length} panic` : null,
    },
    {
      label: 'Calls Today',
      value: callsToday,
      sub: `${closedToday} closed`,
      icon: TrendingUp,
      color: 'text-sky-300',
      bg: 'bg-sky-500/10',
      trend: null,
    },
    {
      label: 'Active BOLOs',
      value: bolos.length,
      sub: 'Be on the lookout',
      icon: AlertTriangle,
      color: 'text-amber-300',
      bg: 'bg-amber-500/10',
      trend: null,
    },
  ];

  const callTypeBreakdown = activeCalls.reduce((acc, c) => {
    acc[c.call_type] = (acc[c.call_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topCallTypes = Object.entries(callTypeBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxCallCount = topCallTypes[0]?.[1] || 1;

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <div>
        <h2 className="text-xl font-bold text-white">
          Welcome back, {profile?.name?.split(' ')[0] || 'Officer'}
        </h2>
        <p className="text-sm text-slate-500">
          {profile?.rank} · {profile?.department} · Badge #{profile?.badge_number || '—'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-xl border border-ink-800 bg-ink-850 p-4"
            >
              <div className="flex items-center justify-between">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.bg}`}>
                  <Icon className={`h-4.5 w-4.5 ${s.color}`} />
                </div>
                {s.trend && (
                  <span className={`text-xs font-semibold ${s.color}`}>
                    {s.trend}
                  </span>
                )}
              </div>
              <p className="mt-3 text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs font-medium text-slate-400">{s.label}</p>
              <p className="text-[11px] text-slate-600">{s.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-ink-800 bg-ink-850 p-4 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-brand-400" />
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-300">
              Active Calls
            </h3>
          </div>
          {activeCalls.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No active calls. All clear.
            </p>
          ) : (
            <div className="space-y-2">
              {activeCalls.slice(0, 6).map((call) => {
                const p = PRIORITY_META[call.priority] ?? PRIORITY_META[2];
                const s = CALL_STATUS_META[call.status];
                const assigned = assignments.filter((a) => a.call_id === call.id).length;
                return (
                  <div
                    key={call.id}
                    className="flex items-center gap-3 rounded-lg border border-ink-700 bg-ink-900 px-3 py-2.5"
                  >
                    <span className={`h-8 w-1 rounded-full ${p.bar}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">
                        <span className="font-mono text-xs text-slate-500">#{call.call_number}</span>{' '}
                        {call.title}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {call.call_type} · {call.location || 'No location'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${p.bg} ${p.text}`}>
                        {p.label}
                      </span>
                      <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${s.bg} ${s.text}`}>
                        {s.label}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Users className="h-3 w-3" />
                        {assigned}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-ink-800 bg-ink-850 p-4">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-brand-400" />
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-300">
              Call Type Breakdown
            </h3>
          </div>
          {topCallTypes.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No call data yet.
            </p>
          ) : (
            <div className="space-y-2.5">
              {topCallTypes.map(([type, count]) => (
                <div key={type}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-slate-300">{type}</span>
                    <span className="font-mono font-semibold text-slate-400">{count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-ink-700">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all"
                      style={{ width: `${(count / maxCallCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-ink-800 bg-ink-850 p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-300">
              Active BOLOs
            </h3>
          </div>
          {bolos.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No active BOLOs.</p>
          ) : (
            <div className="space-y-2">
              {bolos.map((b) => (
                <div key={b.id} className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                  <p className="text-sm font-semibold text-amber-200">{b.title}</p>
                  <p className="truncate text-xs text-slate-500">
                    {b.bolo_type} · {timeAgo(b.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-ink-800 bg-ink-850 p-4">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-sky-400" />
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-300">
              Recent Citations
            </h3>
          </div>
          {citations.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No citations issued.</p>
          ) : (
            <div className="space-y-2">
              {citations.map((c) => {
                const s = CITATION_STATUS_META[c.status];
                return (
                  <div key={c.id} className="flex items-center gap-2 rounded-lg bg-ink-900 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-200">
                        {c.civilian_name}
                      </p>
                      <p className="truncate text-xs text-slate-500">{c.violation}</p>
                    </div>
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${s.pill}`}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-ink-800 bg-ink-850 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Gavel className="h-4 w-4 text-red-400" />
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-300">
              Active Warrants
            </h3>
          </div>
          {warrants.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No active warrants.</p>
          ) : (
            <div className="space-y-2">
              {warrants.map((w) => (
                <div key={w.id} className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
                  <p className="text-sm font-semibold text-red-200">{w.subject_name}</p>
                  <p className="truncate text-xs text-slate-500">{w.reason}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-ink-800 bg-ink-850 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-brand-400" />
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-300">
            Recent Incidents
          </h3>
        </div>
        {incidents.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">No incidents filed.</p>
        ) : (
          <div className="space-y-2">
            {incidents.map((inc) => {
              const s = INCIDENT_STATUS_META[inc.status];
              return (
                <div key={inc.id} className="flex items-center gap-3 rounded-lg bg-ink-900 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      <span className="font-mono text-xs text-slate-500">#{inc.incident_number}</span>{' '}
                      {inc.title}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {inc.incident_type} · {inc.officer_name || 'Unknown'} · {timeAgo(inc.created_at)}
                    </p>
                  </div>
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${s.pill}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
