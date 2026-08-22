import { useMemo, useState } from 'react';
import {
  Radio,
  LayoutDashboard,
  Siren,
  FolderSearch,
  AlertTriangle,
  FileText,
  Gavel,
  BookOpen,
  LogOut,
  ChevronDown,
  Power,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/lib/supabase';
import type { Unit, UnitStatus } from '@/lib/types';
import { UNIT_STATUS_META } from '@/lib/ui';
import { DispatchBoard } from '@/components/dispatch/DispatchBoard';
import { RecordsView } from '@/components/records/RecordsView';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { BolosView } from '@/components/dispatch/BolosView';
import { CitationsView } from '@/components/records/CitationsView';
import { IncidentsView } from '@/components/records/IncidentsView';
import { PenalCodeView } from '@/components/records/PenalCodeView';

type View =
  | 'dashboard'
  | 'dispatch'
  | 'records'
  | 'bolos'
  | 'citations'
  | 'incidents'
  | 'penal';

const DUTY_STATUSES: UnitStatus[] = [
  'available',
  'busy',
  'enroute',
  'onscene',
  'panic',
];

const VIEW_META: Record<View, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Department overview and analytics' },
  dispatch: { title: 'Dispatch Board', subtitle: 'Live calls and unit status' },
  records: { title: 'Records Database', subtitle: 'Civilians, vehicles, weapons and warrants' },
  bolos: { title: 'BOLOs', subtitle: 'Be On The Lookout alerts' },
  citations: { title: 'Citations', subtitle: 'Traffic and criminal citations' },
  incidents: { title: 'Incident Reports', subtitle: 'Arrest and incident reports' },
  penal: { title: 'Penal Code', subtitle: 'Violation lookup and reference' },
};

export function AppShell() {
  const { profile, session, signOut } = useAuth();
  const { units, calls, refresh } = useData();
  const [view, setView] = useState<View>('dashboard');
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const myUnit = useMemo<Unit | undefined>(
    () => units.find((u) => u.profile_id === session?.user.id),
    [units, session],
  );

  const activeCalls = calls.filter((c) => c.status !== 'closed').length;
  const onlineUnits = units.filter((u) => u.status !== 'offduty').length;

  async function goOnDuty() {
    if (!profile) return;
    setBusy(true);
    await supabase.from('units').insert({
      profile_id: profile.id,
      callsign: profile.callsign || profile.name.split(' ')[0] || 'UNIT',
      officer_name: profile.name,
      unit_type: profile.department === 'EMS' ? 'ems' : 'patrol',
      status: 'available',
    });
    await refresh();
    setBusy(false);
  }

  async function goOffDuty() {
    if (!myUnit) return;
    setBusy(true);
    await supabase.from('units').delete().eq('id', myUnit.id);
    await refresh();
    setBusy(false);
  }

  async function setStatus(status: UnitStatus) {
    if (!myUnit) return;
    setMenuOpen(false);
    await supabase
      .from('units')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', myUnit.id);
    await refresh();
  }

  const navItems: { key: View; label: string; icon: typeof Radio; badge?: number }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      key: 'dispatch',
      label: 'Dispatch',
      icon: Siren,
      badge: activeCalls,
    },
    { key: 'records', label: 'Records', icon: FolderSearch },
    { key: 'bolos', label: 'BOLOs', icon: AlertTriangle },
    { key: 'citations', label: 'Citations', icon: FileText },
    { key: 'incidents', label: 'Incidents', icon: Gavel },
    { key: 'penal', label: 'Penal Code', icon: BookOpen },
  ];

  const meta = VIEW_META[view];

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-64 shrink-0 flex-col border-r border-ink-800 bg-ink-900">
        <div className="flex items-center gap-3 border-b border-ink-800 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-brand-500/40 bg-brand-500/10">
            <Radio className="h-5 w-5 text-brand-400" />
          </div>
          <div>
            <p className="text-sm font-extrabold tracking-tight text-white">
              SENTINEL CAD
            </p>
            <p className="text-[11px] text-slate-500">Dispatch Terminal</p>
          </div>
        </div>

        <nav className="scrollbar-thin flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const activeView = view === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setView(item.key)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  activeView
                    ? 'bg-brand-500/15 text-brand-400'
                    : 'text-slate-400 hover:bg-ink-800 hover:text-white'
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge ? (
                  <span className="rounded-full bg-brand-500/20 px-2 py-0.5 text-xs font-bold text-brand-400">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-ink-800 p-3">
          <div className="flex items-center justify-between rounded-lg bg-ink-850 px-3 py-2 text-xs">
            <span className="text-slate-500">Units online</span>
            <span className="font-mono font-semibold text-emerald-300">
              {onlineUnits}
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-ink-850 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/20 text-xs font-bold text-brand-400">
              {profile?.name?.slice(0, 2).toUpperCase() || '??'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {profile?.name || 'Officer'}
              </p>
              <p className="truncate text-[11px] text-slate-500">
                {profile?.rank} · #{profile?.badge_number || '—'}
              </p>
            </div>
            <button
              onClick={signOut}
              title="Sign out"
              className="rounded-md p-1.5 text-slate-500 transition hover:bg-ink-700 hover:text-red-300"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-ink-800 bg-ink-900/60 px-6 backdrop-blur">
          <div>
            <h1 className="text-lg font-bold text-white">{meta.title}</h1>
            <p className="text-xs text-slate-500">{meta.subtitle}</p>
          </div>

          <div className="relative">
            {myUnit ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    UNIT_STATUS_META[myUnit.status].bg
                  } ${UNIT_STATUS_META[myUnit.status].text}`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${UNIT_STATUS_META[myUnit.status].dot}`}
                  />
                  {myUnit.callsign} · {UNIT_STATUS_META[myUnit.status].label}
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  onClick={goOffDuty}
                  disabled={busy}
                  className="flex items-center gap-1.5 rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:border-red-500/40 hover:text-red-300"
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Power className="h-4 w-4" />
                  )}
                  Off Duty
                </button>

                {menuOpen && (
                  <div className="animate-slide-up absolute right-0 top-12 z-20 w-48 overflow-hidden rounded-lg border border-ink-700 bg-ink-850 shadow-xl">
                    {DUTY_STATUSES.map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatus(s)}
                        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-slate-300 transition hover:bg-ink-700"
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${UNIT_STATUS_META[s].dot}`}
                        />
                        {UNIT_STATUS_META[s].label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={goOnDuty}
                disabled={busy}
                className="flex items-center gap-2 rounded-lg bg-emerald-500/90 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Power className="h-4 w-4" />
                )}
                Go On Duty
              </button>
            )}
          </div>
        </header>

        <main className="scrollbar-thin flex-1 overflow-y-auto bg-ink-950">
          {view === 'dashboard' && <Dashboard />}
          {view === 'dispatch' && <DispatchBoard myUnit={myUnit} />}
          {view === 'records' && <RecordsView />}
          {view === 'bolos' && <BolosView />}
          {view === 'citations' && <CitationsView />}
          {view === 'incidents' && <IncidentsView />}
          {view === 'penal' && <PenalCodeView />}
        </main>
      </div>
    </div>
  );
}
