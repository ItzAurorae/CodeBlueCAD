import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Warrant, WarrantStatus } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';
import { Button, Input, Label, Select, Textarea } from '@/components/ui/Form';

interface Props {
  record: Warrant | null;
  onClose: () => void;
  onSaved: () => void;
}

const STATUS: WarrantStatus[] = ['active', 'served', 'expired'];

export function WarrantModal({ record, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState(record?.subject_name ?? '');
  const [reason, setReason] = useState(record?.reason ?? '');
  const [status, setStatus] = useState<WarrantStatus>(record?.status ?? 'active');
  const [issuedBy, setIssuedBy] = useState(record?.issued_by ?? '');

  async function save() {
    if (!subject.trim() || !reason.trim()) {
      setError('Subject name and reason are required.');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      subject_name: subject.trim(),
      reason: reason.trim(),
      status,
      issued_by: issuedBy.trim(),
    };
    const res = record
      ? await supabase.from('warrants').update(payload).eq('id', record.id)
      : await supabase.from('warrants').insert(payload);
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
    await supabase.from('warrants').delete().eq('id', record.id);
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={record ? 'Edit Warrant' : 'New Warrant'}
      subtitle="Warrant record"
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
        <div>
          <Label>Subject Name</Label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="John Carter"
          />
        </div>
        <div>
          <Label>Reason</Label>
          <Textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Failure to appear, armed robbery…"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Status</Label>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as WarrantStatus)}
            >
              {STATUS.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Issued By</Label>
            <Input
              value={issuedBy}
              onChange={(e) => setIssuedBy(e.target.value)}
              placeholder="Judge / Officer"
            />
          </div>
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
