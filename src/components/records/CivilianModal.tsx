import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Civilian, LicenseStatus } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';
import { Button, Input, Label, Select, Textarea } from '@/components/ui/Form';

interface Props {
  record: Civilian | null;
  onClose: () => void;
  onSaved: () => void;
}

const LICENSE: LicenseStatus[] = ['valid', 'suspended', 'revoked', 'none'];

export function CivilianModal({ record, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState(record?.first_name ?? '');
  const [lastName, setLastName] = useState(record?.last_name ?? '');
  const [dob, setDob] = useState(record?.dob ?? '');
  const [gender, setGender] = useState(record?.gender ?? '');
  const [address, setAddress] = useState(record?.address ?? '');
  const [license, setLicense] = useState<LicenseStatus>(
    record?.license_status ?? 'valid',
  );
  const [flags, setFlags] = useState(record?.flags ?? '');

  async function save() {
    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required.');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      dob: dob || null,
      gender: gender.trim(),
      address: address.trim(),
      license_status: license,
      flags: flags.trim(),
    };
    const res = record
      ? await supabase.from('civilians').update(payload).eq('id', record.id)
      : await supabase.from('civilians').insert(payload);
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
    await supabase.from('civilians').delete().eq('id', record.id);
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={record ? 'Edit Civilian' : 'New Civilian'}
      subtitle="Person record"
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
            <Label>First Name</Label>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div>
            <Label>Last Name</Label>
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Date of Birth</Label>
            <Input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </div>
          <div>
            <Label>Gender</Label>
            <Input
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              placeholder="M / F / X"
            />
          </div>
        </div>
        <div>
          <Label>Address</Label>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Alta St, Los Santos"
          />
        </div>
        <div>
          <Label>Driver License</Label>
          <Select
            value={license}
            onChange={(e) => setLicense(e.target.value as LicenseStatus)}
          >
            {LICENSE.map((l) => (
              <option key={l} value={l}>
                {l.charAt(0).toUpperCase() + l.slice(1)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Flags / Alerts</Label>
          <Textarea
            rows={2}
            value={flags}
            onChange={(e) => setFlags(e.target.value)}
            placeholder="Armed and dangerous, known gang affiliation…"
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
