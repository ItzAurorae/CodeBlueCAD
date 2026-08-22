import { useCallback, useEffect, useState } from 'react';
import { Crosshair, Plus, Search, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Weapon } from '@/lib/types';
import { WEAPON_REG_META } from '@/lib/ui';
import { Button, Input } from '@/components/ui/Form';
import { WeaponModal } from '@/components/records/WeaponModal';

export function WeaponsView() {
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Weapon | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('weapons')
      .select('*')
      .order('created_at', { ascending: false });
    setWeapons(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = query.trim()
    ? weapons.filter((w) =>
        `${w.serial_number} ${w.model} ${w.manufacturer} ${w.owner_name} ${w.caliber}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      )
    : weapons;

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search weapons…"
            className="pl-9"
          />
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Add Weapon
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-ink-700 py-16 text-center">
          <Crosshair className="mb-3 h-10 w-10 text-ink-600" />
          <p className="text-sm text-slate-400">No weapons found</p>
          <p className="text-xs text-slate-600">Register a weapon to get started.</p>
        </div>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {filtered.map((w) => {
            const reg = WEAPON_REG_META[w.registration_status];
            return (
              <button
                key={w.id}
                onClick={() => setEditing(w)}
                className="rounded-lg border border-ink-800 bg-ink-850 p-4 text-left transition hover:border-ink-600 hover:bg-ink-800"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crosshair className="h-4 w-4 text-brand-400" />
                    <span className="font-mono font-bold text-white">{w.serial_number}</span>
                  </div>
                  <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${reg.pill}`}>
                    {reg.label}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-slate-300">
                  {w.manufacturer} {w.model}
                </p>
                <div className="mt-1 flex gap-3 text-xs text-slate-500">
                  {w.caliber && <span>{w.caliber}</span>}
                  <span className="capitalize">{w.weapon_type}</span>
                  {w.owner_name && <span>· {w.owner_name}</span>}
                </div>
                {w.notes && (
                  <p className="mt-1.5 line-clamp-1 text-xs text-slate-600">{w.notes}</p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {creating && (
        <WeaponModal record={null} onClose={() => setCreating(false)} onSaved={load} />
      )}
      {editing && (
        <WeaponModal record={editing} onClose={() => setEditing(null)} onSaved={load} />
      )}
    </div>
  );
}
