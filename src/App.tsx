import { Loader2, Radio, AlertTriangle } from 'lucide-react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { DataProvider } from '@/contexts/DataContext';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { AppShell } from '@/components/layout/AppShell';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Analytics } from "@vercel/analytics/next"

function SupabaseMissingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 p-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/10">
          <AlertTriangle className="h-7 w-7 text-amber-400" />
        </div>
        <h1 className="text-xl font-bold text-white">Configuration Required</h1>
        <p className="mt-2 text-sm text-slate-400">
          This app needs a Supabase project to function. The connection details
          (URL and API key) are missing from the environment.
        </p>
        <p className="mt-4 rounded-lg border border-ink-700 bg-ink-900 px-4 py-3 text-left text-xs text-slate-500">
          <span className="font-semibold text-slate-300">To fix this:</span>
          <br />
          Set <code className="text-brand-400">VITE_SUPABASE_URL</code> and{' '}
          <code className="text-brand-400">VITE_SUPABASE_ANON_KEY</code> in your
          environment variables, then rebuild.
        </p>
      </div>
    </div>
  );
}

function Gate() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-ink-950">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!session) return <AuthScreen />;

  return (
    <DataProvider>
      <AppShell />
    </DataProvider>
  );
}

export default function App() {
  if (!isSupabaseConfigured) {
    return <SupabaseMissingScreen />;
  }

  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
