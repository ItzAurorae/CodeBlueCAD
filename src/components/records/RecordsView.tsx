import { useCallback, useEffect, useState } from 'react';
import {
  User,
  Car,
  Gavel,
  Crosshair,
  Plus,
  Search,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Civilian, Vehicle, Warrant, Weapon } from '@/lib/types';
import { STATUS_PILL, WEAPON_REG_META, timeAgo } from '@/lib/ui';
import { Button, Input } from '@/components/ui/Form';
import { CivilianModal } from '@/components/records/CivilianModal';
import { VehicleModal } from '@/components/records/VehicleModal';
import { WarrantModal } from '@/components/records/WarrantModal';
import { WeaponModal } from '@/components/records/WeaponModal';

type Tab = 'civilians' | 'vehicles' | 'weapons' | 'warrants';

const TABS: { key: Tab; label: string; icon: typeof User }[] = [
  { key: 'civilians', label: 'Civilians', icon: User },
  { key: 'vehicles', label: 'Vehicles', icon: Car },
  { key: 'weapons', label: 'Weapons', icon: Crosshair },
  { key: 'warrants', label: 'Warrants', icon: Gavel },
];

export function RecordsView() {
  const [tab, setTab] = useState<Tab>('civilians');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [civilians, setCivilians] = useState<Civilian[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [warrants, setWarrants] = useState<Warrant[]>([]);
  const [editing, setEditing] = useState<
    | { kind: Tab; record: Civilian | Vehicle | Weapon | Warrant | null }
    | null
  >(null);

  const load = useCallback(async () => {
    setLoading(true);
    if (tab === 'civilians') {
      const { data } = await supabase
        .from('civilians')
        .select('*')
        .order('last_name', { ascending: true });
      setCivilians(data ?? []);
    } else if (tab === 'vehicles') {
      const { data } = await supabase
        .from('vehicles')
        .select('*')
        .order('plate', { ascending: true });
      setVehicles(data ?? []);
    } else if (tab === 'weapons') {
      const { data } = await supabase
        .from('weapons')
        .select('*')
        .order('serial_number', { ascending: true });
      setWeapons(data ?? []);
    } else {
      const { data } = await supabase
        .from('warrants')
        .select('*')
        .order('created_at', { ascending: false });
      setWarrants(data ?? []);
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    setQuery('');
    load();
  }, [load]);

  function filtered<T extends { id: string }>(
    rows: T[],
    match: (r: T) => boolean,
  ): T[] {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) => match(r));
  }

  const civFiltered = filtered(civilians, (c) =>
    `${c.first_name} ${c.last_name} ${c.address}`.toLowerCase().includes(query.toLowerCase()),
  );
  const vehFiltered = filtered(vehicles, (v) =>
    `${v.plate} ${v.model} ${v.color} ${v.owner_name}`.toLowerCase().includes(query.toLowerCase()),
  );
  const wepFiltered = filtered(weapons, (w) =>
    `${w.serial_number} ${w.model} ${w.manufacturer} ${w.owner_name}`.toLowerCase().includes(query.toLowerCase()),
  );
  const warFiltered = filtered(warrants, (w) =>
    `${w.subject_name} ${w.reason}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-lg bg-ink-850 p-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                  tab === t.key
                    ? 'bg-brand-500 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search records…"
              className="pl-9"
            />
          </div>
          <Button
            onClick={() =>
              setEditing({ kind: tab, record: null })
            }
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : tab === 'civilians' ? (
        civFiltered.length === 0 ? (
          <EmptyState label="No civilians found" />
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {civFiltered.map((c) => (
              <button
                key={c.id}
                onClick={() => setEditing({ kind: 'civilians', record: c })}
                className="rounded-lg border border-ink-800 bg-ink-850 p-4 text-left transition hover:border-ink-600 hover:bg-ink-800"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-white">
                    {c.last_name}, {c.first_name}
                  </p>
                  <span
                    className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_PILL[c.license_status]}`}
                  >
                    {c.license_status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {c.dob ? `DOB ${c.dob}` : 'No DOB'} · {c.gender || '—'}
                </p>
                {c.address && (
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {c.address}
                  </p>
                )}
                {c.flags && (
                  <p className="mt-2 flex items-center gap-1.5 rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-300">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {c.flags}
                  </p>
                )}
              </button>
            ))}
          </div>
        )
      ) : tab === 'vehicles' ? (
        vehFiltered.length === 0 ? (
          <EmptyState label="No vehicles found" />
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {vehFiltered.map((v) => (
              <button
                key={v.id}
                onClick={() => setEditing({ kind: 'vehicles', record: v })}
                className="rounded-lg border border-ink-800 bg-ink-850 p-4 text-left transition hover:border-ink-600 hover:bg-ink-800"
              >
                <div className="flex items-center justify-between">
                  <p className="font-mono font-bold text-white">{v.plate}</p>
                  {v.stolen && (
                    <span className="rounded border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-red-300">
                      Stolen
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-300">
                  {v.color} {v.model || 'Unknown model'}
                </p>
                <p className="text-xs text-slate-500">
                  Owner: {v.owner_name || 'Unknown'}
                </p>
                <div className="mt-2 flex gap-1.5">
                  <span
                    className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ${STATUS_PILL[v.registration_status]}`}
                  >
                    Reg: {v.registration_status}
                  </span>
                  <span
                    className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ${STATUS_PILL[v.insurance_status]}`}
                  >
                    Ins: {v.insurance_status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )
      ) : tab === 'weapons' ? (
        wepFiltered.length === 0 ? (
          <EmptyState label="No weapons found" />
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {wepFiltered.map((w) => {
              const reg = WEAPON_REG_META[w.registration_status];
              return (
                <button
                  key={w.id}
                  onClick={() => setEditing({ kind: 'weapons', record: w })}
                  className="rounded-lg border border-ink-800 bg-ink-850 p-4 text-left transition hover:border-ink-600 hover:bg-ink-800"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-mono font-bold text-white">{w.serial_number}</p>
                    <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${reg.pill}`}>
                      {reg.label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-300">
                    {w.manufacturer} {w.model}
                  </p>
                  <p className="text-xs text-slate-500">
                    {w.caliber} · {w.owner_name || 'Unknown owner'}
                  </p>
                </button>
              );
            })}
          </div>
        )
      ) : warFiltered.length === 0 ? (
        <EmptyState label="No warrants found" />
      ) : (
        <div className="space-y-2.5">
          {warFiltered.map((w) => (
            <button
              key={w.id}
              onClick={() => setEditing({ kind: 'warrants', record: w })}
              className="flex w-full items-center gap-4 rounded-lg border border-ink-800 bg-ink-850 p-4 text-left transition hover:border-ink-600 hover:bg-ink-800"
            >
              <Gavel
                className={`h-5 w-5 shrink-0 ${
                  w.status === 'active' ? 'text-red-400' : 'text-slate-500'
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white">{w.subject_name}</p>
                <p className="truncate text-xs text-slate-400">{w.reason}</p>
                {w.issued_by && (
                  <p className="mt-0.5 text-xs text-slate-600">
                    Issued by {w.issued_by} · {timeAgo(w.created_at)}
                  </p>
                )}
              </div>
              <span
                className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_PILL[w.status]}`}
              >
                {w.status}
              </span>
            </button>
          ))}
        </div>
      )}

      {editing?.kind === 'civilians' && (
        <CivilianModal
          record={editing.record as Civilian | null}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
      {editing?.kind === 'vehicles' && (
        <VehicleModal
          record={editing.record as Vehicle | null}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
      {editing?.kind === 'weapons' && (
        <WeaponModal
          record={editing.record as Weapon | null}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
      {editing?.kind === 'warrants' && (
        <WarrantModal
          record={editing.record as Warrant | null}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-ink-700 py-16 text-center">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="text-xs text-slate-600">
        Use "Add" to create a new record.
      </p>
    </div>
  );
}
