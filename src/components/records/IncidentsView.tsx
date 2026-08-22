import { useCallback, useEffect, useState } from 'react';
import { FileText, Plus, Search, Loader2, ShieldAlert, Users, Swords } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Incident } from '@/lib/types';
import { INCIDENT_STATUS_META, INCIDENT_TYPE_META, timeAgo } from '@/lib/ui';
import { Button, Input } from '@/components/ui/Form';
import { IncidentModal } from '@/components/records/IncidentModal';

const TYPE_ICON: Record<string, typeof FileText> = {
  arrest: ShieldAlert,
  incident: FileText,
  'field-contact': Users,
  'use-of-force': Swords,
};

export function IncidentsView() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editing, setEditing] = useState<Incident | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false });
    setIncidents(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = incidents.filter((i) => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    if (!query.trim()) return true;
    return `${i.title} ${i.involved_parties} ${i.location} ${i.officer_name}`
      .toLowerCase()
      .includes(query.toLowerCase());
  });

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search incidents…"
              className="pl-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-slate-300"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          New Report
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-ink-700 py-16 text-center">
          <FileText className="mb-3 h-10 w-10 text-ink-600" />
          <p className="text-sm text-slate-400">No incidents found</p>
          <p className="text-xs text-slate-600">File an incident report to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((inc) => {
            const s = INCIDENT_STATUS_META[inc.status];
            const tMeta = INCIDENT_TYPE_META[inc.incident_type];
            const Icon = TYPE_ICON[inc.incident_type] ?? FileText;
            return (
              <button
                key={inc.id}
                onClick={() => setEditing(inc)}
                className="flex w-full items-center gap-4 rounded-lg border border-ink-800 bg-ink-850 p-4 text-left transition hover:border-ink-600 hover:bg-ink-800"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink-900">
                  <Icon className="h-5 w-5 text-brand-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">
                    <span className="font-mono text-xs text-slate-500">#{inc.incident_number}</span>{' '}
                    {inc.title}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {tMeta?.label ?? inc.incident_type}
                    {inc.location && ` · ${inc.location}`}
                    {inc.officer_name && ` · ${inc.officer_name}`}
                  </p>
                  {inc.involved_parties && (
                    <p className="truncate text-[11px] text-slate-600">
                      Involved: {inc.involved_parties}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <span className={`mb-1 inline-block rounded border px-1.5 py-0.5 text-[10px] font-bold ${s.pill}`}>
                    {s.label}
                  </span>
                  <p className="text-[11px] text-slate-600">{timeAgo(inc.created_at)}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {creating && (
        <IncidentModal record={null} onClose={() => setCreating(false)} onSaved={load} />
      )}
      {editing && (
        <IncidentModal record={editing} onClose={() => setEditing(null)} onSaved={load} />
      )}
    </div>
  );
}
