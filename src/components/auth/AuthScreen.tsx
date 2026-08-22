import { useState } from 'react';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Input, Label, Select } from '@/components/ui/Form';
import logo from '/CodeBlueCAD.png';

const DEPARTMENTS = ['Police', 'Sheriff', 'State Patrol', 'EMS', 'Fire'];
const RANKS = [
  'Dispatcher',
  'Cadet',
  'Officer',
  'Corporal',
  'Sergeant',
  'Lieutenant',
  'Captain',
  'Chief',
];

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [badge, setBadge] = useState('');
  const [callsign, setCallsign] = useState('');
  const [rank, setRank] = useState('Officer');
  const [department, setDepartment] = useState('Police');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
      } else {
        if (!name.trim()) throw new Error('Full name is required');
        await signUp(email.trim(), password, {
          name: name.trim(),
          badgeNumber: badge.trim(),
          rank,
          department,
          callsign: callsign.trim(),
        });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong';
      setError(
        message.includes('already registered')
          ? 'That email is already registered. Try signing in.'
          : message.includes('Invalid login')
            ? 'Incorrect email or password.'
            : message,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_-10%,rgba(14,165,233,0.15),transparent_45%),radial-gradient(circle_at_90%_110%,rgba(14,165,233,0.1),transparent_40%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:44px_44px]" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <img
            src={logo}
            alt="CodeBlueCAD"
            className="mx-auto mb-4 h-16 w-16 rounded-2xl object-cover shadow-lg shadow-brand-500/10"
          />
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            CodeBlueCAD
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Computer-Aided Dispatch Terminal
          </p>
        </div>

        <div className="rounded-2xl border border-ink-700 bg-ink-850/80 p-6 shadow-2xl backdrop-blur">
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-ink-900 p-1">
            {(['signin', 'signup'] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={`rounded-md py-2 text-sm font-semibold transition ${
                  mode === m
                    ? 'bg-brand-500 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {m === 'signin' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <Label>Full Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Carter"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Badge #</Label>
                    <Input
                      value={badge}
                      onChange={(e) => setBadge(e.target.value)}
                      placeholder="4417"
                    />
                  </div>
                  <div>
                    <Label>Callsign</Label>
                    <Input
                      value={callsign}
                      onChange={(e) => setCallsign(e.target.value)}
                      placeholder="1-ADAM-12"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Department</Label>
                    <Select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    >
                      {DEPARTMENTS.map((d) => (
                        <option key={d}>{d}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>Rank</Label>
                    <Select
                      value={rank}
                      onChange={(e) => setRank(e.target.value)}
                    >
                      {RANKS.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </Select>
                  </div>
                </div>
              </>
            )}

            <div>
              <Label>Email</Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@dept.gov"
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full !py-2.5"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'signin' ? 'Access Terminal' : 'Create Account'}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Authorized personnel only. All activity is logged.
        </p>
      </div>
    </div>
  );
}
