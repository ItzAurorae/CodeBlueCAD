import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Incident, IncidentType, IncidentStatus } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';
import { Button, Input, Label, Select, Textarea } from '@/components/ui/Form';

interface Props {
  record: Incident | null;
  onClose: () => void;
  onSaved: () => void;
}

const INCIDENT_TYPES: IncidentType[] = ['arrest', 'incident', 'field-contact', 'use-of-force'];
const STATUSES: IncidentStatus[] = ['draft', 'submitted', 'approved', 'rejected'];

export function IncidentModal({ record, onClose, onSaved }: Props) {
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(record?.title ?? '');
  const [incidentType, setIncidentType] = useState<IncidentType>(record?.incident_type ?? 'incident');
  const [status, setStatus] = useState<IncidentStatus>(record?.status ?? 'draft');
  const [summary, setSummary] = useState(record?.summary ?? '');
  const [involvedParties, setInvolvedParties] = useState(record?.involved_parties ?? '');
  const [location, setLocation] = useState(record?.location ?? '');
  const [evidence, setEvidence] = useState(record?.evidence ?? '');

  async function save() {
    if (!title.trim()) {
      setError('A title is required.');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      title: title.trim(),
      incident_type: incidentType,
      status,
      summary: summary.trim(),
      involved_parties: involvedParties.trim(),
      location: location.trim(),
      evidence: evidence.trim(),
      officer_name: profile?.name ?? '',
      updated_at: new Date().toISOString(),
    };
    const res = record
      ? await supabase.from('incidents').update(payload).eq('id', record.id)
      : await supabase.from('incidents').insert(payload);
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
    await supabase.from('incidents').delete().eq('id', record.id);
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={record ? 'Edit Incident' : 'New Incident Report'}
      subtitle={`#${record?.incident_number ?? 'New'} — Report filing`}
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
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Arrest at Vinewood Blvd" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Incident Type</Label>
            <Select value={incidentType} onChange={(e) => setIncidentType(e.target.value as IncidentType)}>
              {INCIDENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onChange={(e) => setStatus(e.target.value as IncidentStatus)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label>Location</Label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Vinewood Blvd & Alta St" />
        </div>
        <div>
          <Label>Involved Parties</Label>
          <Input value={involvedParties} onChange={(e) => setInvolvedParties(e.target.value)} placeholder="John Carter, Jane Doe" />
        </div>
        <div>
          <Label>Summary</Label>
          <Textarea
            rows={4}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Detailed description of the incident…"
          />
        </div>
        <div>
          <Label>Evidence Collected</Label>
          <Textarea
            rows={2}
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            placeholder="Body cam footage, fingerprints, witness statements…"
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
