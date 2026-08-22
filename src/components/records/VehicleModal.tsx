import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { RegStatus, Vehicle } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';
import { Button, Input, Label, Select, Textarea } from '@/components/ui/Form';

interface Props {
  record: Vehicle | null;
  onClose: () => void;
  onSaved: () => void;
}

const REG: RegStatus[] = ['valid', 'expired', 'none'];

export function VehicleModal({ record, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plate, setPlate] = useState(record?.plate ?? '');
  const [model, setModel] = useState(record?.model ?? '');
  const [color, setColor] = useState(record?.color ?? '');
  const [owner, setOwner] = useState(record?.owner_name ?? '');
  const [reg, setReg] = useState<RegStatus>(
    record?.registration_status ?? 'valid',
  );
  const [ins, setIns] = useState<RegStatus>(record?.insurance_status ?? 'valid');
  const [stolen, setStolen] = useState(record?.stolen ?? false);
  const [notes, setNotes] = useState(record?.notes ?? '');

  async function save() {
    if (!plate.trim()) {
      setError('A license plate is required.');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      plate: plate.trim().toUpperCase(),
      model: model.trim(),
      color: color.trim(),
      owner_name: owner.trim(),
      registration_status: reg,
      insurance_status: ins,
      stolen,
      notes: notes.trim(),
    };
    const res = record
      ? await supabase.from('vehicles').update(payload).eq('id', record.id)
      : await supabase.from('vehicles').insert(payload);
    setSaving(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    onSaved();
    onClose();
  }

  async function remove() {
    if (!record) return;
    setSaving(true);
    await supabase.from('vehicles').delete().eq('id', record.id);
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={record ? 'Edit Vehicle' : 'New Vehicle'}
      subtitle="Registration record"
      footer={
        <div className="flex w-full items-center justify-between">
          {record ? (
            <Button variant="danger" onClick={remove} disabled={saving}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Plate</Label>
            <Input
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              placeholder="8ABC123"
              className="font-mono uppercase"
            />
          </div>
          <div>
            <Label>Owner</Label>
            <Input value={owner} onChange={(e) => setOwner(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Model</Label>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Bravado Buffalo"
            />
          </div>
          <div>
            <Label>Color</Label>
            <Input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="Black"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Registration</Label>
            <Select
              value={reg}
              onChange={(e) => setReg(e.target.value as RegStatus)}
            >
              {REG.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Insurance</Label>
            <Select
              value={ins}
              onChange={(e) => setIns(e.target.value as RegStatus)}
            >
              {REG.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-ink-600 bg-ink-900 px-3 py-2.5">
          <input
            type="checkbox"
            checked={stolen}
            onChange={(e) => setStolen(e.target.checked)}
            className="h-4 w-4 rounded border-ink-500 bg-ink-800 text-red-500 focus:ring-red-500/40"
          />
          <span className="text-sm font-medium text-slate-200">
            Flagged as stolen
          </span>
        </label>
        <div>
          <Label>Notes</Label>
          <Textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
