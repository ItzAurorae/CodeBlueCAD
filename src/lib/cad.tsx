import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type Membership = {
  id: string;
  community_id: string;
  user_id: string;
  department: string;
  callsign: string;
  rank: string;
  role: string;
  status: string;
  communities: { id: string; name: string; code: string; owner_id: string } | null;
};

const STORAGE_KEY = "codeblue.activeCommunity";

type CadValue = {
  memberships: Membership[];
  active: Membership | null;
  setActive: (communityId: string) => void;
  isLoading: boolean;
  refresh: () => void;
};

const CadContext = createContext<CadValue>({
  memberships: [],
  active: null,
  setActive: () => {},
  isLoading: true,
  refresh: () => {},
});

export function CadProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setActiveId(localStorage.getItem(STORAGE_KEY));
  }, []);

  const { data: memberships = [], isLoading } = useQuery({
    queryKey: ["memberships", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_members")
        .select("*, communities(id, name, code, owner_id)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Membership[];
    },
  });

  const active = useMemo(() => {
    if (!memberships.length) return null;
    return memberships.find((m) => m.community_id === activeId) ?? memberships[0] ?? null;
  }, [memberships, activeId]);

  const value: CadValue = {
    memberships,
    active,
    isLoading,
    setActive: (communityId) => {
      localStorage.setItem(STORAGE_KEY, communityId);
      setActiveId(communityId);
    },
    refresh: () => queryClient.invalidateQueries({ queryKey: ["memberships"] }),
  };

  return <CadContext.Provider value={value}>{children}</CadContext.Provider>;
}

export function useCad() {
  return useContext(CadContext);
}

export const DEPARTMENTS = [
  { value: "police", label: "Police" },
  { value: "sheriff", label: "Sheriff" },
  { value: "ems", label: "EMS" },
  { value: "fire", label: "Fire" },
  { value: "dispatch", label: "Dispatch" },
];

export const UNIT_STATUSES = [
  { value: "available", label: "Available" },
  { value: "busy", label: "Busy" },
  { value: "en_route", label: "En Route" },
  { value: "on_scene", label: "On Scene" },
  { value: "off_duty", label: "Off Duty" },
  { value: "panic", label: "Panic" },
];

export function statusLabel(value: string) {
  return UNIT_STATUSES.find((s) => s.value === value)?.label ?? value;
}
