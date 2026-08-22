import { useState } from 'react';
import {
  MapPin,
  Phone,
  Clock,
  Trash2,
  UserPlus,
  X,
  CheckCircle2,
  PlayCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Call, CallAssignment, Unit } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Form';
import { CALL_STATUS_META, PRIORITY_META, UNIT_STATUS_META, timeAgo } from '@/lib/ui';

interface Props {
  call: Call;
  units: Unit[];
  assignments: CallAssignment[];
  onClose: () => void;
  onChange: () => Promise<void>;
}

export function CallDetailModal({
  call,
  units,
  assignments,
  onClose,
  onChange,
}: Props) {
  const [working, setWorking] = useState(false);

  const assignedUnitIds = new Set(
    assignments.filter((a) => a.call_id === call.id).map((a) => a.unit_id),
  );
  const assignedUnits = units.filter((u) => assignedUnitIds.has(u.id));
  const availableUnits = units.filter(
    (u) => !assignedUnitIds.has(u.id) && u.status !== 'offduty',
  );

  async function run(fn: () => Promise<void>) {
    setWorking(true);
    await fn();
    await onChange();
    setWorking(false);
  }

  async function setStatus(status: Call['status']) {
    await run(async () => {
      await supabase
        .from('calls')
        .update({
          status,
          closed_at: status === 'closed' ? new Date().toISOString() : null,
        })
        .eq('id', call.id);
    });
  }

  async function setPriority(priority: number) {
    await run(async () => {
      await supabase.from('calls').update({ priority }).eq('id', call.id);
    });
  }

  async function assignUnit(unitId: string) {
    await run(async () => {
      await supabase
        .from('call_assignments')
        .insert({ call_id: call.id, unit_id: unitId });
      if (call.status === 'pending') {
        await supabase
          .from('calls')
          .update({ status: 'active' })
          .eq('id', call.id);
      }
    });
  }

  async function removeUnit(unitId: string) {
    await run(async () => {
      await supabase
        .from('call_assignments')
        .delete()
        .eq('call_id', call.id)
        .eq('unit_id', unitId);
    });
  }

  async function deleteCall() {
    await run(async () => {
      await supabase.from('calls').delete().eq('id', call.id);
    });
    onClose();
  }

  const p = PRIORITY_META[call.priority] ?? PRIORITY_META[2];
  const s = CALL_STATUS_META[call.status];

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={`#${call.call_number} · ${call.title}`}
      subtitle={call.call_type}
      footer={
        <div className="flex w-full items-center justify-between">
          <Button variant="danger" onClick={deleteCall} disabled={working}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <div className="flex gap-2">
            {call.status !== 'active' && (
              <Button
                variant="subtle"
                onClick={() => setStatus('active')}
                disabled={working}
              >
                <PlayCircle className="h-4 w-4" />
                Set Active
              </Button>
            )}
            {call.status !== 'closed' ? (
              <Button onClick={() => setStatus('closed')} disabled={working}>
                <CheckCircle2 className="h-4 w-4" />
                Close Call
              </Button>
            ) : (
              <Button
                variant="subtle"
                onClick={() => setStatus('pending')}
                disabled={working}
              >
                Reopen
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-md border px-2.5 py-1 text-xs font-bold ${p.bg} ${p.text}`}
          >
            {p.label}
          </span>
          <span
            className={`rounded-md border px-2.5 py-1 text-xs font-bold ${s.bg} ${s.text}`}
          >
            {s.label}
          </span>
          <span className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            {timeAgo(call.created_at)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-start gap-2 rounded-lg bg-ink-900 px-3 py-2.5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
            <div>
              <p className="text-slate-200">{call.location || 'Unknown'}</p>
              {call.postal && (
                <p className="text-xs text-slate-500">Postal {call.postal}</p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-ink-900 px-3 py-2.5">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
            <div>
              <p className="text-slate-200">
                {call.caller_name || 'Anonymous'}
              </p>
              <p className="text-xs text-slate-500">Caller</p>
            </div>
          </div>
        </div>

        {call.description && (
          <div className="rounded-lg bg-ink-900 px-3 py-2.5 text-sm text-slate-300">
            {call.description}
          </div>
        )}

        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Priority
          </p>
          <div className="flex gap-2">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                onClick={() => setPriority(n)}
                disabled={working}
                className={`flex-1 rounded-lg border py-2 text-sm font-bold transition ${
                  call.priority === n
                    ? `${PRIORITY_META[n].bg} ${PRIORITY_META[n].text}`
                    : 'border-ink-600 text-slate-400 hover:border-ink-500'
                }`}
              >
                {PRIORITY_META[n].label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Assigned Units ({assignedUnits.length})
          </p>
          {assignedUnits.length === 0 ? (
            <p className="rounded-lg border border-dashed border-ink-600 px-3 py-3 text-center text-sm text-slate-500">
              No units attached
            </p>
          ) : (
            <div className="space-y-2">
              {assignedUnits.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 rounded-lg bg-ink-900 px-3 py-2"
                >
                  <span
                    className={`h-2 w-2 rounded-full ${UNIT_STATUS_META[u.status].dot}`}
                  />
                  <div className="flex-1">
                    <p className="font-mono text-sm font-semibold text-white">
                      {u.callsign}
                    </p>
                    <p className="text-xs text-slate-500">{u.officer_name}</p>
                  </div>
                  <button
                    onClick={() => removeUnit(u.id)}
                    disabled={working}
                    className="rounded-md p-1.5 text-slate-500 transition hover:bg-ink-700 hover:text-red-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {call.status !== 'closed' && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Available to Attach
            </p>
            {availableUnits.length === 0 ? (
              <p className="text-sm text-slate-500">No free units on duty.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableUnits.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => assignUnit(u.id)}
                    disabled={working}
                    className="flex items-center gap-2 rounded-lg border border-ink-600 bg-ink-900 px-3 py-1.5 text-sm text-slate-300 transition hover:border-brand-500/50 hover:text-white"
                  >
                    <UserPlus className="h-3.5 w-3.5 text-brand-400" />
                    <span className="font-mono font-semibold">
                      {u.callsign}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
