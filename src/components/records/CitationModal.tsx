import { useEffect, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Citation, CitationStatus, PenalCode } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';
import { Button, Input, Label, Select, Textarea } from '@/components/ui/Form';

interface Props {
  record: Citation | null;
  onClose: () => void;
  onSaved: () => void;
}

const STATUSES: CitationStatus[] = ['pending', 'paid', 'contested', 'dismissed'];

export function CitationModal({ record, onClose, onSaved }: Props) {
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [penalCodes, setPenalCodes] = useState<PenalCode[]>([]);
  const [civilianName, setCivilianName] = useState(record?.civilian_name ?? '');
  const [violation, setViolation] = useState(record?.violation ?? '');
  const [penalCodeId, setPenalCodeId] = useState(record?.penal_code_id ?? '');
  const [fineAmount, setFineAmount] = useState(record?.fine_amount ?? 0);
  const [courtDate, setCourtDate] = useState(record?.court_date ?? '');
  const [status, setStatus] = useState<CitationStatus>(record?.status ?? 'pending');
  const [location, setLocation] = useState(record?.location ?? '');
  const [notes, setNotes] = useState(record?.notes ?? '');

  useEffect(() => {
    supabase
      .from('penal_codes')
      .select('*')
      .order('code', { ascending: true })
      .then(({ data }) => setPenalCodes(data ?? []));
  }, []);

  function selectPenalCode(id: string) {
    setPenalCodeId(id);
    const pc = penalCodes.find((p) => p.id === id);
    if (pc) {
      setViolation(`${pc.code} — ${pc.title}`);
      setFineAmount(pc.fine_amount);
    }
  }

  async function save() {
    if (!civilianName.trim() || !violation.trim()) {
      setError('Civilian name and violation are required.');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      civilian_name: civilianName.trim(),
      officer_name: profile?.name ?? '',
      violation: violation.trim(),
      penal_code_id: penalCodeId || null,
      fine_amount: fineAmount,
      court_date: courtDate || null,
      status,
      location: location.trim(),
      notes: notes.trim(),
    };
    const res = record
      ? await supabase.from('citations').update(payload).eq('id', record.id)
      : await supabase.from('citations').insert(payload);
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
    await supabase.from('citations').delete().eq('id', record.id);
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={record ? 'Edit Citation' : 'New Citation'}
      subtitle={`#${record?.citation_number ?? 'New'} — Traffic / criminal citation`}
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
          <Label>Civilian Name</Label>
          <Input value={civilianName} onChange={(e) => setCivilianName(e.target.value)} placeholder="John Carter" autoFocus />
        </div>
        <div>
          <Label>Penal Code (optional)</Label>
          <Select value={penalCodeId} onChange={(e) => selectPenalCode(e.target.value)}>
            <option value="">— Select penal code —</option>
            {penalCodes.map((pc) => (
              <option key={pc.id} value={pc.id}>
                {pc.code} — {pc.title}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Violation</Label>
          <Input value={violation} onChange={(e) => setViolation(e.target.value)} placeholder="PC 242 — Battery" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Fine Amount</Label>
            <Input
              type="number"
              value={fineAmount}
              onChange={(e) => setFineAmount(Number(e.target.value))}
              placeholder="500"
            />
          </div>
          <div>
            <Label>Court Date</Label>
            <Input type="date" value={courtDate} onChange={(e) => setCourtDate(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Vinewood Blvd" />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onChange={(e) => setStatus(e.target.value as CitationStatus)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </Select>
          </div>
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
