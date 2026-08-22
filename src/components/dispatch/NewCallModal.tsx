import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Modal } from '@/components/ui/Modal';
import { Button, Input, Label, Select, Textarea } from '@/components/ui/Form';

const CALL_TYPES = [
  'Traffic Stop',
  'Suspicious Activity',
  'Robbery',
  'Assault',
  'Domestic Disturbance',
  'Burglary',
  'Vehicle Accident',
  'Medical Emergency',
  'Fire',
  'Pursuit',
  'Shots Fired',
  'Welfare Check',
  'General',
];

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function NewCallModal({ open, onClose, onCreated }: Props) {
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [callType, setCallType] = useState('General');
  const [priority, setPriority] = useState(2);
  const [location, setLocation] = useState('');
  const [postal, setPostal] = useState('');
  const [caller, setCaller] = useState('');
  const [description, setDescription] = useState('');

  function reset() {
    setTitle('');
    setCallType('General');
    setPriority(2);
    setLocation('');
    setPostal('');
    setCaller('');
    setDescription('');
    setError(null);
  }

  async function handleCreate() {
    if (!title.trim()) {
      setError('A short title is required.');
      return;
    }
    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase.from('calls').insert({
      title: title.trim(),
      call_type: callType,
      priority,
      status: 'pending',
      location: location.trim(),
      postal: postal.trim(),
      caller_name: caller.trim(),
      description: description.trim(),
      created_by: profile?.id ?? null,
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    reset();
    onCreated();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Call for Service"
      subtitle="Log an incoming incident"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Call
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Armed robbery in progress"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Type</Label>
            <Select
              value={callType}
              onChange={(e) => setCallType(e.target.value)}
            >
              {CALL_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Priority</Label>
            <Select
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
            >
              <option value={1}>P1 — Emergency</option>
              <option value={2}>P2 — Urgent</option>
              <option value={3}>P3 — Routine</option>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Label>Location</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Vinewood Blvd & Alta St"
            />
          </div>
          <div>
            <Label>Postal</Label>
            <Input
              value={postal}
              onChange={(e) => setPostal(e.target.value)}
              placeholder="1234"
            />
          </div>
        </div>
        <div>
          <Label>Caller</Label>
          <Input
            value={caller}
            onChange={(e) => setCaller(e.target.value)}
            placeholder="Anonymous"
          />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Details of the incident, suspect description, etc."
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
