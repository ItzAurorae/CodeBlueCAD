import { useCallback, useEffect, useState } from 'react';
import { FileText, Plus, Search, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Citation } from '@/lib/types';
import { CITATION_STATUS_META, formatCurrency, timeAgo } from '@/lib/ui';
import { Button, Input } from '@/components/ui/Form';
import { CitationModal } from '@/components/records/CitationModal';

export function CitationsView() {
  const [citations, setCitations] = useState<Citation[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Citation | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('citations')
      .select('*')
      .order('created_at', { ascending: false });
    setCitations(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = query.trim()
    ? citations.filter((c) =>
        `${c.civilian_name} ${c.violation} ${c.officer_name} ${c.location}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      )
    : citations;

  const totalFines = filtered.reduce((sum, c) => sum + Number(c.fine_amount), 0);

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search citations…"
              className="pl-9"
            />
          </div>
          <span className="hidden text-xs text-slate-500 sm:block">
            Total fines: <span className="font-semibold text-slate-300">{formatCurrency(totalFines)}</span>
          </span>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          New Citation
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-ink-700 py-16 text-center">
          <FileText className="mb-3 h-10 w-10 text-ink-600" />
          <p className="text-sm text-slate-400">No citations found</p>
          <p className="text-xs text-slate-600">Issue a citation to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const s = CITATION_STATUS_META[c.status];
            return (
              <button
                key={c.id}
                onClick={() => setEditing(c)}
                className="flex w-full items-center gap-4 rounded-lg border border-ink-800 bg-ink-850 p-4 text-left transition hover:border-ink-600 hover:bg-ink-800"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink-900">
                  <FileText className="h-5 w-5 text-sky-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">
                    <span className="font-mono text-xs text-slate-500">#{c.citation_number}</span>{' '}
                    {c.civilian_name}
                  </p>
                  <p className="truncate text-xs text-slate-400">{c.violation}</p>
                  <p className="text-[11px] text-slate-600">
                    {c.officer_name && `By ${c.officer_name} · `}
                    {timeAgo(c.created_at)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {Number(c.fine_amount) > 0 && (
                    <p className="text-sm font-bold text-amber-300">{formatCurrency(Number(c.fine_amount))}</p>
                  )}
                  <span className={`mt-1 inline-block rounded border px-1.5 py-0.5 text-[10px] font-bold ${s.pill}`}>
                    {s.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {creating && (
        <CitationModal record={null} onClose={() => setCreating(false)} onSaved={load} />
      )}
      {editing && (
        <CitationModal record={editing} onClose={() => setEditing(null)} onSaved={load} />
      )}
    </div>
  );
}
