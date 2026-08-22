import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Search, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { PenalCode, PenalCategory } from '@/lib/types';
import { PENAL_CATEGORY_META, formatCurrency } from '@/lib/ui';
import { Input } from '@/components/ui/Form';

export function PenalCodeView() {
  const [codes, setCodes] = useState<PenalCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('penal_codes')
      .select('*')
      .order('code', { ascending: true });
    setCodes(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = codes.filter((c) => {
    if (catFilter !== 'all' && c.category !== catFilter) return false;
    if (!query.trim()) return true;
    return `${c.code} ${c.title} ${c.description}`
      .toLowerCase()
      .includes(query.toLowerCase());
  });

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search penal codes…"
            className="pl-9"
          />
        </div>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-slate-300"
        >
          <option value="all">All Categories</option>
          <option value="felony">Felony</option>
          <option value="misdemeanor">Misdemeanor</option>
          <option value="infraction">Infraction</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-ink-700 py-16 text-center">
          <BookOpen className="mb-3 h-10 w-10 text-ink-600" />
          <p className="text-sm text-slate-400">No penal codes found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((pc) => {
            const cat = PENAL_CATEGORY_META[pc.category];
            return (
              <div
                key={pc.id}
                className="flex items-start gap-4 rounded-lg border border-ink-800 bg-ink-850 p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-brand-400">{pc.code}</span>
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${cat.pill}`}>
                      {cat.label}
                    </span>
                  </div>
                  <p className="mt-1 font-semibold text-white">{pc.title}</p>
                  {pc.description && (
                    <p className="mt-0.5 text-xs text-slate-500">{pc.description}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  {Number(pc.fine_amount) > 0 && (
                    <p className="text-sm font-bold text-amber-300">
                      Fine: {formatCurrency(Number(pc.fine_amount))}
                    </p>
                  )}
                  {Number(pc.bail_amount) > 0 && (
                    <p className="text-sm font-bold text-red-300">
                      Bail: {formatCurrency(Number(pc.bail_amount))}
                    </p>
                  )}
                  {Number(pc.fine_amount) === 0 && Number(pc.bail_amount) === 0 && (
                    <p className="text-xs text-slate-600">No standard fine/bail</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
