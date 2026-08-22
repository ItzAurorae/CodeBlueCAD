import { useMemo, useState } from 'react';
import { Plus, MapPin, Clock, Radio, Inbox, Users } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import type { Call, Unit } from '@/lib/types';
import {
  CALL_STATUS_META,
  PRIORITY_META,
  UNIT_STATUS_META,
  timeAgo,
} from '@/lib/ui';
import { Button } from '@/components/ui/Form';
import { NewCallModal } from '@/components/dispatch/NewCallModal';
import { CallDetailModal } from '@/components/dispatch/CallDetailModal';

type Filter = 'active' | 'pending' | 'closed' | 'all';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'pending', label: 'Pending' },
  { key: 'closed', label: 'Closed' },
  { key: 'all', label: 'All' },
];

export function DispatchBoard({ myUnit }: { myUnit?: Unit }) {
  const { calls, units, assignments, loading, error, refresh } = useData();
  const [filter, setFilter] = useState<Filter>('active');
  const [newOpen, setNewOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const unitsById = useMemo(
    () => new Map(units.map((u) => [u.id, u])),
    [units],
  );

  function assignedFor(callId: string): Unit[] {
    return assignments
      .filter((a) => a.call_id === callId)
      .map((a) => unitsById.get(a.unit_id))
      .filter((u): u is Unit => Boolean(u));
  }

  const visibleCalls = calls.filter((c) =>
    filter === 'all' ? true : c.status === filter,
  );

  const onlineUnits = units.filter((u) => u.status !== 'offduty');
  const selectedCall = calls.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="grid h-full grid-cols-1 gap-4 p-4 lg:grid-cols-3 xl:grid-cols-[1fr_340px]">
      <div className="flex min-h-0 flex-col lg:col-span-2 xl:col-auto">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex gap-1 rounded-lg bg-ink-850 p-1">
            {FILTERS.map((f) => {
              const count =
                f.key === 'all'
                  ? calls.length
                  : calls.filter((c) => c.status === f.key).length;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    filter === f.key
                      ? 'bg-brand-500 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {f.label}
                  <span className="ml-1.5 text-xs opacity-70">{count}</span>
                </button>
              );
            })}
          </div>
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4" />
            New Call
          </Button>
        </div>

        <div className="scrollbar-thin min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              Could not load calls: {error}
            </div>
          )}
          {loading && calls.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">
              Loading calls…
            </div>
          ) : visibleCalls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Inbox className="mb-3 h-10 w-10 text-ink-600" />
              <p className="text-sm text-slate-400">No {filter} calls</p>
              <p className="text-xs text-slate-600">
                Create a call to dispatch units.
              </p>
            </div>
          ) : (
            visibleCalls.map((call) => (
              <CallRow
                key={call.id}
                call={call}
                assigned={assignedFor(call.id)}
                onClick={() => setSelectedId(call.id)}
              />
            ))
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-col">
        <div className="mb-3 flex items-center gap-2 px-1">
          <Users className="h-4 w-4 text-brand-400" />
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-300">
            Units on Duty
          </h2>
          <span className="ml-auto rounded-full bg-ink-800 px-2 py-0.5 text-xs font-semibold text-slate-400">
            {onlineUnits.length}
          </span>
        </div>
        <div className="scrollbar-thin min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {onlineUnits.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-ink-700 py-12 text-center">
              <Radio className="mb-2 h-8 w-8 text-ink-600" />
              <p className="text-sm text-slate-500">No units on duty</p>
            </div>
          ) : (
            onlineUnits.map((u) => {
              const attachedCall = assignments
                .filter((a) => a.unit_id === u.id)
                .map((a) => calls.find((c) => c.id === a.call_id))
                .find((c) => c && c.status !== 'closed');
              const meta = UNIT_STATUS_META[u.status];
              return (
                <div
                  key={u.id}
                  className={`rounded-lg border px-3 py-2.5 ${meta.bg} ${
                    u.id === myUnit?.id ? 'ring-1 ring-brand-500/40' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                    <span className="font-mono text-sm font-bold text-white">
                      {u.callsign}
                    </span>
                    {u.id === myUnit?.id && (
                      <span className="rounded bg-brand-500/20 px-1.5 py-0.5 text-[10px] font-bold text-brand-400">
                        YOU
                      </span>
                    )}
                    <span
                      className={`ml-auto text-xs font-semibold ${meta.text}`}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <p className="mt-1 pl-5 text-xs text-slate-400">
                    {u.officer_name}
                  </p>
                  {attachedCall && (
                    <p className="mt-1 pl-5 text-xs text-slate-500">
                      On #{attachedCall.call_number} · {attachedCall.title}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <NewCallModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={refresh}
      />
      {selectedCall && (
        <CallDetailModal
          call={selectedCall}
          units={units}
          assignments={assignments}
          onClose={() => setSelectedId(null)}
          onChange={refresh}
        />
      )}
    </div>
  );
}

function CallRow({
  call,
  assigned,
  onClick,
}: {
  call: Call;
  assigned: Unit[];
  onClick: () => void;
}) {
  const p = PRIORITY_META[call.priority] ?? PRIORITY_META[2];
  const s = CALL_STATUS_META[call.status];
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-stretch gap-3 overflow-hidden rounded-lg border border-ink-800 bg-ink-850 text-left transition hover:border-ink-600 hover:bg-ink-800"
    >
      <span className={`w-1 shrink-0 ${p.bar}`} />
      <div className="min-w-0 flex-1 py-3 pr-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-slate-500">
            #{call.call_number}
          </span>
          <span
            className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${p.bg} ${p.text}`}
          >
            {p.label}
          </span>
          <span
            className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${s.bg} ${s.text}`}
          >
            {s.label}
          </span>
          <span className="ml-auto flex items-center gap-1 text-[11px] text-slate-500">
            <Clock className="h-3 w-3" />
            {timeAgo(call.created_at)}
          </span>
        </div>
        <p className="mt-1.5 truncate font-semibold text-white">
          {call.title}
        </p>
        <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
          <span className="truncate">{call.call_type}</span>
          {call.location && (
            <span className="flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              {call.location}
            </span>
          )}
        </div>
        {assigned.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {assigned.map((u) => (
              <span
                key={u.id}
                className="rounded bg-ink-700 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-300"
              >
                {u.callsign}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
