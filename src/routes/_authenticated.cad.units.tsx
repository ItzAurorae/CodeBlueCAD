import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCad, DEPARTMENTS, UNIT_STATUSES, statusLabel } from "@/lib/cad";

export const Route = createFileRoute("/_authenticated/cad/units")({
  ssr: false,
  component: UnitsPage,
});

type Unit = {
  id: string;
  user_id: string;
  callsign: string;
  department: string;
  rank: string;
  role: string;
  status: string;
};

function statusClass(status: string) {
  if (status === "panic") return "bg-destructive/15 text-destructive ring-destructive/30";
  if (status === "available") return "bg-success/15 text-success ring-success/30";
  if (status === "off_duty") return "bg-muted text-muted-foreground ring-border";
  return "bg-warning/15 text-warning ring-warning/30";
}

function UnitsPage() {
  const { active } = useCad();
  const queryClient = useQueryClient();
  const communityId = active?.community_id;

  const { data: units = [], isLoading } = useQuery({
    queryKey: ["units", communityId],
    enabled: !!communityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_members")
        .select("id, user_id, callsign, department, rank, role, status")
        .eq("community_id", communityId!)
        .order("department", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Unit[];
    },
  });

  useEffect(() => {
    if (!communityId) return;
    const channel = supabase
      .channel(`units-${communityId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_members" },
        () => queryClient.invalidateQueries({ queryKey: ["units", communityId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [communityId, queryClient]);

  if (!active) return null;

  const onDuty = units.filter((u) => u.status !== "off_duty").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Unit status</h1>
        <p className="text-sm text-muted-foreground">
          {onDuty} of {units.length} units on duty in {active.communities?.name}.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {DEPARTMENTS.map((dept) => {
            const rows = units.filter((u) => u.department === dept.value);
            if (rows.length === 0) return null;
            return (
              <section key={dept.value} className="space-y-3">
                <h2 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {dept.label} — {rows.length}
                </h2>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {rows.map((u) => (
                    <li
                      key={u.id}
                      className="rounded-lg border border-border bg-card p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm font-semibold">{u.callsign}</span>
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ring-1 ${statusClass(u.status)}`}
                        >
                          {statusLabel(u.status)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {u.rank} · {u.role === "admin" || u.role === "owner" ? u.role : "member"}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          {units.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border py-14 text-center text-sm text-muted-foreground">
              No units in this community yet.
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Statuses available: {UNIT_STATUSES.map((s) => s.label).join(", ")}. Change your own
            status from the sidebar.
          </p>
        </div>
      )}
    </div>
  );
}
