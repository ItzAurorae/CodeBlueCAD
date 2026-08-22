import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Weapon, WeaponType, WeaponRegStatus } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';
import { Button, Input, Label, Select, Textarea } from '@/components/ui/Form';

interface Props {
  record: Weapon | null;
  onClose: () => void;
  onSaved: () => void;
}

const WEAPON_TYPES: WeaponType[] = ['pistol', 'rifle', 'shotgun', 'other'];
const REG_STATUSES: WeaponRegStatus[] = ['registered', 'unregistered', 'stolen'];

export function WeaponModal({ record, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serial, setSerial] = useState(record?.serial_number ?? '');
  const [model, setModel] = useState(record?.model ?? '');
  const [manufacturer, setManufacturer] = useState(record?.manufacturer ?? '');
  const [caliber, setCaliber] = useState(record?.caliber ?? '');
  const [weaponType, setWeaponType] = useState<WeaponType>(record?.weapon_type ?? 'pistol');
  const [owner, setOwner] = useState(record?.owner_name ?? '');
  const [regStatus, setRegStatus] = useState<WeaponRegStatus>(record?.registration_status ?? 'registered');
  const [notes, setNotes] = useState(record?.notes ?? '');

  async function save() {
    if (!serial.trim()) {
      setError('Serial number is required.');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      serial_number: serial.trim().toUpperCase(),
      model: model.trim(),
      manufacturer: manufacturer.trim(),
      caliber: caliber.trim(),
      weapon_type: weaponType,
      owner_name: owner.trim(),
      registration_status: regStatus,
      notes: notes.trim(),
    };
    const res = record
      ? await supabase.from('weapons').update(payload).eq('id', record.id)
      : await supabase.from('weapons').insert(payload);
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
    await supabase.from('weapons').delete().eq('id', record.id);
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={record ? 'Edit Weapon' : 'New Weapon'}
      subtitle="Weapon registration record"
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
            <Label>Serial Number</Label>
            <Input
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              placeholder="SN-12345"
              className="font-mono uppercase"
              autoFocus
            />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={weaponType} onChange={(e) => setWeaponType(e.target.value as WeaponType)}>
              {WEAPON_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Manufacturer</Label>
            <Input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder="Glock" />
          </div>
          <div>
            <Label>Model</Label>
            <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="G17 Gen4" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Caliber</Label>
            <Input value={caliber} onChange={(e) => setCaliber(e.target.value)} placeholder="9mm" />
          </div>
          <div>
            <Label>Owner</Label>
            <Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="John Carter" />
          </div>
        </div>
        <div>
          <Label>Registration Status</Label>
          <Select value={regStatus} onChange={(e) => setRegStatus(e.target.value as WeaponRegStatus)}>
            {REG_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Notes</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
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
