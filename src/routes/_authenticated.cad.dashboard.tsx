import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  Radio,
  TriangleAlert,
  Users,
  FileText,
  Database,
  TrendingUp,
  Clock,
  Siren,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCad, DEPARTMENTS, statusLabel } from "@/lib/cad";

export const Route = createFileRoute("/_authenticated/cad/dashboard")({
  ssr: false,
  component: DashboardPage,
});

type Call = {
  id: string;
  code: string;
  title: string;
  priority: number;
  status: string;
  created_at: string;
};

type Unit = {
  id: string;
  callsign: string;
  department: string;
  status: string;
};

function StatCard({
  icon: Icon,
  label,
  value,
  to,
  accent,
}: {
  icon: typeof Activity;
  label: string;
  value: string | number;
  to: string;
  accent: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 font-display text-2xl font-bold">{value}</p>
        </div>
        <span
          className={`flex size-10 items-center justify-center rounded-lg ring-1 ${accent} transition-transform group-hover:scale-105`}
        >
          <Icon className="size-5" />
        </span>
      </div>
    </Link>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function priorityClass(priority: number) {
  if (priority === 1) return "bg-destructive/15 text-destructive ring-destructive/30";
  if (priority === 2) return "bg-warning/15 text-warning ring-warning/30";
  return "bg-primary/12 text-primary ring-primary/25";
}

function statusClass(status: string) {
  if (status === "panic") return "bg-destructive/15 text-destructive ring-destructive/30";
  if (status === "available") return "bg-success/15 text-success ring-success/30";
  if (status === "off_duty") return "bg-muted text-muted-foreground ring-border";
  return "bg-warning/15 text-warning ring-warning/30";
}

function DashboardPage() {
  const { active } = useCad();
  const queryClient = useQueryClient();
  const communityId = active?.community_id;

  const { data: calls = [] } = useQuery({
    queryKey: ["calls", communityId],
    enabled: !!communityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calls")
        .select("id, code, title, priority, status, created_at")
        .eq("community_id", communityId!)
        .order("priority", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as Call[];
    },
  });

  const { data: units = [] } = useQuery({
    queryKey: ["units", communityId],
    enabled: !!communityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_members")
        .select("id, callsign, department, status")
        .eq("community_id", communityId!)
        .order("department", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Unit[];
    },
  });

  const { data: bolosCount = 0 } = useQuery({
    queryKey: ["bolos-count", communityId],
    enabled: !!communityId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("bolos")
        .select("*", { count: "exact", head: true })
        .eq("community_id", communityId!)
        .eq("status", "active");
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: citationsCount = 0 } = useQuery({
    queryKey: ["citations-count", communityId],
    enabled: !!communityId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("citations")
        .select("*", { count: "exact", head: true })
        .eq("community_id", communityId!)
        .eq("payment_status", "unpaid");
      if (error) throw error;
      return count ?? 0;
    },
  });

  // Realtime for live dashboard updates
  useEffect(() => {
    if (!communityId) return;
    const channel = supabase
      .channel(`dashboard-${communityId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calls", filter: `community_id=eq.${communityId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["calls", communityId] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_members", filter: `community_id=eq.${communityId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["units", communityId] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bolos", filter: `community_id=eq.${communityId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["bolos-count", communityId] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "citations", filter: `community_id=eq.${communityId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["citations-count", communityId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [communityId, queryClient]);

  if (!active) return null;

  const openCalls = calls.filter((c) => c.status !== "closed");
  const onDuty = units.filter((u) => u.status !== "off_duty");
  const panicUnits = units.filter((u) => u.status === "panic");
  const recentCalls = calls.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Live overview of {active.communities?.name}.
        </p>
      </div>

      {/* Panic alert */}
      {panicUnits.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <Siren className="size-5 animate-pulse text-destructive" />
          <div>
            <p className="font-display text-sm font-bold text-destructive">
              PANIC ALERT — {panicUnits.length} unit{panicUnits.length === 1 ? "" : "s"} in distress
            </p>
            <p className="text-sm text-destructive/80">
              {panicUnits.map((u) => u.callsign).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Radio}
          label="Open Calls"
          value={openCalls.length}
          to="/cad/dispatch"
          accent="bg-primary/12 text-primary ring-primary/25"
        />
        <StatCard
          icon={Users}
          label="Units On Duty"
          value={onDuty.length}
          to="/cad/units"
          accent="bg-success/12 text-success ring-success/25"
        />
        <StatCard
          icon={TriangleAlert}
          label="Active BOLOs"
          value={bolosCount}
          to="/cad/bolos"
          accent="bg-warning/12 text-warning ring-warning/25"
        />
        <StatCard
          icon={FileText}
          label="Unpaid Citations"
          value={citationsCount}
          to="/cad/citations"
          accent="bg-destructive/12 text-destructive ring-destructive/25"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent calls */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Recent Calls</h2>
            <Link
              to="/cad/dispatch"
              className="text-xs text-primary underline-offset-2 hover:underline"
            >
              View all
            </Link>
          </div>
          {recentCalls.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              No calls on the board.
            </p>
          ) : (
            <ul className="space-y-2">
              {recentCalls.map((call) => (
                <li
                  key={call.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                >
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ring-1 ${priorityClass(call.priority)}`}
                  >
                    P{call.priority}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{call.title}</p>
                    <p className="font-mono text-xs text-muted-foreground">{call.code}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs capitalize text-muted-foreground">{call.status}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      {timeAgo(call.created_at)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* On-duty units by department */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">On-Duty Units</h2>
            <Link
              to="/cad/units"
              className="text-xs text-primary underline-offset-2 hover:underline"
            >
              View all
            </Link>
          </div>
          {onDuty.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              No units on duty.
            </p>
          ) : (
            <div className="space-y-3">
              {DEPARTMENTS.map((dept) => {
                const deptUnits = onDuty.filter((u) => u.department === dept.value);
                if (deptUnits.length === 0) return null;
                return (
                  <div key={dept.value} className="space-y-1.5">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {dept.label} — {deptUnits.length}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {deptUnits.map((u) => (
                        <span
                          key={u.id}
                          className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1"
                        >
                          <span className="font-mono text-xs font-semibold">{u.callsign}</span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ${statusClass(u.status)}`}
                          >
                            {statusLabel(u.status)}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
