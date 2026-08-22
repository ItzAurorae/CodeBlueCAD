export type UnitStatus =
  | 'available'
  | 'busy'
  | 'enroute'
  | 'onscene'
  | 'panic'
  | 'offduty';

export type CallStatus = 'pending' | 'active' | 'closed';
export type LicenseStatus = 'valid' | 'suspended' | 'revoked' | 'none';
export type RegStatus = 'valid' | 'expired' | 'none';
export type WarrantStatus = 'active' | 'served' | 'expired';

export type BoloType = 'person' | 'vehicle' | 'item' | 'other';
export type BoloStatus = 'active' | 'cancelled';
export type WeaponType = 'pistol' | 'rifle' | 'shotgun' | 'other';
export type WeaponRegStatus = 'registered' | 'unregistered' | 'stolen';
export type CitationStatus = 'pending' | 'paid' | 'contested' | 'dismissed';
export type IncidentType = 'arrest' | 'incident' | 'field-contact' | 'use-of-force';
export type IncidentStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export type PenalCategory = 'felony' | 'misdemeanor' | 'infraction';

export interface Profile {
  id: string;
  name: string;
  badge_number: string;
  rank: string;
  department: string;
  callsign: string;
  created_at: string;
}

export interface Unit {
  id: string;
  profile_id: string;
  callsign: string;
  officer_name: string;
  unit_type: string;
  status: UnitStatus;
  location: string;
  created_at: string;
  updated_at: string;
}

export interface Call {
  id: string;
  call_number: number;
  title: string;
  call_type: string;
  priority: number;
  status: CallStatus;
  location: string;
  description: string;
  caller_name: string;
  postal: string;
  created_by: string | null;
  created_at: string;
  closed_at: string | null;
}

export interface CallAssignment {
  id: string;
  call_id: string;
  unit_id: string;
  created_at: string;
}

export interface CallLog {
  id: string;
  call_id: string;
  author_name: string;
  message: string;
  log_type: string;
  created_at: string;
}

export interface Civilian {
  id: string;
  first_name: string;
  last_name: string;
  dob: string | null;
  gender: string;
  address: string;
  license_status: LicenseStatus;
  flags: string;
  created_at: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  color: string;
  owner_name: string;
  registration_status: RegStatus;
  insurance_status: RegStatus;
  stolen: boolean;
  notes: string;
  created_at: string;
}

export interface Warrant {
  id: string;
  subject_name: string;
  reason: string;
  status: WarrantStatus;
  issued_by: string;
  created_at: string;
}

export interface Bolo {
  id: string;
  bolo_type: BoloType;
  title: string;
  description: string;
  plate: string;
  subject_name: string;
  priority: number;
  status: BoloStatus;
  created_by: string | null;
  created_at: string;
}

export interface Weapon {
  id: string;
  serial_number: string;
  model: string;
  manufacturer: string;
  caliber: string;
  weapon_type: WeaponType;
  owner_name: string;
  registration_status: WeaponRegStatus;
  notes: string;
  created_at: string;
}

export interface Citation {
  id: string;
  citation_number: number;
  civilian_name: string;
  officer_name: string;
  violation: string;
  penal_code_id: string | null;
  fine_amount: number;
  court_date: string | null;
  status: CitationStatus;
  location: string;
  notes: string;
  created_by: string | null;
  created_at: string;
}

export interface Incident {
  id: string;
  incident_number: number;
  title: string;
  incident_type: IncidentType;
  status: IncidentStatus;
  summary: string;
  involved_parties: string;
  location: string;
  evidence: string;
  officer_name: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PenalCode {
  id: string;
  code: string;
  title: string;
  category: PenalCategory;
  fine_amount: number;
  bail_amount: number;
  description: string;
  created_at: string;
}
