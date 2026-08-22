import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Plus, Search, Loader2, Car, User, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Bolo } from '@/lib/types';
import { PRIORITY_META, BOLO_STATUS_META, timeAgo } from '@/lib/ui';
import { Button, Input } from '@/components/ui/Form';
import { BoloModal } from '@/components/dispatch/BoloModal';

const BOLO_TYPE_ICON: Record<string, typeof User> = {
  person: User,
  vehicle: Car,
  item: Package,
  other: AlertTriangle,
};

export function BolosView() {
  const [bolos, setBolos] = useState<Bolo[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Bolo | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('bolos')
      .select('*')
      .order('created_at', { ascending: false });
    setBolos(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = query.trim()
    ? bolos.filter((b) =>
        `${b.title} ${b.description} ${b.subject_name} ${b.plate}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      )
    : bolos;

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search BOLOs…"
            className="pl-9"
          />
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          New BOLO
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-ink-700 py-16 text-center">
          <AlertTriangle className="mb-3 h-10 w-10 text-ink-600" />
          <p className="text-sm text-slate-400">No BOLOs found</p>
          <p className="text-xs text-slate-600">Create a BOLO to alert the department.</p>
        </div>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {filtered.map((b) => {
            const Icon = BOLO_TYPE_ICON[b.bolo_type] ?? AlertTriangle;
            const p = PRIORITY_META[b.priority] ?? PRIORITY_META[2];
            const s = BOLO_STATUS_META[b.status];
            return (
              <button
                key={b.id}
                onClick={() => setEditing(b)}
                className={`rounded-lg border p-4 text-left transition hover:border-ink-600 hover:bg-ink-800 ${
                  b.status === 'active'
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : 'border-ink-800 bg-ink-850'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0 text-amber-400" />
                  <span className="font-mono text-xs font-semibold text-slate-500">
                    {b.bolo_type}
                  </span>
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${p.bg} ${p.text}`}>
                    {p.label}
                  </span>
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${s.bg} ${s.text}`}>
                    {s.label}
                  </span>
                  <span className="ml-auto flex items-center gap-1 text-[11px] text-slate-500">
                    {timeAgo(b.created_at)}
                  </span>
                </div>
                <p className="mt-2 font-semibold text-white">{b.title}</p>
                {b.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-slate-400">{b.description}</p>
                )}
                {(b.plate || b.subject_name) && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    {b.plate && <span className="font-mono">{b.plate}</span>}
                    {b.plate && b.subject_name && ' · '}
                    {b.subject_name}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {creating && (
        <BoloModal record={null} onClose={() => setCreating(false)} onSaved={load} />
      )}
      {editing && (
        <BoloModal record={editing} onClose={() => setEditing(null)} onSaved={load} />
      )}
    </div>
  );
}
