import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Bolo, BoloType, BoloStatus } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';
import { Button, Input, Label, Select, Textarea } from '@/components/ui/Form';

interface Props {
  record: Bolo | null;
  onClose: () => void;
  onSaved: () => void;
}

const BOLO_TYPES: BoloType[] = ['person', 'vehicle', 'item', 'other'];
const STATUSES: BoloStatus[] = ['active', 'cancelled'];

export function BoloModal({ record, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [boloType, setBoloType] = useState<BoloType>(record?.bolo_type ?? 'person');
  const [title, setTitle] = useState(record?.title ?? '');
  const [description, setDescription] = useState(record?.description ?? '');
  const [plate, setPlate] = useState(record?.plate ?? '');
  const [subjectName, setSubjectName] = useState(record?.subject_name ?? '');
  const [priority, setPriority] = useState(record?.priority ?? 2);
  const [status, setStatus] = useState<BoloStatus>(record?.status ?? 'active');

  async function save() {
    if (!title.trim()) {
      setError('A title is required.');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      bolo_type: boloType,
      title: title.trim(),
      description: description.trim(),
      plate: plate.trim().toUpperCase(),
      subject_name: subjectName.trim(),
      priority,
      status,
    };
    const res = record
      ? await supabase.from('bolos').update(payload).eq('id', record.id)
      : await supabase.from('bolos').insert(payload);
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
    await supabase.from('bolos').delete().eq('id', record.id);
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={record ? 'Edit BOLO' : 'New BOLO'}
      subtitle="Be On The Lookout alert"
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
            <Label>Type</Label>
            <Select value={boloType} onChange={(e) => setBoloType(e.target.value as BoloType)}>
              {BOLO_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={priority} onChange={(e) => setPriority(Number(e.target.value))}>
              <option value={1}>P1 — High</option>
              <option value={2}>P2 — Medium</option>
              <option value={3}>P3 — Low</option>
            </Select>
          </div>
        </div>
        <div>
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Armed robbery suspect" autoFocus />
        </div>
        {boloType === 'vehicle' && (
          <div>
            <Label>Plate</Label>
            <Input
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              placeholder="8ABC123"
              className="font-mono uppercase"
            />
          </div>
        )}
        {boloType === 'person' && (
          <div>
            <Label>Subject Name</Label>
            <Input value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="John Doe" />
          </div>
        )}
        <div>
          <Label>Description</Label>
          <Textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description, last known location, caution notes…"
          />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={status} onChange={(e) => setStatus(e.target.value as BoloStatus)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </Select>
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
