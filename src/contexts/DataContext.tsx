import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';
import type { Call, CallAssignment, Unit } from '@/lib/types';

interface DataContextValue {
  calls: Call[];
  units: Unit[];
  assignments: CallAssignment[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [calls, setCalls] = useState<Call[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [assignments, setAssignments] = useState<CallAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const active = useRef(true);

  const refresh = useCallback(async () => {
    const [callsRes, unitsRes, assignRes] = await Promise.all([
      supabase.from('calls').select('*').order('created_at', { ascending: false }),
      supabase.from('units').select('*').order('callsign', { ascending: true }),
      supabase.from('call_assignments').select('*'),
    ]);

    if (!active.current) return;

    const firstError =
      callsRes.error || unitsRes.error || assignRes.error;
    if (firstError) {
      setError(firstError.message);
      return;
    }
    setError(null);
    setCalls(callsRes.data ?? []);
    setUnits(unitsRes.data ?? []);
    setAssignments(assignRes.data ?? []);
  }, []);

  useEffect(() => {
    active.current = true;
    refresh().finally(() => {
      if (active.current) setLoading(false);
    });
    const interval = setInterval(refresh, 5000);
    return () => {
      active.current = false;
      clearInterval(interval);
    };
  }, [refresh]);

  return (
    <DataContext.Provider
      value={{ calls, units, assignments, loading, error, refresh }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
